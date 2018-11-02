/* Todo.txt add-on for Thunderbird email application.
 * Copyright (C) 2018 Roy Kokkelkoren
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

        if(id.indexOf('todo-path') !== -1)
          prefs.setCharPref('todo-txt', storagePath);
        else
          prefs.setCharPref('done-txt', storagePath);
      });
    }
  };

  return pub;
}();
