Components.utils.import("resource://calendar/modules/calUtils.jsm");

EXPORTED_SYMBOLS = ['todotxtLogger'];

let todotxtLogger = {
  
  app: null,
  notif: {},
  
  get App(){
    if(!this.app){
      this.app = Components.classes["@mozilla.org/steel/application;1"]
                   .getService(Components.interfaces.steelIApplication);
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
      app = this.App;
      app.console.log(output);
    }
  },

  error: function(src, error) {
    this.showNotification(error.message);
    if (this.debugMode) {
      let output = '('+this.getDateTime()+') ';
      if (src) {
        output += '[' + src + ']';
      }
      if (error){
        output += ' ERROR: ';
        output += error.message;
      }
      cal.LOG(output);
      app = this.App;
      app.console.log(output);
    }
  },

  resetNotifications: function(){
    // reset notification counter when settings changed
    // so that new errors are displayed immediatly
    this.notif = {};
  },

  showNotification: function(message){
    let seconds = 30*1000;

    // prevent notifications pop-up overload
    // time delay is 20,40,80,160,etc seconds
    if(this.notif[message] == null){
      this.notif[message] = {};
      this.notif[message]['count'] = 0;
      this.notif[message]['time'] = this.getEpoch() + seconds;
    }else{
      if(this.getEpoch() < this.notif[message]['time'])
        return;
      else{
        let count = this.notif[message]['count'] + 1;
        let time = this.getEpoch() + (seconds * Math.pow(2,count));
        this.notif[message]['count'] = count;
        this.notif[message]['time'] = time;
      }
    }

    let prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
    prompts.alert(null,'Warning',message);
  },
};
