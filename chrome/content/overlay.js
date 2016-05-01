Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://todotxt/logger.jsm");

window.addEventListener("load", function(e) { 
	let ID = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	var calManager = cal.getCalendarManager();
	let found = false;

  // Add observers to trigger when add-on is uninstalled
  AddonManager.addAddonListener({
    onUninstalling: function(addon) {
      if (addon.id == "todo.txt@xseth.nl")
        removeCal(calManager);
        todotxtLogger.debug("overlay.js","Uninstalling");
    },
  });

	for each (calendar in calManager.getCalendars({})){
		if(calendar.providerID == ID){
			todotxtLogger.debug("overlay.js","Calendar found");
			found = true;
			break;
		}
	}

	if(!found){
		createCal(calManager);
	}
}, false);

function createCal(calManager){
	todotxtLogger.debug("overlay.js","Create calendar");
	let url = cal.makeURL('todotxt://_unused');
	let newCal = calManager.createCalendar('todotxt',url);
	newCal.name = "Todo.txt";
	calManager.registerCalendar(newCal);
}

function removeCal(calManager){
	let ID = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	for each (calendar in calManager.getCalendars({})){
		if(calendar.providerID == ID){
	    calManager.removeCalendar(calendar);
			todotxtLogger.debug("overlay.js","Calendar found and removed");
			break;
		}
  }
}
