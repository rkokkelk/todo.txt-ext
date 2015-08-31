/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://calendar/modules/calProviderUtils.jsm");

Components.utils.import("resource://todotxt/logger.jsm");
Components.utils.import("resource://todotxt/todoclient.js");
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");

function calTodoTxt() {
  this.initProviderBase();
  
  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt", "Constructor");

  myPrefObserver.register(this);
}

calTodoTxt.prototype = {
  __proto__: cal.ProviderBase.prototype,
  
  classID: Components.ID("{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}"),
  contractID: "@mozilla.org/calendar/calendar;1?type=todotxt",
  classDescription: "TodoTxt",
  
  getInterfaces: function getInterfaces(count) {
    const ifaces = [Components.interfaces.calICalendarProvider,
                    Components.interfaces.calICalendar,
                    Components.interfaces.nsIClassInfo,
                    Components.interfaces.nsISupports];
    count.value = ifaces.length;
    return ifaces;
	},
  
  getHelperForLanguage: function getHelperForLanguage(language) {
    return null;
  },
  
  implementationLanguage: Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT,
  flags: 0,
  
  mUri: null,
  mLastSync: null,
  mTaskCache: {},
  mPendingApiRequest: false,
  mPendingApiRequestListeners: {},

  get pendingApiRequest() {
    return this.mPendingApiRequest;
  },
  set pendingApiRequest(aValue) {
    this.mPendingApiRequest = aValue;
    
    // when we turn off the pendingApiRequest flag, process anything in the pendingApiRequestListeners queue
    if (aValue == false) {
      let apiListeners = this.mPendingApiRequestListeners[this.id];
      
      for (let i=0; i<apiListeners.length; i++) {
        let apiListener = apiListeners[i];
        let callback = apiListener.callback;
        callback.apply(this, [apiListener.itemFilter, apiListener.count, 
                               apiListener.fromDate, apiListener.toDate, apiListener.listener]);
      }
      this.mPendingApiRequestListeners[this.id] = [];
    }
  },
  
  get listId() {
    return this.getProperty('listId');
  },
  set listId(aListId) {
    this.setProperty('listId', aListId);
  },
  
  get itemType() {
    return this.getProperty('itemType');
  },
  
  getCachedItems: function cSC_getCachedItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener) {
    todotxtLogger.debug('calTodotxt.js:getCachedItems()');
    
    let items = [];
    let taskCache = this.mTaskCache[this.id];
    for (let itemId in taskCache){
      let cachedItem = this.mTaskCache[this.id][itemId];
      items.push(cachedItem);
    }

    aListener.onGetResult(this.superCalendar,
                          Components.results.NS_OK,
                          Components.interfaces.calITodo,
                          null,
                          items.length,
                          items);
    this.notifyOperationComplete(aListener, 
                                  Components.results.NS_OK,
                                  Components.interfaces.calIOperationListener.GET,
                                  null,
                                  null);
  },
  
  /*
   * nsISupports
   */
  //TODO: find way for using global parametr
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.calICalendarProvider,
                    Components.interfaces.calICalendar,
                    Components.interfaces.nsIClassInfo]),

  /*
   * calICalendarProvider interface
   */
  get prefChromeOverlay() {
    return null;
  },
  
  get displayName() {
    return 'Todo.txt';
  },

  createCalendar: function cSC_createCal() {
    throw NS_ERROR_NOT_IMPLEMENTED;
  },

  deleteCalendar: function cSC_deleteCal(cal, listener) {
    throw NS_ERROR_NOT_IMPLEMENTED;
  },
  
  /*
   * calICalendar interface
   */
  get type() {
    return "todotxt";
  },

  get providerID() {
  	return "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
	},

  get canRefresh() {
    return true;
  },

  get uri() {
    return this.mUri
  },
  set uri(aUri) {
    this.mUri = aUri;
  },

  getProperty: function cSC_getProperty(aName) {
    return this.__proto__.__proto__.getProperty.apply(this, arguments);
  },

  refresh: function cSC_refresh() {
    todotxtLogger.debug('calTodotxt.js:refresh()');
    
    // setting the last sync to null forces the next getItems call to make an API request rather than returning a cached result
    this.mLastSync = null;
    this.observers.notify("onLoad", [this]);
  },
  
  addItem: function cSC_addItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:addItem()');
    return this.adoptItem(aItem.clone(), aListener);
  },
  
  adoptItem: function cSC_adoptItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:adoptItem()');
    
    try {    

			let isEvent = aItem.isCompleted == null;
			if(isEvent)
				throw new Components.Exception('This calendar only accepts todos.', Components.results.NS_ERROR_UNEXPECTED);

      let item = todoClient.addItem(aItem);
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.ADD,
                                    item.id,
                                    item);
      this.mTaskCache[this.id][item.id] = item;
      this.observers.notify("onAddItem", [item]);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:addItem()',e);
      
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.ADD,
                                    null,
                                    e.message);
    }
  },
  
  modifyItem: function cSC_modifyItem(aNewItem, aOldItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:modifyItem()');
    
    try{
      this.mTaskCache[this.id][aNewItem.id] = aNewItem;
      todoClient.modifyItem(aOldItem, aNewItem);
    
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_OK,
                                   Components.interfaces.calIOperationListener.MODIFY,
                                   aNewItem.id,
                                   aNewItem);
      this.mTaskCache[this.id][aNewItem.id] = aNewItem;
      this.observers.notify('onModifyItem', [aNewItem, aOldItem]);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:modifyItem()',e);
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_ERROR_UNEXPECTED,
                                   Components.interfaces.calIOperationListener.MODIFY,
                                   null,
                                   'Unable to modify task.');

    }
  },
  
  deleteItem: function cSC_deleteItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:deleteItem()');
    
    try {
      todoClient.deleteItem(aItem);
      delete this.mTaskCache[this.id][aItem.id];
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    aItem.id,
                                    aItem);
      this.observers.notify("onDeleteItem", [aItem]);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:deleteItem()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    null,
                                    e.message);
    }
  },
  
  getItem: function cSC_getItem(aId, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItem()');
    // do we need to implement something here?
  },
  
  getItems: function cSC_getItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItems()');
    // we have to initialize these, and the calendar ID property isn't available
    // when the constructor is called
    if (!this.mTaskCache[this.id]) {
      this.mTaskCache[this.id] = {};
    }
    if (!this.mPendingApiRequestListeners[this.id]) {
      this.mPendingApiRequestListeners[this.id] = [];
    }
    
    try {
    	if(this.mLastSync == null){
    		items = todoClient.getItems(this,true);

				this.mLastSync = new Date();

				for each(item in items){
					this.mTaskCache[this.id][item.id] = item;
				}

				aListener.onGetResult(this.superCalendar,
															Components.results.NS_OK,
															Components.interfaces.calITodo,
															null,
															items.length,
															items);
				this.notifyOperationComplete(aListener, 
																		Components.results.NS_OK,
																		Components.interfaces.calIOperationListener.GET,
																		null,
																		null);
			}else{
				this.getCachedItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener);
			}
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:getItems()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.GET,
                                    null,
                                    e.message);
    }
  },

  startBatch: function cSC_startBatch()
  {
    todotxtLogger.debug('calTodotxt.js:startBatch()');
  },
  
  endBatch: function cSC_endBatch()
  {
    todotxtLogger.debug('calTodotxt.js:endBatch()');
  }
};

var myPrefObserver = {
  
  calendar: null,

  register: function(cal) {

    this.calendar = cal;
    // For this.branch we ask for the preferences for extensions.myextension. and children
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);

    this.branch = prefs.getBranch("extensions.todotxt.");

    if (!("addObserver" in this.branch))
        this.branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

    // Finally add the observer.
    this.branch.addObserver("", this, false);
  },

  unregister: function() {
    this.calendar = null;
    this.branch.removeObserver("", this);
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aData) {
      case "done-txt":
      case "todo-txt":
        todoClient.setTodo();
        this.calendar.refresh();
        break;
    }
  }
}

/** Module Registration */
function NSGetFactory(cid) {
  return (XPCOMUtils.generateNSGetFactory([calTodoTxt]))(cid);
}
