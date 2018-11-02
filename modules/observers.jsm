/* Todo.txt add-on for Thunderbird email application.
 * Copyright (C) 2017 Roy Kokkelkoren
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA. */

const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

Cu.import("resource://todotxt/util.jsm");
Cu.import("resource://todotxt/logger.jsm");
Cu.import("resource://todotxt/fileUtil.jsm");
Cu.import("resource://todotxt/todoclient.jsm");

this.EXPORTED_SYMBOLS = ['observers','prefObserver'];

/*
 * Observer for notices of timers for synchronization process
 */
var fileEvent = {

  calendar: null,
  checkSum: null,

  // Verify if todo & done file changed by
  // comparing MD5 checksum, if different refresh calendar
  observe: function(aSubject, aTopic, aData) {
    todotxtLogger.debug('fileEvent', 'Starting observation');

    try{
      fileUtil.calculateMD5().then((checkSum) => {
        let old_checksum = this.checkSum;
        this.checkSum = checkSum;

        // Verify if not first run, old_checksum != undef
        if(old_checksum){
          if(old_checksum != this.checkSum){
            todotxtLogger.debug('fileEvent','refresh');
            this.calendar.refresh();
          }
        }
      }, (error) => {
        todotxtLogger.error('fileEvent:observe', error);
      });
    } catch(e){
      todotxtLogger.error('fileEvent:observe', e);
    }
  },

  notify: function(timer){
    todotxtLogger.debug('fileEvent','notify');
    fileUtil.calculateMD5().then((checkSum) => {
      this.checkSum = checkSum;
    }, (error) => {
      todotxtLogger.error('fileEvent:observe', error);
    });
  },

  updateMD5: function(){
    let timer = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(this, 1*1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  },
};

/* 
 * Observer for changing properties
 */
var prefObserver = {
  
  calendar: null,

  register: function(cal) {
    this.calendar = cal;

    // For this.branch we ask for the preferences for extensions.myextension. and children
    var prefs = Cc["@mozilla.org/preferences-service;1"]
                      .getService(Ci.nsIPrefService);
    this.branch = prefs.getBranch("extensions.todotxt.");

    if (!("addObserver" in this.branch))
        this.branch.QueryInterface(Ci.nsIPrefBranch2);

    // Finally add the observer.
    this.branch.addObserver("", this, false);
  },

  unregister: function() {
    this.calendar = null;
    this.branch.removeObserver("", this);
    todotxtLogger.debug('prefObserver:unregister');
  },

  observe: function(aSubject, aTopic, aData) {
    todotxtLogger.debug('prefObserver:observe', 'Changed: '+aData);
    switch (aData) {
      case "creation":
      case "thunderbird":
      case "showFullTitle":
        this.calendar.refresh();
        break;
      case "done-txt":
      case "todo-txt":
        todoClient.setTodo();
        this.calendar.refresh();
        break;
    }
    
    // Reset notifications so that new errors
    // can be displayed
    todotxtLogger.resetNotifications();
  }
};

var observers = {

  fileEvent: null,
  fileObserver: null,

  registerFileObserver: function(cal) {

    fileEvent.calendar = cal;
    this.fileEvent = fileEvent;

    this.fileObserver = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    this.fileObserver.init(fileEvent, 15*1000, Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP);
  },
};
