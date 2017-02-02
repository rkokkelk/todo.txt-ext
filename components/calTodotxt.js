/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Timer.jsm");

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://calendar/modules/calProviderUtils.jsm");

Cu.import("resource://todotxt/logger.jsm");
Cu.import('resource://todotxt/exception.jsm');
Cu.import("resource://todotxt/observers.jsm");
Cu.import("resource://todotxt/todoclient.jsm");
Cu.import("resource://todotxt/todo-txt-js/todotxt.js");

function calTodoTxt() {
  this.initProviderBase();
  
  todotxtLogger.debug("calTodoTxt", "Constructor");

  prefObserver.register(this);
  timerObserver.register(this);
  
  // Add periodical verification of todo files, every 15s
  timer = Cc["@mozilla.org/timer;1"]
    .createInstance(Ci.nsITimer);
  timer.init(timerObserver, 15*1000, Ci.nsITimer.TYPE_REPEATING_SLACK);
}

calTodoTxt.prototype = {
  __proto__: cal.ProviderBase.prototype,
  
  classID: Components.ID("{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}"),
  contractID: "@mozilla.org/calendar/calendar;1?type=todotxt",
  classDescription: "TodoTxt",
  
  getInterfaces: function getInterfaces(count) {
    const ifaces = [Ci.calICalendarProvider,
                    Ci.calICalendar,
                    Ci.nsIClassInfo,
                    Ci.nsISupports];
    count.value = ifaces.length;
    return ifaces;
  },
  
  getHelperForLanguage: function getHelperForLanguage(language) {
    return null;
  },
  
  implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,
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
                          Ci.calITodo,
                          null,
                          items.length,
                          items);
    this.notifyOperationComplete(aListener, 
                                  Components.results.NS_OK,
                                  Ci.calIOperationListener.GET,
                                  null,
                                  null);
  },
  
  /*
   * nsISupports
   */
  //TODO: find way for using global parametr
  QueryInterface: XPCOMUtils.generateQI([Ci.calICalendarProvider,
                    Ci.calICalendar,
                    Ci.nsIClassInfo]),

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

      if(aItem.isCompleted == null)
        throw exception.EVENT_ENCOUNTERED();

      let item = todoClient.addItem(aItem);
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Ci.calIOperationListener.ADD,
                                    item.id,
                                    item);
      this.mTaskCache[this.id][item.id] = item;
      this.observers.notify("onAddItem", [item]);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:addItem()',e);
      
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Ci.calIOperationListener.ADD,
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
                                   Ci.calIOperationListener.MODIFY,
                                   aNewItem.id,
                                   aNewItem);
      this.mTaskCache[this.id][aNewItem.id] = aNewItem;
      this.observers.notify('onModifyItem', [aNewItem, aOldItem]);
      
      // Update checksum because file changes and thus
      // prevent different ID's, setTimeout because write 
      // is not immediately finished
      let timer = Cc["@mozilla.org/timer;1"]
        .createInstance(Ci.nsITimer);
      timer.initWithCallback(timerObserver, 1*1000, Ci.nsITimer.TYPE_ONE_SHOT);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:modifyItem()',e);
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_ERROR_UNEXPECTED,
                                   Ci.calIOperationListener.MODIFY,
                                   null,
                                   e.message);
    }
  },
  
  deleteItem: function cSC_deleteItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:deleteItem()');
    
    try {
      todoClient.deleteItem(aItem);
      delete this.mTaskCache[this.id][aItem.id];
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Ci.calIOperationListener.DELETE,
                                    aItem.id,
                                    aItem);
      this.observers.notify("onDeleteItem", [aItem]);
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:deleteItem()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Ci.calIOperationListener.DELETE,
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
    if (!this.mTaskCache[this.id])
      this.mTaskCache[this.id] = {};
    
    if (!this.mPendingApiRequestListeners[this.id])
      this.mPendingApiRequestListeners[this.id] = [];
    
    try {
      if(!this.mLastSync){
        items = todoClient.getItems(this,true);

        this.mLastSync = new Date();
        this.mTaskCache[this.id] = {};

        for each(item in items)
          this.mTaskCache[this.id][item.id] = item;

        aListener.onGetResult(this.superCalendar,
                              Components.results.NS_OK,
                              Ci.calITodo,
                              null,
                              items.length,
                              items);
        this.notifyOperationComplete(aListener, 
                                    Components.results.NS_OK,
                                    Ci.calIOperationListener.GET,
                                    null,
                                    null);
      }else
        this.getCachedItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener);
      
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:getItems()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Ci.calIOperationListener.GET,
                                    null,
                                    e.message);
    }
  },

  startBatch: function cSC_startBatch(){
    todotxtLogger.debug('calTodotxt.js:startBatch()');
  },
  
  endBatch: function cSC_endBatch(){
    todotxtLogger.debug('calTodotxt.js:endBatch()');
  }
};

/** Module Registration */
function NSGetFactory(cid) {
  return (XPCOMUtils.generateNSGetFactory([calTodoTxt]))(cid);
}
