const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://calendar/modules/calUtils.jsm");

EXPORTED_SYMBOLS = ['todotxtLogger'];

let todotxtLogger = {
  
  app: null,
  notif: {},
  
  get App(){
    if(!this.app){
      this.app = Cc["@mozilla.org/steel/application;1"]
                   .getService(Ci.steelIApplication);
    }
    return this.app;
  },

  get debugMode() {
    mDebugMode = true;
    return mDebugMode;
  },
  set debugMode(aValue) {
    this.mDebugMode = aValue;
  },

  getEpoch: function(){
    return new Date().getTime();
  },

  getDateTime: function(){
    return new Date().toLocaleString();
  },

  appLog: function(msg){
    app = this.App;
    app.console.log(msg);
  },
  
  debug: function(src, msg) {
    app = this.App;
    if (this.debugMode) {
      let output = '('+this.getDateTime()+') ';
      if (src) {
        output += '[' + src + ']';
      }
      if (msg) {
        if (output.length > 0) {
          output += ' ';
        }
        output += msg;
      }
      cal.LOG(output);
      this.appLog(output);
    }
  },

  error: function(src, error) {
    this.showNotification(error.message);
    if (this.debugMode) {
      let output = '('+this.getDateTime()+') ';
      if (src) {
        output += '[' + src + ']';
      }
      output += ' ERROR: ';

      if (error)
        output += error.message;
      
      cal.LOG(output);
      this.appLog(output);
    }
  },

  resetNotifications: function(){
    // reset notification counter when settings changed
    // so that new errors are displayed immediatly
    this.notif = {};
  },

  showNotification: function(message){
    // Time between messages is 30 seconds
    let seconds = 30*1000;

    // prevent notifications pop-up overload
    // time delay is 30,60,120,240,etc seconds
    if(this.notif[message] == null){

      this.notif[message] = {};
      this.notif[message]['count'] = 0;
      this.notif[message]['time'] = this.getEpoch() + seconds;
    }else{
      if(this.getEpoch() < this.notif[message]['time']){
        return;
      }else{
        let count = this.notif[message]['count'] + 1;
        let time = this.getEpoch() + (seconds * Math.pow(2,count));

        this.notif[message]['count'] = count;
        this.notif[message]['time'] = time;
      }
    }

    let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Ci.nsIPromptService);
    prompts.alert(null,'Warning Todo.txt',message);
  },
};
