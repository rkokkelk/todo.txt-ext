Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://calendar/modules/calUtils.jsm");


EXPORTED_SYMBOLS = ['todotxtLogger'];

let todotxtLogger = {
  
  mDebugMode: false,
  app: null,
  
  get App(){
  	if(!this.app){
  		this.app = Components.classes["@mozilla.org/steel/application;1"]
  													.getService(Components.interfaces.steelIApplication);
  	}
  	return this.app;
  },

  get debugMode() {
    return this.mDebugMode;
  },
  set debugMode(aValue) {
    this.mDebugMode = aValue;
  },
  
  debug: function(src, msg) {
    if (this.debugMode) {
      let output = '';
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
    if (this.debugMode) {
      let output = '';
      if (src) {
        output += '[' + src + ']';
      }
      if (error){
      	output += e.result+' ('+e.message+')';
      }
      cal.LOG(output);
      app = this.App;
      app.console.log(output);
    }
  }
};

      
    
