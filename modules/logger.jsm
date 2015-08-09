Components.utils.import("resource://calendar/modules/calUtils.jsm");


EXPORTED_SYMBOLS = ['stormcowsLogger'];

let stormcowsLogger = {
  
  mDebugMode: false,
  
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
    }
  }
};

      
    
