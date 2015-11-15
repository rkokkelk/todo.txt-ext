Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://todotxt/modules/logger.jsm");
Components.utils.import("resource://todotxt/components/calTodotxt.js");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function install(aData,aReason){

}

function uninstall(){}

function startup(aData,aReason){

	let resource = Services.io.getProtocolHandler("resource")
         .QueryInterface(Components.interfaces.nsIResProtocolHandler);

  let alias = Services.io.newFileURI(aData.installPath);
  if (!aData.installPath.isDirectory())
    alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
  resource.setSubstitution("todotxt", alias);

  var compman=Components.manager;
  let comreg = compman.QueryInterface(Components.interfaces.nsIComponentRegistrar);

  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt");

  calTodo =  calTodoTxt.prototype;
  var factory = XPCOMUtils.generateNSGetFactory([calTodoTxt]);

  if(!comreg.isContractIDRegistered('@mozilla.org/calendar/calendar;1?type=todotxt'))
    comreg.registerFactory(calTodo.classID, 'calTodoTxt', calTodo.contractID, factory);

  if(!comreg.isContractIDRegistered('@mozilla.org/calendar/calendar;1?type=todotxt'))
	  throw Components.Exception("Todo.txt calendar not registrated", Components.results.NS_ERROR_UNEXPECTED);

	let found = false;
	var calManager = cal.getCalendarManager();
	var id = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	
	if (!Components.classes[calTodo.contractID])
		  throw Components.Exception("Todo.txt classes not found", Components.results.NS_ERROR_UNEXPECTED);

	let tmp = Components.classes[calTodo.contractID].createInstance(Components.interfaces.calICalendar);
  if(!tmp)
		  throw Components.Exception("Todo.txt create instance failed", Components.results.NS_ERROR_UNEXPECTED);
    

	for each (calendar in calManager.getCalendars({})){
		if(calendar.providerID == id){
			found = true;
			break;
		}
	}

	if(!found){
		let url = cal.makeURL('todotxt://_unused');
		let newCal = calManager.createCalendar('todotxt',url);
    todotxtLogger.debug("Calendar: "+newCal);
		if(!newCal)
		  throw Components.Exception("Could not create Todo.txt Calendar", Components.results.NS_ERROR_UNEXPECTED);
    
		newCal.name = "Todo.txt";
		calManager.registerCalendar(newCal);
	}
}

function shutdown(){}
