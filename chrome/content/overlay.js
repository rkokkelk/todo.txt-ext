Components.utils.import("resource://calendar/modules/calUtils.jsm");

window.addEventListener("load", function(e) { 
	let calManager = cal.getCalendarManager();
	let url = cal.makeURL('todotxt://_unused');
	let newCal = calManager.createCalendar('todotxt',url);

	var prefs = Components.classes["@mozilla.org/preferences-service;1"]
	                    .getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.todotxt.");
	newCal.name = "Todo.txt";
	calManager.registerCalendar(newCal);
}, false);

function startup() {
	// May be usefull later
	// Components.utils.import('resource://gre/modules/Services.jsm');
	//Services.wm.getMostRecentWindow('navigator:browser').BrowserOpenAddonsMgr('addons://detail/YOUR_ADDON_ID_HERE/preferences');
}
