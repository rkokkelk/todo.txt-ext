/* Todo.txt add-on for Thunderbird email application.
 * Copyright (C) 2017 Roy Kokkelkoren
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA. */

const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://calendar/modules/calUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import('resource://todotxt/util.jsm');
Cu.import('resource://todotxt/logger.jsm');
Cu.import('resource://todotxt/exception.jsm');
Cu.import('resource://todotxt/fileUtil.jsm');
Cu.import("resource://todotxt/todo-txt-js/todotxt.js");

EXPORTED_SYMBOLS = ['todoClient'];

let todoClient = {

  todo: null,

  getInterface: cal.InterfaceRequestor_getInterface,

  getTodo: function(refresh){
    if(!this.todo || refresh){
      this.setTodo();
    }
    return this.todo;
  },

  getItems: function(calendar,refresh){
    let items = [];
    let todo = this.getTodo(refresh);
    let prefs = util.getPreferences();
    let tzService = cal.getTimezoneService();

    for each(todoItem in todo.items({},'priority')){
      item = cal.createTodo();

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
          // jsDueDate is parsed to 01:00:00, 
          // because no time is used set back to 00:00:00
          let jsDueDate = util.parseDate(addons['due']);
          jsDueDate.setHours(0,0,0);
          let dueDate = cal.jsDateToDateTime(jsDueDate, cal.calendarDefaultTimezone());
          item.dueDate = dueDate;
        }

        // Set creation date
        if(todoItem.createdDate() && prefs.getBoolPref("creation")){
          createDate = cal.jsDateToDateTime(todoItem.createdDate(), cal.calendarDefaultTimezone());
          item.entryDate = createDate;
        }

        // Set complete date
        if(todoItem.isComplete() && todoItem.completedDate()){
          dateTime = cal.jsDateToDateTime(todoItem.completedDate(), cal.calendarDefaultTimezone());
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
        createDate = cal.jsDateToDateTime(todoItem.createdDate(), cal.calendarDefaultTimezone());
        newItem.entryDate = createDate;
      }

      // Set due date
      if(newItem.dueDate){
        let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.calendarDefaultTimezone());
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

    for each(todoItem in todo.items()){
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
            let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.calendarDefaultTimezone());
            let dateStr = util.makeDateStr(dueDate);
            todoItem.setAddOn('due', dateStr);
          }else{
            todoItem.removeAddOn('due');
          }

          // Verify if property is set to true and createTime is present then
          // add creationDate
          if(newItem.entryDate && prefs.getBoolPref("creation")){
            let jsDate = cal.dateTimeToJsDate(newItem.entryDate, cal.calendarDefaultTimezone());
            todoItem.setCreatedDate(jsDate);
          }

          if(!prefs.getBoolPref('showFullTitle')){
            // add new contexts
            newContexts = util.makeArray(newItem.getProperty('location'));
            for(let j=0; j<newContexts.length; j++){
              todoItem.addContext(newContexts[j]);
            }
          }

          // Verify if completed changed
          if(newItem.isCompleted)
            todoItem.completeTask();
          else
            todoItem.uncompleteTask();

          if(!prefs.getBoolPref('showFullTitle')){
            projects = newItem.getCategories({},{});
            for(var i=0;i<projects.length;i++){
              todoItem.addProject(projects[i]);
            }
          }

          fileUtil.writeTodo(todo);
          return todoItem.id();
      }
    }

    throw exception.ITEM_NOT_FOUND();
  },

  deleteItem: function(item){
    let todo = util.getTodo();
    let found = false;
    for each(todoItem in todo.items()){
      if(todoItem.id() == item.id){
          todo.removeItem(todoItem);
          fileUtil.writeTodo(todo);
          return;
      }
    }
    
    throw exception.ITEM_NOT_FOUND();
  },

  setTodo: function(){
    let parseBlob = "";
    let prefs = util.getPreferences();

    if(!prefs.prefHasUserValue('todo-txt') || !prefs.prefHasUserValue('done-txt'))
      throw exception.FILES_NOT_SPECIFIED();

    todoFile = prefs.getComplexValue("todo-txt", Ci.nsIFile);
    doneFile = prefs.getComplexValue("done-txt", Ci.nsIFile);

    parseBlob += fileUtil.readFile(todoFile);
    parseBlob += fileUtil.readFile(doneFile);
    todotxtLogger.debug("readFiles","parseBlob [\n"+parseBlob+"]");

    this.todo = TodoTxt.parseFile(parseBlob);
  },
};
