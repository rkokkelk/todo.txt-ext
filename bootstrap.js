Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function install(aData,aReason){

}

function uninstall(){

}

function startup(aData,aReason){
  Components.utils.import("chrome://todotxt/content/logger.jsm");
  Components.utils.import("chrome://todotxt/content/calTodotxt.js");

  var compman = Components.manager;
  let comreg = compman.QueryInterface(Components.interfaces.nsIComponentRegistrar);

  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt");

  calTodo =  calTodoTxt.prototype;

  let factory =   {
    createInstance: function(outer, iid)
    {
      todotxtLogger.debug("iid: "+iid);
      if (outer)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return calTodo.QueryInterface(iid);
    },
    QueryInterface: calTodo.QueryInterface
  };

  todotxtLogger.debug("Factory: "+factory);
  
  if(!(comreg.isCIDRegistered(calTodo.classID) && comreg.isContractIDRegistered(calTodo.contractID))){
    comreg.registerFactory(calTodo.classID, 'calTodoTxt', calTodo.contractID, factory);
    todotxtLogger.debug('Registrate factory '+calTodo.contractID);
  }else
    todotxtLogger.debug('CID & contractID already registrated');

  //comreg.unregisterFactory(calTodo.classID, factory);

  if(!comreg.isContractIDRegistered('@mozilla.org/calendar/calendar;1?type=todotxt'))
	  throw Components.Exception("Todo.txt calendar not registrated", Components.results.NS_ERROR_UNEXPECTED);
  else
    todotxtLogger.debug('ContractID registred');

	let found = false;
	var calManager = cal.getCalendarManager();
	var id = "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	
	if (!Components.classes[calTodo.contractID])
		  throw Components.Exception("Todo.txt classes not found", Components.results.NS_ERROR_UNEXPECTED);
  else
    todotxtLogger.debug("Classes found.");

  todotxtLogger.debug(calTodo.contractID+" => "+comreg.contractIDToCID(calTodo.contractID));
  //todotxtLogger.debug(calTodo.classID+" => "+comreg.CIDToContractID(calTodo.classID));

  let tmp = Components.classes[calTodo.contractID].createInstance();
  if(!tmp)
		  throw Components.Exception("Todo.txt create instance failed", Components.results.NS_ERROR_UNEXPECTED);

	for each (calendar in calManager.getCalendars({})){
		if(calendar.providerID == calTodo.classID){
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

function shutdown(){
  Components.utils.import("chrome://todotxt/content/logger.jsm");
  Components.utils.import("chrome://todotxt/content/calTodotxt.js");

  var compman = Components.manager;
  let comreg = compman.QueryInterface(Components.interfaces.nsIComponentRegistrar);

  todotxtLogger.debugMode = true;
  todotxtLogger.debug("unregister");

  calTodo =  calTodoTxt.prototype;
  var factory = XPCOMUtils.generateNSGetFactory([calTodoTxt]);
  comreg.unregisterFactory(calTodo.classID, factory);
}
