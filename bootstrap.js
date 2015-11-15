Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://todotxt/modules/logger.jsm");
Components.utils.import("resource://todotxt/components/calTodotxt.js");

function install(aData,aReason){

}

function uninstall(){}

function startup(aData,aReason){
  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt");
	//let resource = Services.io.getProtocolHandler("resource")
	 // .QueryInterface(Components.interfaces.nsIResProtocolHandler);
  //jlet alias = Services.io.newFileURI(aData.installPath);
  //if (!aData.installPath.isDirectory())
   // alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
  resource.setSubstitution("todotxt", alias);

  var factory = Factory({
      contract: '@mozilla.org/calendar/calendar;1?type=todotxt',
      Component: calTodoTxt
  });


  tmp_str = aData.installPath.path+"/components/calTodotxt.manifest";
  todotxtLogger.debug("path: "+tmp_str);
  //let cal_manifest_path = Services.io.newURI(tmp_str,null,null);
  //todotxtLogger.debug("path: "+cal_manifest_path);
  let cal_manifest = new FileUtils.File(tmp_str);
  //var compman=Components.manager;
  //compman.QueryInterface(Components.interfaces.nsIComponentRegistrar);
  //compman.autoRegister(cal_manifest);
  //Components.manager.addBootstrappedManifestLocation(cal_manifest);

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
