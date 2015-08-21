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

		for each(todoItem in todo.items({isComplete: false},'priority')){
			item = cal.createTodo();

			item.title = this.makeStr(todoItem.textTokens());
			item.calendar = calendar;
			item.id = todoItem.id();

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

    newItem.id = todoItem.id();

    if(todoItem.priority() != null)
      newItem.priority = (todoItem.priority().charCodeAt(0)-64)*2;

    newItem.title = this.makeStr(todoItem.textTokens());

    this.writeTodo();
    return newItem;
  },

  modifyItem: function(oldItem, newItem){
    let todo = this.getTodo();
    let found = false;

    for each(todoItem in todo.items()){
      if(todoItem.id() == newItem.id){

          // TODO: add modify of all properties
          todoItem.replaceWith(newItem.title);
          found = true;
          break;
      }
    }

    if(found) 
      this.writeTodo();
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
      this.writeTodo();
    else
      throw Components.Exception("Deleted item not found in Todo.txt",Components.results.NS_ERROR_UNEXPECTED);

  },

  setTodo: function(){
    //TODO: update task list in view
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
        todotxtLogger.debug("todoClient.js: Todo.txt parsed");
      }else
        this.todo = TodoTxt.create();
  },

	writeTodo: function(){
        let todo = this.getTodo();
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                                                        .getService(Components.interfaces.nsIPrefService);
        prefs = prefs.getBranch("extensions.todotxt.");

        todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
        let ostream = FileUtils.openSafeFileOutputStream(todoFile);
        let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                                        createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        converter.charset = "UTF-8";
        let istream = converter.convertToInputStream(todo.render());

        // The last argument (the callback) is optional.
        NetUtil.asyncCopy(istream, ostream, function(status) {
            if (!Components.isSuccessCode(status)) {
                // Handle error!
                return;
            }
        });

        todotxtLogger.debug("todoClient.js: written Todo.txt");
	},
	
  makeStr: function(array){
    let result = "";
    for(let i=0; i<array.length;i++){
      result += array[i];

      if(i != array.length -1)
        result += " ";
    }

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
};
