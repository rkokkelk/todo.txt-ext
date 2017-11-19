/* Todo.txt add-on for Thunderbird email application.
 * Copyright (C) 2017 Roy Kokkelkoren
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

const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import('resource://gre/modules/Services.jsm');
Cu.import("resource://todotxt/logger.jsm");

window.addEventListener("load", function(e) { 
  let ID = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
  var calManager = Components.classes["@mozilla.org/calendar/manager;1"].
        getService(Components.interfaces.calICalendarManager);
  let found = false;

  // Add observers to trigger when add-on is uninstalled
  AddonManager.addAddonListener({
    onUninstalling: function(addon) {
      if (addon.id == "todo.txt@xseth.nl")
        todoOverlay.removeCal(calManager);
        todotxtLogger.debug("overlay.js","Uninstalling");
    },
  });

  let calendars = calManager.getCalendars({});
  for (let i=0; i < calendars.length; i++){
    calendar = calendars[i];
    if(calendar.providerID == ID){
      todotxtLogger.debug("overlay.js","Calendar found");
      found = true;
      break;
    }
  }

  if(!found)
    todoOverlay.createCal(calManager);

  // if todo.txt & done.txt loc is not set, show properties
  let prefs = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefService);
  prefs = prefs.getBranch("extensions.todotxt.");

  if(!prefs.prefHasUserValue('todo-txt') || !prefs.prefHasUserValue('done-txt')){
    Services.wm.getMostRecentWindow('navigator:browser')
      .BrowserOpenAddonsMgr('addons://detail/todotxt/preferences');
  }
}, false);

var todoOverlay = {

  createCal: function(calManager){
    todotxtLogger.debug("overlay.js","Create calendar");
    let url = this.makeCalendarURI();
    let newCal = calManager.createCalendar('todotxt',url);
    newCal.name = "Todo.txt";
    calManager.registerCalendar(newCal);
  },

  removeCal: function(calManager){
    let ID = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
    let calendars = calManager.getCalendars({});
    for (let i=0; i < calendars.length; i++){
      calendar = calendars[i];
      if(calendar.providerID == ID){
        calManager.removeCalendar(calendar);
        todotxtLogger.debug("overlay.js","Calendar found and removed");
        break;
      }
    }
  },

  makeCalendarURI: function(aURL, aOriginCharset, aBaseURI) {
      let ioService = Components.classes["@mozilla.org/network/io-service;1"]
                          .getService(Components.interfaces.nsIIOService);
      return ioService.newURI('todotxt://_unused', null, null);
  }
}
