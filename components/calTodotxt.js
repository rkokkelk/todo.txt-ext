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
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");

function calTodoTxt() {
  this.initProviderBase();
  
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefService);

	prefs = prefs.getBranch("extensions.todotxt.");

  todotxtLogger.debugMode = true;
  todotxtLogger.debug("calTodoTxt");

  todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
	todotxtLogger.debug("Todo: "+todoFile.leafName);

	let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
		              createInstance(Components.interfaces.nsIFileInputStream);
	fstream.init(todoFile, -1, 0, 0);
	let data = NetUtil.readInputStreamToString(fstream, fstream.available());
	var todo = TodoTxt.parseFile(data);
	todotxtLogger.debug("Todo's Length: "+todo.length);
}

calTodoTxt.prototype = {
  __proto__: cal.ProviderBase.prototype,
  
  classID: Components.ID("{62227ad7-1b03-4ada-b640-8d794157cda3}"),
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
    todotxtLogger.debug('calTodotxt.js:getCachedItems() (' + this.name + ')');
    
    let items = [];
    let taskCache = this.mTaskCache[this.id];
    for (let itemId in this.mTaskCache[this.id]) {
      let cachedItem = this.mTaskCache[this.id][itemId];
      let compDate;
      if (this.itemType == 'events') {
        compDate = cachedItem.startDate;
      } else {
        compDate = cachedItem.dueDate;
      }
      
      if (!compDate) {
        items.push(cachedItem);
      } else {
        let rangeStartComp = aRangeStart ? compDate.compare(aRangeStart) : 1;
        let rangeEndComp = aRangeEnd ? compDate.compare(aRangeEnd) : -1;
        
        if (rangeStartComp >= 0 && rangeEndComp <= 0) {
          items.push(cachedItem);
        }
      }
    }
    
    this.getItems_callback(-1, items, aListener);
  },
  
  /*
   * nsISupports
   */
  QueryInterface: function (aIID) {
    return cal.doQueryInterface(this, calTodoTxt.prototype, aIID, null, this);
	},
  
  /*
   * calICalendarProvider interface
   */
  get prefChromeOverlay() {
    return null;
  },
  
  get displayName() {
    return 'TodoTxt';
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
    todotxtLogger.debug('calTodotxt.js:refresh() (' + this.name + ')');
    
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
      if (this.itemType == 'events' && !isEvent) {
        throw new Components.Exception('This calendar only accepts events.', Components.results.NS_ERROR_UNEXPECTED);
      }
      if (this.itemType == 'todos' && isEvent) {
        throw new Components.Exception('This calendar only accepts todos.', Components.results.NS_ERROR_UNEXPECTED);
      }
      
      let data = {
        item: aItem,
        listId: this.listId,
        calListener: aListener,
        callback: this.adoptItem_callback.bind(this)
      };
    } catch (e) {
      todotxtLogger.debug('calTodotxt.js:adoptItem()', 'ERROR');
      
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.ADD,
                                    null,
                                    e.message);
    }
  },
  
  adoptItem_callback: function cSC_adoptItem_callback(aStatus, aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:adoptItem_callback()');
        
    if (aStatus == rtmClient.results.RTM_API_OK) {
      this.mTaskCache[this.id][aItem.id] = aItem;
      
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.ADD,
                                    aItem.id,
                                    aItem);
      this.observers.notify("onAddItem", [aItem]);
    } else {
      todotxtLogger.debug('calTodotxt.js:adoptItem_callback', 'Got an error from the API request');
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_ERROR_UNEXPECTED,
                                    Components.interfaces.calIOperationListener.ADD,
                                    null,
                                    'Unable to add new task.');
    }
  },
  
  modifyItem: function cSC_modifyItem(aNewItem, aOldItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:modifyItem()');
    
    try {
      let data = {
        newItem: aNewItem,
        oldItem: aOldItem,
        calListener: aListener,
        callback: this.modifyItem_callback.bind(this)
      };
      rtmClient.request('modify', data);
    } catch (e) {
      todotxtLogger.debug('calTodotxt.js:modifyItem()', 'ERROR');
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.MODIFY,
                                    null,
                                    e.message);
    }
  },
  
  modifyItem_callback: function cSC_modifyItem_callback(aStatus, aNewItem, aOldItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:modifyItem_callback()');
    
    if (aStatus == rtmClient.results.RTM_API_OK) {
      this.mTaskCache[this.id][aNewItem.id] = aNewItem;
    
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_OK,
                                   Components.interfaces.calIOperationListener.MODIFY,
                                   aNewItem.id,
                                   aNewItem);
      this.observers.notify('onModifyItem', [aNewItem, aOldItem]);
    } else {
      todotxtLogger.debug('calTodotxt.js:modifyItem_callback()', 'Got an error from the API request');
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
      let data = {
        item: aItem,
        calListener: aListener,
        callback: this.deleteItem_callback.bind(this)
      };
      rtmClient.request('delete', data);
    } catch (e) {
      todotxtLogger.debug('calTodotxt.js:deleteItem()', 'ERROR');
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    null,
                                    e.message);
    }
  },
  
  deleteItem_callback: function cSC_deleteItem_callback(aStatus, aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:deleteItem_callback()');
    
    if (aStatus == rtmClient.results.RTM_API_OK) {    
      delete this.mTaskCache[this.id][aItem.id];
      
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    aItem.id,
                                    aItem);
      this.observers.notify("onDeleteItem", [aItem]);
    } else {
      todotxtLogger.debug('calTodotxt.js:deleteItem_callback()', 'Got an error from the API request');
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_ERROR_UNEXPECTED,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    null,
                                    'Unable to delete task.');
    }
  },

  getItem: function cSC_getItem(aId, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItem()');
    // do we need to implement something here?
  },
  
  getItems: function cSC_getItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItems() (' + this.name + ')');
    
    // we have to initialize these, and the calendar ID property isn't available
    // when the constructor is called
    if (!this.mTaskCache[this.id]) {
      this.mTaskCache[this.id] = {};
    }
    if (!this.mPendingApiRequestListeners[this.id]) {
      this.mPendingApiRequestListeners[this.id] = [];
    }
    
    try {
      let wantEvents = ((aItemFilter & Components.interfaces.calICalendar.ITEM_FILTER_TYPE_EVENT) != 0);
      let wantTodos = ((aItemFilter & Components.interfaces.calICalendar.ITEM_FILTER_TYPE_TODO) != 0);
      
      if ((this.itemType == 'events' && !wantEvents) ||
           (this.itemType == 'todos' && !wantTodos)) {
        this.notifyOperationComplete(aListener,
                                      Components.results.NS_OK,
                                      Components.interfaces.calIOperationListener.GET,
                                      null,
                                      null);
      } else {
        if (!this.mLastSync) {
          this.mLastSync = new Date();
          this.pendingApiRequest = true;
          
          let data = {
            calendar: this,
            itemType: this.itemType,
            listId: this.listId,
            calListener: aListener,
            callback: this.getItems_callback.bind(this)
          };
          
          rtmClient.request('get', data);
        } else {
          if (this.pendingApiRequest) {
            // this means we've issued an API request and we're waiting for a response
            // we wait until the response comes in before we check the task cache
            // otherwise, we may get an old result, or it may be empty
            let apiRequestListener = {
              callback: this.getCachedItems,
              itemFilter: aItemFilter,
              count: aCount,
              fromDate: aRangeStart,
              toDate: aRangeEnd,
              listener: aListener
            };
            this.mPendingApiRequestListeners[this.id].push(apiRequestListener);
          } else {
            this.getCachedItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener);
          }
        }
      }
    } catch (e) {
      todotxtLogger.debug('calTodotxt.js:getItems() (' + this.name + ')', 'ERROR');
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.GET,
                                    null,
                                    e.message);
    }
  },
  
  getItems_callback: function cSC_getItems_callback(aStatus, aItems, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItems_callback() (' + this.name + ')');
    
    let calItemType;
    if (this.itemType == 'events') {
      calItemType = Components.interfaces.calIEvent;
    } else {
      calItemType = Components.interfaces.calITodo;
    }
    
    // status code -1 indicates no API call was made and we're returning a cached result
    // if the result is any other success code, we have to refresh the cache
    if (aStatus == -1) {
      aListener.onGetResult(this.superCalendar,
                            Components.results.NS_OK,
                            calItemType,
                            null,
                            aItems.length,
                            aItems);
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.GET,
                                    null,
                                    null);
    } else {
      if (aStatus == rtmClient.results.RTM_API_OK) {
        todotxtLogger.debug('calTodotxt.js:getItems_callback()', 'Refreshing the task cache');
        this.mTaskCache[this.id] = {};
        for (let i=0; i<aItems.length; i++) {
          let item = aItems[i];
          this.mTaskCache[this.id][item.id] = item;
        }
        this.pendingApiRequest = false;
        
        aListener.onGetResult(this.superCalendar,
                              Components.results.NS_OK,
                              calItemType,
                              null,
                              aItems.length,
                              aItems);
        this.notifyOperationComplete(aListener,
                                      Components.results.NS_OK,
                                      Components.interfaces.calIOperationListener.GET,
                                      null,
                                      null);
      } else {
        todotxtLogger.debug('calTodotxt.js:getItems_callback()', 'Got an error from the API request.');
        this.notifyOperationComplete(aListener,
                                      Components.results.NS_ERROR_UNEXPECTED,
                                      Components.interfaces.calIOperationListener.GET,
                                      null,
                                      'Unable to get tasks.');
      }
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


/** Module Registration */
function NSGetFactory(cid) {
  return (XPCOMUtils.generateNSGetFactory([calTodoTxt]))(cid);
}
