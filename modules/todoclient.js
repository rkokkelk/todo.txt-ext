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
		let todo = this.getTodo(refresh);
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

			if(todoItem.priority())
     		item.priority = this.calPriority(todoItem.priority());

			items.push(item);
		}
		return items;
	},

  addItem: function(newItem){
    let todo = this.getTodo();
    let found = false;

    let todoItem = todo.addItem(newItem.title);
    todoItem.setCreatedDate(null);

    if(todoItem.priority())
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
    let found = false;
    let todo = this.getTodo();

    for each(todoItem in todo.items()){
      if(todoItem.id() == oldItem.id){

          let parseItem = newItem.title;
    			
          // Verify if priorty is altered
          if(newItem.priority && newItem.priority != 0){
            let pri = this.calPriority(newItem.priority);
            if(pri)
	            parseItem = '('+pri+') '+parseItem;
          }

          todoItem.replaceWith(parseItem);

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

          found = true;
          break;
      }
    }

    if(found){
      this.writeTodo(todo);
    	return todoItem.id();
		}else
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
			let parseBlob = "";

			if(prefs.prefHasUserValue('todo-txt')){

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                              createInstance(Components.interfaces.nsIFileInputStream);

        fstream.init(todoFile, -1, 0, 0);
        let data = NetUtil.readInputStreamToString(fstream, fstream.available());
        parseBlob += data;
      } 

			if(prefs.prefHasUserValue('done-txt')){

        doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);
        let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                              createInstance(Components.interfaces.nsIFileInputStream);

        fstream.init(doneFile, -1, 0, 0);
        let data = NetUtil.readInputStreamToString(fstream, fstream.available());
        parseBlob += "\n"+data;
      } 

      this.todo = TodoTxt.parseFile(parseBlob);
  },

	writeTodo: function(todo){
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                                        .getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.todotxt.");

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);
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
