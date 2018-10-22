/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/Timer.jsm");

Components.utils.import("resource://todotxt/util.jsm");
Components.utils.import("resource://todotxt/logger.jsm");
Components.utils.import("resource://todotxt/fileUtil.jsm");
Components.utils.import("resource://todotxt/todoclient.jsm");

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
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);
    this.branch = prefs.getBranch("extensions.todotxt.");

    if (!("addObserver" in this.branch))
        this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

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
