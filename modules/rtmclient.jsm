Components.utils.import("resource://calendar/modules/calUtils.jsm");

Components.utils.import('resource://stormcows/logger.jsm');


EXPORTED_SYMBOLS = ['rtmClient'];

let rtmClient = {
  
  get apiKey() {
    return 'e26a18535958e43f44f175f3d4a47a50';
  },
  
  get apiSecret() {
    return '0214bd2dffa0218f';
  },
  
  get authToken() {
    try {
      let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefBranch);
      let token = prefService.getCharPref('extensions.{62227ad7-1b03-4ada-b640-8d794157cda3}.authToken');
      if (token.length == 0) {
        return null;
      } else {
        return token;
      }
    } catch (e) {
      return null;
    }
  },
  set authToken(aToken) {
    let prefService = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
    prefService.setCharPref('extensions.{62227ad7-1b03-4ada-b640-8d794157cda3}.authToken', aToken);
  },
  
  mRequestQueue: [],
  mProcessingRequest: false,
  mTimeline: null,
    
  results: {
    RTM_API_OK: 0,
    RTM_API_FAIL: 1,
    HTTP_REQUEST_OK: 2,
    HTTP_REQUEST_FAIL: 3
  },
  
  getInterface: cal.InterfaceRequestor_getInterface,
  
  request: function(aOperation, aData) {
    stormcowsLogger.debug('rtmclient.js:request()');

    let params = {},
         metadata = {},
         item = null,
         idParts = [],
         listId = null,
         taskseriesId = null,
         taskId = null,
         isEvent = false;
    
    switch (aOperation) {
      case 'getFrob':
        metadata = {
          callback: aData.callback
        };
        this.sendRequest('rtm.auth.getFrob', {}, false, this.getFrob_response, metadata);
        break;
      
      case 'getToken':
        if (!aData.frob) {
          stormcowsLogger.debug('rtmclient.js:request()/getToken', 'No frob given');
          return;
        }
        
        params = {
          frob: aData.frob
        };
        metadata = {
          callback: aData.callback
        };
        this.sendRequest('rtm.auth.getToken', params, false, this.getToken_response, metadata);
        break;
      
      case 'getLists':
        metadata = {
          callback: aData.callback
        };
        this.sendRequest('rtm.lists.getList', {}, false, this.getLists_response, metadata);
        break;
        
      case 'add':
        if (!aData.item) {
          stormcowsLogger.debug('rtmclient.js:request()/add', 'No item was given');
          return;
        }
        if (!aData.listId) {
          stormcowsLogger.debug('rtmclient.js:request()/add', 'No listId was given');
          return;
        }
      
        item = aData.item;
        isEvent = item.isCompleted == null;
        if (isEvent && !item.startDate) {
          stormcowsLogger.debug('rtmclient.js:request()/add', 'Event has no start date');
          return;
        }
        
        let dueDate;
        let dueDateStr = '';
        if (isEvent) {
          dueDate = item.startDate;
        } else {
          dueDate = item.dueDate;
        }
        
        if (dueDate) {
          if (dueDate.isDate) {
            dueDateStr = this.makeDateStr(dueDate);
          } else {
            dueDateStr = this.makeDateStr(dueDate) + ' at ' + this.makeTimeStr(dueDate);
          }
        }
        
        this.getTimeline();
        
        params = {
          name: item.title + ' ^' + dueDateStr,
          parse: '1',
          list_id: aData.listId,
        };
        if (dueDateStr.length == 0) {
          params.name = item.title;
        } else {
          params.name = item.title + ' ^' + dueDateStr;
        }
        
        metadata = {
          calCallback: aData.callback,
          calListener: aData.calListener,
          item: item
        };
        this.sendRequest('rtm.tasks.add', params, true, this.addTask_response, metadata);
        break;
        
      case 'modify':
        if (!aData.newItem || !aData.oldItem) {
          stormcowsLogger.debug('rtmclient.js:request()/modify', 'Either newItem or oldItem was not given');
          return;
        }
        let newItem = aData.newItem;
        let oldItem = aData.oldItem;
        isEvent = newItem.isCompleted == null;
        
        if (!newItem.id) {
          stormcowsLogger.debug('rtmclient.js:request()/modify', 'newItem did not have a valid ID');
          return;
        }
        idParts = newItem.id.split('.');
        listId = idParts[0];
        taskseriesId = idParts[1];
        taskId = idParts[2];
        
        this.getTimeline();
        
        params = {
          list_id: listId,
          taskseries_id: taskseriesId,
          task_id: taskId
        };
        metadata = {
          calCallback: aData.callback,
          calListener: aData.calListener,
          newItem: aData.newItem,
          oldItem: aData.oldItem
        };
        
        // check for name change
        if (newItem.title != oldItem.title) {
          params.name = newItem.title;
          this.sendRequest('rtm.tasks.setName', params, true, this.modifyTask_response, metadata);
        }
        
        // check for due date change
        let newCompDate;
        let oldCompDate;
        if (isEvent) {
          newCompDate = newItem.startDate;
          oldCompDate = oldItem.startDate;
        } else {
          newCompDate = newItem.dueDate;
          oldCompDate = oldItem.dueDate;
        }
        
        if (newCompDate == null) {
          if (oldCompDate != null) {
            params.due = '';
            this.sendRequest('rtm.tasks.setDueDate', params, true, this.modifyTask_response, metadata);
          }
        } else {
          if (oldCompDate == null ||
              newCompDate.compare(oldCompDate) != 0 ||
              newCompDate.isDate != oldCompDate.isDate) {
            params.parse = '1'
            if (newCompDate.isDate) {
              params.due = cal.toRFC3339(newCompDate);
              params.has_due_time = '0';
            } else {
              params.due = cal.toRFC3339(newCompDate);
              params.has_due_time = '1';
            }
            this.sendRequest('rtm.tasks.setDueDate', params, true, this.modifyTask_response, metadata);
          }
        }
        
        // check for priority change
        if (newItem.priority != oldItem.priority) {
          if (newItem.priority == 0) {
            params.priority = 'N';
          } else if (newItem.priority == 1) {
            params.priority = '1';
          } else if (newItem.priority == 5) {
            params.priority = '2';
          } else if (newItem.priority == 9) {
            params.priority = '3';
          }
          
          this.sendRequest('rtm.tasks.setPriority', params, true, this.modifyTask_response, metadata);
        }
        
        // check for completion change
        if (!isEvent && (newItem.isCompleted != oldItem.isCompleted)) {
          if (newItem.isCompleted) {
            this.sendRequest('rtm.tasks.complete', params, true, this.modifyTask_response, metadata);
          } else {
            this.sendRequest('rtm.tasks.uncomplete', params, true, this.modifyTask_response, metadata);
          }
        }
        
        break;
        
      case 'delete':
        if (!aData.item) {
          stormcowsLogger.debug('rtmclient.js:request()/delete', 'Item was not given');
          return;
        }
        item = aData.item;
        
        if (!item.id) {
          stormcowsLogger.debug('rtmclient.js:request()/delete', 'Item did not have a valid ID');
          return;
        }
        idParts = item.id.split('.');
        listId = idParts[0];
        taskseriesId = idParts[1];
        taskId = idParts[2];
        
        this.getTimeline();
        
        params = {
          list_id: listId,
          taskseries_id: taskseriesId,
          task_id: taskId
        };
        metadata = {
          calCallback: aData.callback,
          calListener: aData.calListener,
          item: item
        };
        this.sendRequest('rtm.tasks.delete', params, true, this.deleteTask_response, metadata);
        break;
        
      case 'get':
        let filterStr;
        if (aData.itemType == 'events') {
          filterStr = 'status:incomplete AND NOT due:never';
        } else {
          filterStr = null;
        }
        stormcowsLogger.debug('rtmclient.js:request()/get', 'Filter: ' + filterStr);
        
        if (!aData.listId) {
          stormcowsLogger.debug('rtmclient.js:request()/get', 'No listId was given');
          return;
        }
        
        params = {
          list_id: aData.listId
        };
        if (filterStr) {
          params.filter = filterStr;
        }
        
        metadata = {
          itemType: aData.itemType,
          calCallback: aData.callback,
          calListener: aData.calListener,
          calendar: aData.calendar
        };
        this.sendRequest('rtm.tasks.getList', params, false, this.getTasks_response, metadata);
        
        break;
        
      default:
        stormcowsLogger.debug('rtmclient.js:request()', 'Unrecognized API operation: ' + aOperation );
    }
  },
  
  sendRequest: function(aMethod, aParams, aTimeline, aRequestCallback, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:sendRequest()');
    
    if (this.mProcessingRequest) {
      let pendingRequest = {
        method: aMethod,
        params: aParams,
        timeline: aTimeline,
        requestCallback: aRequestCallback,
        metadata: aMetadata
      };
      this.mRequestQueue.push(pendingRequest);
      return;
    }
    
    this.mProcessingRequest = true;
    
    let self = this,
         authToken = this.authToken,
         params = aParams,
         status = null,
         response = null;
    
    params.api_key = this.apiKey;
    params.format = 'json';
    params.method = aMethod;
    
    if (authToken) {
      params.auth_token = authToken;
    }
    if (aTimeline) {
      params.timeline = this.mTimeline;
    }
    
    let channelListener = {
      onStreamComplete: function cl_onStreamComplete(aLoader, aContext, aStatus, aResultLength, aResult) {
        stormcowsLogger.debug('rtmclient.js:sendRequest()/onStreamComplete');
        let request = aLoader.request.QueryInterface(Components.interfaces.nsIHttpChannel);
        if (request.responseStatus === 200) {
          status = self.results.HTTP_REQUEST_OK;
          response = cal.convertByteArray(aResult, aResultLength);
        } else {
          stormcowsLogger.debug('rtmclient.js:sendRequest()', 'API request failed (HTTP status: ' + request.responseStatus + ')');
          status = self.results.HTTP_REQUEST_FAIL;
          response = null;
        }
        aRequestCallback.apply(self, [response, status, aMetadata]);
        self.checkRequestQueue();
      }
    };
    
    let url = this.makeRequestUrl(params);
    stormcowsLogger.debug('rtmclient.js:sendRequest()', 'Request URL: ' + url.spec);
    let httpChannel = cal.prepHttpChannel(url, null, null, this);
    cal.sendHttpRequest(cal.createStreamLoader(), httpChannel, channelListener);
  },
  
  getTimeline: function() {
    stormcowsLogger.debug('rtmclient.js:getTimeline()');
    
    if (this.mTimeline) {
      return;
    }
    
    if (!this.authToken) {
      stormcowsLogger.debug('rtmclient.js:getTimeline()', 'No auth token, unable to get a timeline');
      return;
    }
    
    this.mProcessingRequest = true;
    
    let self = this;
    let params = {
      api_key: this.apiKey,
      format: 'json',
      method: 'rtm.timelines.create',
      auth_token: this.authToken
    };
    
    let channelListener = {
      onStreamComplete: function (aLoader, aContext, aStatus, aResultLength, aResult) {
        let request = aLoader.request.QueryInterface(Components.interfaces.nsIHttpChannel);
        if (request.responseStatus === 200) {
          let response = cal.convertByteArray(aResult, aResultLength);
          self.mTimeline = JSON.parse(response).rsp.timeline;
        } else {
          let response = null;
          self.mTimeline = null;
        }
        self.checkRequestQueue();
      }
    };
    
    let url = this.makeRequestUrl(params);
    stormcowsLogger.debug('rtmclient.js:getTimeline()', 'Request URL: ' + url.spec);
    let httpChannel = cal.prepHttpChannel(url, null, null, this);
    cal.sendHttpRequest(cal.createStreamLoader(), httpChannel, channelListener);
  },
  
  checkRequestQueue: function() {
    stormcowsLogger.debug('rtmclient.js:checkRequestQueue()');
    
    this.mProcessingRequest = false;
    if (this.mRequestQueue.length > 0) {
      let nextRequest = this.mRequestQueue.shift();
      this.sendRequest(nextRequest.method, nextRequest.params, nextRequest.timeline,
                        nextRequest.requestCallback, nextRequest.metadata);
    }
  },
  
  getRequestSignature: function(aParams) {
    let keys = [];
    for (param in aParams) {
      keys.push(param);
    }
    keys.sort();
    
    let sigStr = this.apiSecret;
    for (let i=0; i<keys.length; i++) {
      let key = keys[i];
      sigStr += key + aParams[key];
    }
    
    // this MD5 hash craziness was mostly copied from here:
    // https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsICryptoHash#Computing_the_Hash_of_a_String
    let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                      .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = 'UTF-8';
    
    let result = {};
    let data = converter.convertToByteArray(sigStr, result);
    var cryptohash = Components.classes["@mozilla.org/security/hash;1"]
                      .createInstance(Components.interfaces.nsICryptoHash);
    cryptohash.init(cryptohash.MD5);
    cryptohash.update(data, data.length);
    let hash = cryptohash.finish(false);
    
    function toHexString(charCode) {
      return ('0' + charCode.toString(16)).slice(-2);
    }
    
    let sig = [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
    
    return sig;
  },
  
  makeRequestUrl: function(aParams) {
    let url = 'https://api.rememberthemilk.com/services/rest/?';
    
    for (let param in aParams) {
      url += encodeURIComponent(param) + '=' + encodeURIComponent(aParams[param]) + '&';
    }
    url += 'api_sig=' + this.getRequestSignature(aParams);
    
    return cal.makeURL(url);
  },
  
  makeAuthUrl: function(aParams) {
    let url = 'http://www.rememberthemilk.com/services/auth/?';
    
    for (let param in aParams) {
      url += encodeURIComponent(param) + '=' + encodeURIComponent(aParams[param]) + '&';
    }
    url += 'api_sig=' + this.getRequestSignature(aParams);
    
    return cal.makeURL(url);
  },
  
  getFrob_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:getFrob_response()');
    
    let frob,
         authUrl;
    
    try {
      frob = JSON.parse(aResult).rsp.frob;
    } catch (e) {
      stormcowsLogger.debug('rtmclient.js:getFrob_response()', 'Got an unparseable response from the API');
      frob = null;
    }
    let callback = aMetadata.callback;
    
    if (frob) {
      let params = {
        api_key: this.apiKey,
        frob: frob,
        perms: 'delete'
      };
      authUrl = this.makeAuthUrl(params);
    } else {
      authUrl = null;
    }
    
    callback(frob, authUrl);
  },
  
  getToken_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:getToken_response()');
    
    let token;
    try {
      token = JSON.parse(aResult).rsp.auth.token;
    } catch (e) {
      stormcowsLogger.debug('rtmclient.js:getToken_response()', 'Got an unparseable response from the API');
      token = null;
    }
    let callback = aMetadata.callback;
    
    callback(token);
  },
  
  getLists_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:getLists_response()');
    
    let callback = aMetadata.callback,
         lists = [];
    try {
      let rspLists = JSON.parse(aResult).rsp.lists.list;
      for (let i=0; i<rspLists.length; i++) {
        let list = {
          name: rspLists[i].name,
          id: rspLists[i].id
        };
        lists.push(list);
      }
    } catch (e) {
      stormcowsLogger.debug('rtmclient.js:getLists_response()', 'Got an unparseable response from the API');
      lists = null;
    }
    
    callback(lists);
  },
  
  addTask_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:addTask_response()');
    
    let callback = aMetadata.calCallback,
         listener = aMetadata.calListener,
         item = aMetadata.item,
         status = null;
    
    try {
      let rsp = JSON.parse(aResult).rsp;
      
      if (rsp.stat == 'fail') {
        status = this.results.RTM_API_FAIL;
        stormcowsLogger.debug('rtmclient.js:addTask_response()', 'Got an error from the API');
        stormcowsLogger.debug(null, aResult);
      } else {
        status = this.results.RTM_API_OK;
        let listId = rsp.list.id;
        let taskseriesId = rsp.list.taskseries.id;
        let taskId = rsp.list.taskseries.task.id;
        
        item.id = this.makeRtmId(listId, taskseriesId, taskId);
      }
    } catch (e) {
      status = this.results.RTM_API_FAIL;
      stormcowsLogger.debug('rtmclient.js:addTask_response()', 'Got an unparseable response from the API');
      stormcowsLogger.debug(null, aResult);
    }
    
    callback(status, item, listener);
  },
  
  modifyTask_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:modifyTask_response()');
    
    let callback = aMetadata.calCallback,
         listener = aMetadata.calListener,
         newItem = aMetadata.newItem,
         oldItem = aMetadata.oldItem,
         status = null;
    
    try {
      let rsp = JSON.parse(aResult).rsp;
      
      if (rsp.stat == 'fail') {
        status = this.results.RTM_API_FAIL;
        stormcowsLogger.debug('rtmclient.js:modifyTask_response()', 'Got an error from the API');
        stormcowsLogger.debug(null, aResult);
      } else {
        status = this.results.RTM_API_OK;
      }
    } catch (e) {
      status = this.results.RTM_API_FAIL;
      stormcowsLogger.debug('rtmclient.js:modifyTask_response()', 'Got an unparseable response from the API');
      stormcowsLogger.debug(null, aResult);
    }
    
    callback(status, newItem, oldItem, listener);
  },
  
  deleteTask_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:deleteTask_response()');
    
    let callback = aMetadata.calCallback;
    let listener = aMetadata.calListener;
    let item = aMetadata.item;
    let status;
    
    try {
      let rsp = JSON.parse(aResult).rsp;
      
      if (rsp.stat == 'fail') {
        status = this.results.RTM_API_FAIL;
        stormcowsLogger.debug('rtmclient.js:deleteTask_response()', 'Got an error from the API');
        stormcowsLogger.debug(null, aResult);
      } else {
        status = this.results.RTM_API_OK;
      }
    } catch (e) {
      status = this.results.RTM_API_FAIL;
      stormcowsLogger.debug('rtmclient.js:deleteTask_response()', 'Got an unparseable response from the API');
      stormcowsLogger.debug(null, aResult);
    }
    
    callback(status, item, listener);
  },
  
  getTasks_response: function(aResult, aStatus, aMetadata) {
    stormcowsLogger.debug('rtmclient.js:getTasks_response()');
    
    let callback = aMetadata.calCallback,
         listener = aMetadata.calListener,
         calendar = aMetadata.calendar,
         items = [],
         itemType = aMetadata.itemType,
         tzService = cal.getTimezoneService(),
         status = null;
    
    try {
      let rsp = JSON.parse(aResult).rsp;
      
      if (rsp.stat == 'fail') {
        status = this.results.RTM_API_FAIL;
        stormcowsLogger.debug('rtmclient.js:getTasks_response()', 'Got an error from the API');
        stormcowsLogger.debug(null, aResult);
      } else {
        let lists = this.toArray(rsp.tasks.list);
        for (let i=0; i<lists.length; i++) {
          let listId = lists[i].id;
          let series = this.toArray(lists[i].taskseries);
          for (let j=0; j<series.length; j++) {
            let taskseriesId = series[j].id;
            let tasks = this.toArray(series[j].task);
            for (let k=0; k<tasks.length; k++) {
              let item;
              let taskId = tasks[k].id;
              let name = series[j].name;
              let due = tasks[k].due;
              
              if (itemType == 'events') {
                item = cal.createEvent();
                let startDate = cal.createDateTime();
                startDate.jsDate = new Date(due);
                let endDate = null;
                let duration = cal.createDuration();
                if (tasks[k].has_due_time == '0') {
                  startDate.isDate = true;
                  startDate = startDate.getInTimezone(tzService.defaultTimezone);
                  endDate = startDate.clone();
                  duration.days = 1;
                  endDate.addDuration(duration);
                } else {
                  startDate.isDate = false;
                  startDate = startDate.getInTimezone(tzService.defaultTimezone);
                  endDate = startDate.clone();
                  duration.hours = 1;
                  endDate.addDuration(duration);
                }
                
                item.startDate = startDate;
                item.endDate = endDate;
                
              } else {
                item = cal.createTodo();
                if (!due) {
                  item.dueDate = null;
                } else {
                  let dueDate = cal.createDateTime();
                  dueDate.jsDate = new Date(due);
                  if (tasks[k].has_due_time == '0') {
                    dueDate.isDate = true;
                  } else {
                    dueDate.isDate = false;
                  }
                  dueDate = dueDate.getInTimezone(tzService.defaultTimezone);
                  
                  item.dueDate = dueDate;
                }
                
                let completed = tasks[k].completed;
                if (!completed) {
                  item.completedDate = null;
                  item.percentComplete = 0;
                  item.isCompleted = false;
                } else {
                  let completedDate = cal.createDateTime();
                  completedDate.jsDate = new Date(completed);
                  completedDate = completedDate.getInTimezone(tzService.defaultTimezone);
                  completedDate.isDate = false;
                  item.completedDate = completedDate;
                  item.percentComplete = 100;
                  item.isCompleted = true;
                }
              }
              
              let priority = tasks[k].priority;
              if (priority == 'N') {
                item.priority = 0;
              } else if (priority == '1') {
                item.priority = 1;
              } else if (priority == '2') {
                item.priority = 5;
              } else if (priority == '3') {
                item.priority = 9;
              }
              
              item.title = name;
              item.calendar = calendar;
              item.id = this.makeRtmId(listId, taskseriesId, taskId);
              item.makeImmutable();
              
              items.push(item);
            }
          }
        }
        status = this.results.RTM_API_OK;
      }
    } catch (e) {
      status = this.results.RTM_API_FAIL;
      stormcowsLogger.debug('rtmclient.js:getTasks_response()', 'Got an unparseable response from the API');
      stormcowsLogger.debug(null, aResult);
    }
    
    callback(status, items, listener);
  },
  
  toArray: function(val) {
    if (!val) { 
      return [];
    } else {
      return Array.isArray(val) ? val : [val];
    }
  },
  
  makeDateStr: function(date) {
    let month = (date.month < 9) ? '0' + (date.month + 1) : (date.month + 1);
    let day = (date.day < 10) ? '0' + date.day : date.day;
    
    return date.year + '-' + month + '-' + day;
  },
  
  makeTimeStr: function(date) {
    let hour = (date.hour < 10) ? '0' + date.hour : date.hour;
    let minute = (date.minute < 10) ? '0' + date.minute : date.minute;
    
    return hour + ':' + minute;
  },
  
  makeRtmId: function(listId, taskseriesId, taskId) {
    return listId + '.' + taskseriesId + '.' + taskId;
  }
};
