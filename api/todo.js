/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Portions Copyright (C) Philipp Kewisch, 2020 */

const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

const { ExtensionAPI } = ExtensionCommon;

this.todo = class extends ExtensionAPI {
  onStartup() {
    Services.io
      .getProtocolHandler("resource")
      .QueryInterface(Ci.nsIResProtocolHandler)
      .setSubstitution("todotxt", this.extension.rootURI);

    let aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(
      Ci.amIAddonManagerStartup
    );

    let { calGoogleCalendar } = ChromeUtils.import(
      "resource://todotxt/components/calTodotxt.js"
    );
    if (cal.getCalendarManager().wrappedJSObject.hasCalendarProvider("todotxt"))
      console.log('Calendar provider already present!');
    else {
      console.log('Calendar provider created!');
      cal.getCalendarManager().wrappedJSObject.registerCalendarProvider("todotxt", calGoogleCalendar);
    }
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return;
    }

    cal.getCalendarManager().wrappedJSObject.unregisterCalendarProvider("todotxt", true);

  }

  getAPI(context) {
    return {
      todo: {
        verifyTodoCalendar() {
          var calManager = cal.getCalendarManager().wrappedJSObject
          let found = false;

          let calendars = calManager.getCalendars({});
          for (let i=0; i < calendars.length; i++){
            calendar = calendars[i];
            if(calendar.providerID == ID){
              todotxtLogger.debug("overlay.js","Calendar found");
              found = true;
              break;
            }
          }

          if(!found){
            todotxtLogger.debug("overlay.js","Create calendar");
            let url = this.makeCalendarURI();
            let newCal = calManager.createCalendar('todotxt',url);
            newCal.name = "Todo.txt";
            calManager.registerCalendar(newCal);
          }
        },
      },
    };
  }
};
