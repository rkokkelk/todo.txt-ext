if (!todotxt) var todotxt = {};
if (!todotxt.ns) todotxt.ns = {};

var { todotxtLogger } = ChromeUtils.import("resource://todotxt/logger.jsm");
var { util } = ChromeUtils.import("resource://todotxt/util.jsm");

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

        if(id.indexOf('todo-path') !== -1)
          prefs.setCharPref('todo-txt', storagePath);
        else
          prefs.setCharPref('done-txt', storagePath);
      });
    },

    selectBool: function(id) {
      let prefs = util.getPreferences();
      let checkbox = document.getElementById(id);
      todotxtLogger.debug('preferences.js', 'Set pref for '+id+' to '+checkbox.checked);

      prefs.setBoolPref(id, checkbox.checked);
    }
  };

  return pub;
}();

Preferences.addAll([
  { id: "extensions.todotxt.todo-txt", type: "string" },
  { id: "extensions.todotxt.done-txt", type: "string" },
  { id: "extensions.todotxt.thunderbird", type: "bool" },
  { id: "extensions.todotxt.creation", type: "bool" },
  { id: "extensions.todotxt.showFullTitle", type: "bool" },
]);
