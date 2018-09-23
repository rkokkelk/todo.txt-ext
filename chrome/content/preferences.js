if (!todotxt) var todotxt = {};
if (!todotxt.ns) todotxt.ns = {};

Components.utils.import("resource://gre/modules/Services.jsm");
const nsIFilePicker = Components.interfaces.nsIFilePicker;

todotxt.ns.Preferences = function() {
  //let _stringBundle = Services.strings.createBundle("chrome://xnote/locale/xnote-overlay.properties");

  var pub = {
    selectStoragePath : function(id) {
      let fp = Components.classes["@mozilla.org/filepicker;1"]
                     .createInstance(nsIFilePicker);
      fp.init(window, "Select", fp.modeOpen);
      fp.appendFilters(nsIFilePicker.filterText | nsIFilePicker.filterAll);
      fp.open(rv => {
        if (rv != fp.returnOK) {
          return;
        };

        var storagePath =  fp.file.path;
        let prefPath = document.getElementById(id);
        prefPath.value = storagePath;
      });
    }
  };

  return pub;
}();
