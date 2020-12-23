/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { cal } = ChromeUtils.import("resource:///modules/calendar/calUtils.jsm");

const { observer_scope } = ChromeUtils.import("resource://todotxt/legacy/modules/observers.jsm");
const { exception } = ChromeUtils.import('resource://todotxt/legacy/modules/exception.jsm');
const { todoClient } = ChromeUtils.import("resource://todotxt/legacy/modules/todoclient.jsm");
const { todotxtLogger } = ChromeUtils.import("resource://todotxt/legacy/modules/logger.jsm");

var EXPORTED_SYMBOLS = ["calTodoTxt"]; /* exported calTodoTxt */

class calTodoTxt extends cal.provider.BaseClass {

  static factory = null;
  
  QueryInterface = ChromeUtils.generateQI([
    'calICalendar',
    'nsIClassInfo',
    'nsISupports'
  ]);
  
  flags = 0;
  
  mUri = 'todotxt://_unused';
  fileObserver = null;

  constructor() {
    super();
    this.initProviderBase();

    observer_scope.prefObserver.register(this);
    this.fileObserver = observer_scope.observers.registerFileObserver(this);
  }
  
  get listId() {
    return this.getProperty('listId');
  }

  set listId(aListId) {
    this.setProperty('listId', aListId);
  }
  
  get itemType() {
    return this.getProperty('itemType');
  }

  setProperty(aName, aValue) {
      return this.__proto__.__proto__.setProperty.apply(this, arguments);
  }
  
  /*
   * nsISupports
   */
  //TODO: find way for using global parametr

  get prefChromeOverlay() {
    return null;
  }
  
  get displayName() {
    return 'Todo.txt';
  }

  createCalendar() {
    throw NS_ERROR_NOT_IMPLEMENTED;
  }

  deleteCalendar(cal, listener) {
    throw NS_ERROR_NOT_IMPLEMENTED;
  }
  
  get type() {
    return "todotxt";
  }

  get providerID() {
    return "{00C350E2-3F65-11E5-8E8B-FBF81D5D46B0}";
  }

  get canRefresh() {
    return true;
  }

  get uri() {
    return this.mUri
  }

  set uri(aUri) {
    this.mUri = aUri;
  }

  getProperty(aName) {
    return this.__proto__.__proto__.getProperty.apply(this, arguments);
  }
    
  refresh() {
    todotxtLogger.debug('calTodotxt.js:refresh()');
    
    // setting the last sync to null forces the next getItems call to make an API request rather than returning a cached result
    this.observers.notify("onLoad", [this]);
  }
  
  addItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:addItem()');
    return this.adoptItem(aItem.clone(), aListener);
  }
  
  adoptItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:adoptItem()');
    
    try {    

      if(aItem.isCompleted == null)
        throw exception.EVENT_ENCOUNTERED();

      let item = todoClient.addItem(aItem);
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.ADD,
                                    item.id,
                                    item);
      this.observers.notify("onAddItem", [item]);
      
      observer_scope.observers.fileEvent.updateMD5();
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:addItem()',e);
      
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.ADD,
                                    null,
                                    e.message);
    }
  }
  
  modifyItem(aNewItem, aOldItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:modifyItem()');
    
    try{
      todoClient.modifyItem(aOldItem, aNewItem);
    
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_OK,
                                   Components.interfaces.calIOperationListener.MODIFY,
                                   aNewItem.id,
                                   aNewItem);
      this.observers.notify('onModifyItem', [aNewItem, aOldItem]);
      
      // Update checksum because file changes and thus
      // prevent different ID's, setTimeout because write 
      // is not immediately finished
      observer_scope.observers.fileEvent.updateMD5();
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:modifyItem()',e);
      this.notifyOperationComplete(aListener,
                                   Components.results.NS_ERROR_UNEXPECTED,
                                   Components.interfaces.calIOperationListener.MODIFY,
                                   null,
                                   e.message);
    }
  }
  
  deleteItem(aItem, aListener) {
    todotxtLogger.debug('calTodotxt.js:deleteItem()');
    
    try {
      todoClient.deleteItem(aItem);
      this.notifyOperationComplete(aListener,
                                    Components.results.NS_OK,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    aItem.id,
                                    aItem);
      this.observers.notify("onDeleteItem", [aItem]);
      // Update checksum
      observer_scope.observers.fileEvent.updateMD5();
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:deleteItem()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.DELETE,
                                    null,
                                    e.message);
    }
  }
  
  getItem(aId, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItem()');
    // do we need to implement something here?
  }
  
  getItems(aItemFilter, aCount, aRangeStart, aRangeEnd, aListener) {
    todotxtLogger.debug('calTodotxt.js:getItems()');
    // we have to initialize these, and the calendar ID property isn't available
    // when the constructor is called
    
    try {
      let items = todoClient.getItems(this, true);

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
      
    } catch (e) {
      todotxtLogger.error('calTodotxt.js:getItems()',e);
      this.notifyOperationComplete(aListener,
                                    e.result,
                                    Components.interfaces.calIOperationListener.GET,
                                    null,
                                    e.message);
    }
  }
}
