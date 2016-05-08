Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

function install(aData,aReason){

}

function uninstall(){}

function startup(aData,aReason){
  Components.utils.import("chrome://todotxt/content/logger.jsm");
  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt");

	var calManager = cal.getCalendarManager();
	var id = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	let found = false;

	for each (calendar in calManager.getCalendars({})){
		if(calendar.providerID == id){
			found = true;
			break;
		}
	}

	if(!found){
		let url = cal.makeURL('todotxt://_unused');
		let newCal = calManager.createCalendar('todotxt',url);
		if(!newCal)
		  throw Components.Exception("Could not create Todo.txt Calendar", Components.results.NS_ERROR_UNEXPECTED);
    
		newCal.name = "Todo.txt";
		calManager.registerCalendar(newCal);
	}
}

function shutdown(){}
