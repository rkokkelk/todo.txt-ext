/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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

EXPORTED_SYMBOLS = ['timerObserver','prefObserver'];

/*
 * Observer for notices of timers for synchronization process
 */
var timerObserver = {

  calendar: null,
  checkSum: null,

  register: function(cal) {
    this.calendar = cal;
    todotxtLogger.debug('timerObserver','register');
  },

  unregister: function() {
    this.calendar = null;
    if(this.timer) timer.cancel();

    todotxtLogger.debug('timerObserver','unregister');
  },

  // Verify if todo & done file changed by
  // comparing MD5 checksum, if different refresh calendar
  observe: function(aSubject, aTopic, aData) {
    try{
      let old_checksum = this.checkSum;
      this.checkSum = this.calculateMD5();

      // Verify if not first run, old_checksum != undef
      if(old_checksum){
        if(old_checksum != this.checkSum){
          todotxtLogger.debug('timerObserver','refresh');
          this.calendar.refresh();
        }
      }
    } catch(e){
      todotxtLogger.error('timerObserver:observe',e);
    }
  },

  notify: function(timer){
    todotxtLogger.debug('timerObserver','notify');
    this.checkSum = this.calculateMD5();
  },

  calculateMD5: function(){
    let prefs = util.getPreferences();

    // this tells updateFromStream to read the entire file
    const PR_UINT32_MAX = 0xffffffff;

    // Use MD5, hash for comparison and needs to be fast not secure
    let ch = Cc["@mozilla.org/security/hash;1"]
                         .createInstance(Ci.nsICryptoHash);
    ch.init(ch.MD5);

    todoFile = prefs.getComplexValue("todo-txt", Ci.nsIFile);
    doneFile = prefs.getComplexValue("done-txt", Ci.nsIFile);

    // open files for reading
    todoIstream = fileUtil.getInputStream(todoFile);
    doneIstream = fileUtil.getInputStream(doneFile);

    // Make sure that Istream is not empty
    if(todoIstream.available() > 0)
      ch.updateFromStream(todoIstream, PR_UINT32_MAX);
    if(doneIstream.available() > 0)
      ch.updateFromStream(doneIstream, PR_UINT32_MAX);

    let result =  ch.finish(true);
    todotxtLogger.debug('timerObserver:calculateMD5','hash ['+result+']');
    return result
  }
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
    todotxtLogger.resetNotifcations();
  }
};
