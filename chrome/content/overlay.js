Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://todotxt/exception.jsm');
Components.utils.import("resource://todotxt/logger.jsm");

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
  let prefs = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService);
  prefs = prefs.getBranch("extensions.todotxt.");

  if(!prefs.prefHasUserValue('todo-txt') || !prefs.prefHasUserValue('done-txt')){
      throw exception.FILES_NOT_SPECIFIED();

    //TODO: fix automatic display of preferences if loaded first time
    //Services.wm.getMostRecentWindow('navigator:browser')
    //  .BrowserOpenAddonsMgr('addons://detail/todotxt/preferences');
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
