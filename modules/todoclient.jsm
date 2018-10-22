/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import('resource://todotxt/util.jsm');
Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import('resource://todotxt/exception.jsm');
Components.utils.import('resource://todotxt/fileUtil.jsm');
Components.utils.import("resource://todotxt/todotxt.js");

this.EXPORTED_SYMBOLS = ['todoClient'];

let todoClient = {

  // Start with empty todo
  todo: TodoTxt.parseFile(""),

  getInterface: cal.InterfaceRequestor_getInterface,

  getItems: function(calendar,refresh){
    let items = [];
    let todo = this.getTodo(calendar, refresh);
    let prefs = util.getPreferences();
    let tzService = cal.getTimezoneService();

    var todoItems = todo.items({},'priority');
    for (let i=0; i < todoItems.length; i++){
      let todoItem = todoItems[i];
      let item = cal.createTodo();

      item.id = todoItem.id();
      item.calendar = calendar;
      item.title = util.makeTitle(todoItem);
      item.isCompleted = todoItem.isComplete();

      if(prefs.getBoolPref("thunderbird")){
        if(!prefs.getBoolPref('showFullTitle')){
          let projects = todoItem.projects().map(function(item){
            if(item.charAt(0) === '+')
              item = item.substr(1);
            return item;
          });
          item.setCategories(projects.length,projects);

          // Set contexts
          let contexts = todoItem.contexts();
          let str_context = util.makeStr(contexts);
          item.setProperty('location', str_context);
        }

        if(todoItem.priority())
          item.priority = util.calPriority(todoItem.priority());

        // Define due date
        let addons = todoItem.addons();
        if(addons['due']){
          if (Array.isArray(addons['due'])){
            for (let b=0; b < addons['due'].length; b++){
              try{
                let jsDueDate = util.parseDate(addons['due'][b]);
                jsDueDate.setHours(0,0,0);
                let dueDate = cal.dtz.jsDateToDateTime(jsDueDate, cal.dtz.defaultTimezone);
                item.dueDate = dueDate;
              }catch(e){
                todotxtLogger.error('todoclient.jsm:getItems','Invalid due date: '+addons['due'][b])
              }
            }
          } else {
            let jsDueDate = util.parseDate(addons['due']);
            jsDueDate.setHours(0,0,0);
            let dueDate = cal.dtz.jsDateToDateTime(jsDueDate, cal.dtz.defaultTimezone);
            item.dueDate = dueDate;
          }
        }

        // Set creation date
        if(todoItem.createdDate() && prefs.getBoolPref("creation")){
          let createDate = cal.dtz.jsDateToDateTime(todoItem.createdDate(), cal.dtz.defaultTimezone);
          item.entryDate = createDate;
        }

        // Set complete date
        if(todoItem.isComplete() && todoItem.completedDate()){
          let dateTime = cal.dtz.jsDateToDateTime(todoItem.completedDate(), cal.dtz.defaultTimezone);
          item.completedDate = dateTime;
        }
      }

      items.push(item);
    }
    return items;
  },

  addItem: function(newItem){
    let todo = this.getTodo();
    let found = false;
    let prefs = util.getPreferences();
    let todoItem = todo.addItem(newItem.title, prefs.getBoolPref("creation"));

    if(prefs.getBoolPref("thunderbird")){

      if(todoItem.priority())
        newItem.priority = util.calPriority(todoItem.priority());

      if(!prefs.getBoolPref('showFullTitle')){

        let projects = todoItem.projects().map(function(item){
          if(item.charAt(0) === '+')
            item = item.substr(1);
          return item;
        });
        newItem.setCategories(projects.length,projects);
        
        // Set contexts
        let contexts = todoItem.contexts();
        let strContext = util.makeStr(contexts);
        newItem.setProperty('location', strContext);
      }

      // Set creation date
      if(todoItem.createdDate() && prefs.getBoolPref("creation")){
        let createDate = cal.dtz.jsDateToDateTime(todoItem.createdDate(), cal.dtz.defaultTimezone);
        newItem.entryDate = createDate;
      }

      // Set due date
      if(newItem.dueDate){
        let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.dtz.defaultTimezone);
        let dateStr = util.makeDateStr(dueDate);
        todoItem.setAddOn('due', dateStr);
      }
    }

    newItem.id = todoItem.id();
    newItem.title = util.makeTitle(todoItem);

    fileUtil.writeTodo(todo);
    return newItem;
  },

  modifyItem: function(oldItem, newItem){
    let todo = this.getTodo();
    let prefs = util.getPreferences();

    var todoItems = todo.items({},'priority');
    for (let i=0; i < todoItems.length; i++){
      let todoItem = todoItems[i];
      if(todoItem.id() == oldItem.id){

          let parseItem = newItem.title;

          // Verify if priorty is altered
          // ToDo: verify if statement correct
          if(newItem.priority && newItem.priority != 0){
            let pri = util.calPriority(newItem.priority);
            if(pri)
              parseItem = '('+pri+') '+parseItem;
          }

          todoItem.replaceWith(parseItem);

          if(newItem.dueDate){
            let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.dtz.defaultTimezone);
            let dateStr = util.makeDateStr(dueDate);
            todoItem.setAddOn('due', dateStr);
          } else
            todoItem.removeAddOn('due');

          // Verify if property is set to true and createTime is present then
          // add creationDate
          if(newItem.entryDate && prefs.getBoolPref("creation")){
            let xpConnectDate = cal.dateTimeToJsDate(newItem.entryDate, cal.dtz.defaultTimezone);
            todoItem.setCreatedDate(xpConnectDate);
          }

          if(!prefs.getBoolPref('showFullTitle')){
            // add new contexts
            let newContexts = util.makeArray(newItem.getProperty('location'));
            for(let j=0; j<newContexts.length; j++)
              todoItem.addContext(newContexts[j]);
          }

          // Verify if completed changed
          if(newItem.isCompleted)
            todoItem.completeTask();
          else
            todoItem.uncompleteTask();

          if(!prefs.getBoolPref('showFullTitle')){
            let projects = newItem.getCategories({},{});
            for(let b=0; b < projects.length; b++)
              todoItem.addProject(projects[b]);
          }

          fileUtil.writeTodo(todo);
          return todoItem.id();
      }
    }

    throw exception.ITEM_NOT_FOUND();
  },

  deleteItem: function(item){
    let todo = this.getTodo();
    let found = false;

    var todoItems = todo.items({},'priority');
    for (let i=0; i < todoItems.length; i++){
      let todoItem = todoItems[i];
      if(todoItem.id() == item.id){
          todo.removeItem(todoItem);
          fileUtil.writeTodo(todo);
          return;
      }
    }
    
    throw exception.ITEM_NOT_FOUND();
  },

  getTodo: function(calendar, refresh){

    if(refresh){
      this.setTodo().then((todo) => {
        todoClient.todo = todo;
        calendar.observers.notify("onLoad", [calendar]);
      }).catch((error) => {
        throw exception.UNKNOWN();
      });
    }

    return this.todo;
  },

  setTodo: function(){
    return new Promise((resolve, reject) => {
      let data_array = [];
      let prefs = util.getPreferences();

      // Set empty todo object to prevent warning
      // obj will be replaced once files ar read
      todoClient.todo = TodoTxt.parseFile("");

      let todoFile = fileUtil.getTodoFile(true);
      let doneFile = fileUtil.getDoneFile(true);

      if (todoFile)
        data_array.push(fileUtil.readFile(todoFile));
      if (doneFile)
        data_array.push(fileUtil.readFile(doneFile));

      Promise.all(data_array).then(function (result) {
        let parseBlob = "";

        for (var i = 0; i < result.length; i++)
          parseBlob += result[i];

        todotxtLogger.debug("readFiles","parseBlob [\n"+parseBlob+"]");
        resolve(TodoTxt.parseFile(parseBlob));
      }, function (aError) {
        todotxtLogger.error("todoclient:setTodo", aError);
        reject(aError);
      });
    });
  },
};
