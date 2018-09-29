if (!todotxt) var todotxt = {};
if (!todotxt.ns) todotxt.ns = {};

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('resource://todotxt/util.jsm');

const nsIFilePicker = Components.interfaces.nsIFilePicker;

todotxt.ns.Preferences = function() {

  var pub = {
    selectStoragePath : function(id) {
      let prefs = util.getPreferences();
      let fp = Components.classes["@mozilla.org/filepicker;1"]
                     .createInstance(nsIFilePicker);
      fp.init(window, "", fp.modeOpen);
      fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterAll);
      fp.open(rv => {
        if (rv != fp.returnOK) {
          return;
        };

        var storagePath =  fp.file.path;
        let prefPath = document.getElementById(id);
        prefPath.value = storagePath;

        if(id.indexOf('todo') !== -1)
          prefs.setCharPref('todo-txt', storagePath);
        else
          prefs.setCharPref('done-txt', storagePath);
      });
    }
  };

  return pub;
}();
