Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");


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
    let prefs = this.getPreferences();
    let tzService = cal.getTimezoneService();

    for each(todoItem in todo.items({},'priority')){
      item = cal.createTodo();

      item.id = todoItem.id();
      item.calendar = calendar;
      item.title = this.makeTitle(todoItem);
      item.isCompleted = todoItem.isComplete();

      if(prefs.getBoolPref("thunderbird")){
        let projects = todoItem.projects().map(function(item){
          if(item.charAt(0) === '+')
            item = item.substr(1);
          return item;
        });
        item.setCategories(projects.length,projects);

        if(todoItem.priority())
          item.priority = this.calPriority(todoItem.priority());

        // Set contexts
        let contexts = todoItem.contexts();
        let str_context = this.makeStr(contexts);
        item.setProperty('location', str_context);

        // Define due date
        let addons = todoItem.addons();
        if(addons['due']){
          // jsDueDate is parsed to 01:00:00, 
          // because no time is used set back to 00:00:00
          let jsDueDate = this.parseDate(addons['due']);
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
    let prefs = this.getPreferences();
    let todoItem = todo.addItem(newItem.title, prefs.getBoolPref("creation"));

    if(prefs.getBoolPref("thunderbird")){

      if(todoItem.priority())
        newItem.priority = this.calPriority(todoItem.priority());

      let projects = todoItem.projects().map(function(item){
        if(item.charAt(0) === '+')
          item = item.substr(1);
        return item;
      });
      newItem.setCategories(projects.length,projects);
      
      // Set contexts
      let contexts = todoItem.contexts();
      let strContext = this.makeStr(contexts);
      newItem.setProperty('location', strContext);

      // Set creation date
      if(todoItem.createdDate() && prefs.getBoolPref("creation")){
        createDate = cal.jsDateToDateTime(todoItem.createdDate(), cal.calendarDefaultTimezone());
        newItem.entryDate = createDate;
      }

      // Set due date
      if(newItem.dueDate){
        let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.calendarDefaultTimezone());
        let dateStr = this.makeDateStr(dueDate);
        todoItem.setAddOn('due', dateStr);
      }
    }

    newItem.id = todoItem.id();
    newItem.title = this.makeTitle(todoItem);

    this.writeTodo(todo);
    return newItem;
  },

  modifyItem: function(oldItem, newItem){
    let todo = this.getTodo();
    let prefs = this.getPreferences();

    for each(todoItem in todo.items()){
      if(todoItem.id() == oldItem.id){

          let parseItem = newItem.title;

          // Verify if priorty is altered
          // ToDo: verify if statement correct
          if(newItem.priority && newItem.priority != 0){
            let pri = this.calPriority(newItem.priority);
            if(pri)
              parseItem = '('+pri+') '+parseItem;
          }

          todoItem.replaceWith(parseItem);

          if(newItem.dueDate){
            let dueDate = cal.dateTimeToJsDate(newItem.dueDate, cal.calendarDefaultTimezone());
            let dateStr = this.makeDateStr(dueDate);
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
          // add new contexts
          newContexts = this.makeArray(newItem.getProperty('location'));
          for(let j=0; j<newContexts.length; j++){
            todoItem.addContext(newContexts[j]);
          }

          // Verify if completed changed
          if(newItem.isCompleted)
            todoItem.completeTask();
          else
            todoItem.uncompleteTask();

          projects = newItem.getCategories({},{});
          for(var i=0;i<projects.length;i++){
            todoItem.addProject(projects[i]);
          }

          this.writeTodo(todo);
          return todoItem.id();
      }
    }

    throw Components.Exception("Modify item not found in Todo.txt",Components.results.NS_ERROR_UNEXPECTED);
  },

  deleteItem: function(item){
    let todo = this.getTodo();
    let found = false;
    for each(todoItem in todo.items()){
      if(todoItem.id() == item.id){
          todo.removeItem(todoItem);
          this.writeTodo(todo);
          return;
      }
    }
    throw Components.Exception("Deleted item not found in Todo.txt",Components.results.NS_ERROR_UNEXPECTED);
  },

  setTodo: function(){
      let parseBlob = "";
      let prefs = this.getPreferences();


      if(!prefs.prefHasUserValue('todo-txt') || !prefs.prefHasUserValue('done-txt'))
          throw Components.Exception("Please specify files in properties",Components.results.NS_ERROR_UNEXPECTED);

      todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
      doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);

      parseBlob += this.readFile(todoFile);
      parseBlob += this.readFile(doneFile);
      todotxtLogger.debug("readFiles","parseBlob [\n"+parseBlob+"]");

      this.todo = TodoTxt.parseFile(parseBlob);
  },

  writeTodo: function(todo){
        let prefs = this.getPreferences();

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);

        if(!todoFile.exists())
          throw Components.Exception("todo.txt file does not exists",Components.results.NS_ERROR_UNEXPECTED);
        if(!doneFile.exists())
          throw Components.Exception("done.txt file does not exists",Components.results.NS_ERROR_UNEXPECTED);
          
        let oTodoStream = FileUtils.openSafeFileOutputStream(todoFile);
        let oDoneStream = FileUtils.openSafeFileOutputStream(doneFile);
        let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                                        createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        let todoRender = todo.render({isComplete:false});
        let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});
        let iTodoStream = converter.convertToInputStream(todoRender);
        let iDoneStream = converter.convertToInputStream(doneRender);

        writeCallback = function(status){
            if (Components.isSuccessCode(status))
              todotxtLogger.debug("todoClient.js","written to file");
            else
              throw Components.Exception("Cannot write to file",Components.results.NS_ERROR_UNEXPECTED);
        };

        NetUtil.asyncCopy(iTodoStream, oTodoStream, writeCallback);
        NetUtil.asyncCopy(iDoneStream, oDoneStream, writeCallback);
  },

  readFile: function(file){
    let str = "";

    if(!file.exists())
      throw Components.Exception("File["+file.leafName+"] does not exists",
          Components.results.NS_ERROR_UNEXPECTED);

    let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                          createInstance(Components.interfaces.nsIFileInputStream);
    let utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
            getService(Components.interfaces.nsIUTF8ConverterService);

    fstream.init(file, -1, 0, 0);
    let bytesAvailable = fstream.available();

    if(bytesAvailable > 0)
      str = NetUtil.readInputStreamToString(fstream, bytesAvailable);

    // Verify if str contains newline at end
    if(str.substr(str.length-1) != "\n") str += "\n";
    return utf8Converter.convertURISpecToUTF8(str, "UTF-8");
  },

  makeTitle: function(item){
    let itemTitle = "";
    let prefs = this.getPreferences();

    if(prefs.getBoolPref("thunderbird"))
      itemTitle = this.makeStr(item.textTokens());
    else
      itemTitle = item.render();
    
    return itemTitle;
  },

  makeArray:function(string){
    let result = [];

    if(!string) return result;
    tmp_result = string.split(' ');

    for(let i=0; i<tmp_result.length;i++){
      tmp_word = tmp_result[i].trim();
      if (tmp_word) result.push(tmp_word);
    }
    return result;
  },

  makeStr:function(array, separator){
    let result = "";
    if(separator == undefined) separator = ' ';
    for(let i=0; i<array.length;i++){
      result += array[i];

      if(i != array.length -1)
        result += separator;
    }
    return result;
  },

  getPreferences: function(){
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.todotxt.");
    return prefs;
  },
  
  makeDateStr: function(date) {
    let day = date.getDate();
    let month = (date.getMonth()+1);

    day = (day < 10) ? '0' + day : day;
    month = (month < 10) ? '0' + month : month;
    
    return date.getFullYear() + '-' + month + '-' + day;
  },
  
  makeTimeStr: function(date) {
    let hour = (date.hour < 10) ? '0' + date.hour : date.hour;
    let minute = (date.minute < 10) ? '0' + date.minute : date.minute;
    
    return hour + ':' + minute;
  },
  // Due to errors parsing ISO format in accordance with local time,
  // use the following function to parse String dates
  // parse a date in yyyy-mm-dd format
  parseDate: function(input) {
    var parts = input.split('-');
    return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
  },

  // Priority 
  // A --> 1, High
  // B --> 2, Normal
  // C --> 3, Low
  calPriority: function(pri){
    if(typeof pri === 'string'){
      let p = pri.charAt(0);
      switch(p){
        case "A":
          return 1
        case "B":
            return 5;
        case "C":
            return 9;
        default:
            return 0;
      }
    } else if (typeof pri === 'number'){
      switch(pri){
        case 1:
          return 'A';
        case 5:
          return 'B';
        case 9:
          return 'C';
        default:
          return null;
      }
    }else
      throw Components.Exception("Priority Parser error",Components.results.NS_ERROR_UNEXPECTED);
  },
};
