Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/modules/logger.jsm');
Components.utils.import("resource://todotxt/modules/todo-txt-js/todotxt.js");


EXPORTED_SYMBOLS = ['todoClient'];

let todoClient = {

	todo: null,

  getInterface: cal.InterfaceRequestor_getInterface,

  getTodo: function(){
  
    if(!this.todo){
      this.setTodo();
    }
    return this.todo;
  },

	getItems: function(calendar){
		let todo = this.getTodo();
		let items = [];
		let tzService = cal.getTimezoneService();

		for each(todoItem in todo.items({},'priority')){
			item = cal.createTodo();

    	item.title = this.makeTitle(todoItem);
			item.calendar = calendar;
			item.id = todoItem.id();

			item.isCompleted = todoItem.isComplete();
			let projects = todoItem.projects().map(function(item){
				if(item.charAt(0) === '+')
					item = item.substr(1);
				return item;
			});
			item.setCategories(projects.length,projects);

			if(todoItem.priority() != null)
				item.priority = (todoItem.priority().charCodeAt(0)-64)*2;

			items.push(item);
		}
		return items;
	},

  addItem: function(newItem){
    let todo = this.getTodo();
    let found = false;

    let todoItem = todo.addItem(newItem.title);
    todoItem.setCreatedDate(null);

    if(todoItem.priority() != null)
      newItem.priority = this.calPriority(todoItem.priority());

		let projects = todoItem.projects().map(function(item){
			if(item.charAt(0) === '+')
				item = item.substr(1);
			return item;
		});
		newItem.setCategories(projects.length,projects);

    newItem.id = todoItem.id();
    newItem.title = this.makeTitle(todoItem);

    this.writeTodo(todo);
    return newItem;
  },

  modifyItem: function(oldItem, newItem){
    let todo = this.getTodo();
    let found = false;

    for each(todoItem in todo.items()){
      if(todoItem.id() == newItem.id){

          todoItem.replaceWith(newItem.title);

          // Verify if priorty is altered
          /*if(newItem.priority != null && newItem.priority != 0){
            //TODO: parse Contexts & Projects
            pri = this.calPriority(newItem.priority);
            parseItem = '('+pri+') '+this.makeStr(todoItem.textTokens());
            todo.removeItem(todoItem);
            todoItem = todo.addItem(parseItem);
          }*/

          // Verify if completed changed
          if(newItem.isCompleted)
            todoItem.completeTask();
          else
            todoItem.uncompleteTask();

					let contexts;
					projects = newItem.getCategories({},{});

					for(var i=0;i<projects.length;i++){
						todoItem.addProject(projects[i]);
					}

          todotxtLogger.debug("todoClient.js: modify Item "+todoItem.render());
          found = true;
          break;
      }
    }

    if(found) 
      this.writeTodo(todo);
    else
      throw Components.Exception("Modify item not found in Todo.txt",Components.results.NS_ERROR_UNEXPECTED);
  },

  deleteItem: function(item){
    let todo = this.getTodo();
    let found = false;
    for each(todoItem in todo.items()){
      if(todoItem.id() == item.id){
          todo.removeItem(todoItem);
          found = true;
          break;
      }
    }

    if(found) 
      this.writeTodo(todo);
    else
      throw Components.Exception("Deleted item not found in Todo.txt",Components.results.NS_ERROR_UNEXPECTED);

  },

  setTodo: function(){
       var prefs = Components.classes["@mozilla.org/preferences-service;1"]
															.getService(Components.interfaces.nsIPrefService);
			prefs = prefs.getBranch("extensions.todotxt.");

			if(prefs.prefHasUserValue('todo-txt')){

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                              createInstance(Components.interfaces.nsIFileInputStream);

        fstream.init(todoFile, -1, 0, 0);
        let data = NetUtil.readInputStreamToString(fstream, fstream.available());
        this.todo = TodoTxt.parseFile(data);
        todotxtLogger.debug("todoClient.js: "+todoFile.leafName+" parsed");
      }else
        this.todo = TodoTxt.create();
  },

	writeTodo: function(todo){
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                                        .getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.todotxt.");

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        let ostream = FileUtils.openSafeFileOutputStream(todoFile);
        let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                                        createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        let todoRender = todo.render({});
        let istream = converter.convertToInputStream(todoRender);

        // The last argument (the callback) is optional.
        NetUtil.asyncCopy(istream, ostream, function(status) {
            if (!Components.isSuccessCode(status)) {
                // Handle error!
                return;
            }
        });

        todotxtLogger.debug("todoClient.js: written Todo.txt, "+todoRender);
	},
	

	makeTitle: function(item){

		makeStr = function(array){
			let result = "";
			for(let i=0; i<array.length;i++){
				result += array[i];

				if(i != array.length -1)
					result += " ";
			}
			return result;
		}

		let result = makeStr(item.textTokens());

		let contexts = item.contexts();
		if(contexts.length > 0)
			result += " "+makeStr(contexts);
		
		return result;
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

  calPriority: function(pri){
    if(typeof pri === 'string'){
		  return (pri.charCodeAt(0)-64)*2;
    } else if (typeof pri === 'number'){
      charCode = pri + 64;
      if(charCode > 90)
        charCode = 90;
      todotxtLogger.debug("todoClient.js: ("+pri+") "+charCode);

      return String.fromCharCode(charCode);
    }else
      throw Components.Exception("Priority Parser error",Components.results.NS_ERROR_UNEXPECTED);
  },
};
