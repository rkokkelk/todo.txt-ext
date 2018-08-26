Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm")
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/util.jsm');
Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import('resource://todotxt/exception.jsm');
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");

EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  getTodoFile: function(silent_ignore){
    return this.getFilePreference('todo-txt', silent_ignore);
  }

  getDoneFile: function(silent_ignore){
    return this.getFilePreference('done-txt', silent_ignore);
  }

  getFilePreference: function(tag, silent_ignore){
    let prefs = util.getPreferences();

    if(!prefs.prefHasUserValue(tag) && silent_ignore)
      return null;

    else if(!prefs.prefHasUserValue(tag) && silent_ignore)
      throw exception.FILES_NOT_SPECIFIED();

    else{
      return prefs.getComplexValue(tag, Components.interfaces.nsIFile);
    }
  }

  writeTodo: function(todo){
    let prefs = util.getPreferences();

    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});

    this.writeToFile(this.getTodoFile(false), todoRender);
    this.writeToFile(this.getDoneFile(false), doneRender);
  },

  writeToFile: function(file, input){
    let promise = OS.File.writeAtomic(file.path, input, {encoding: "utf-8", flush: true});

    onSucces = function(aVal){
        todotxtLogger.debug("fileUtil.jsm", "written to file");
    }

    onError = function(aReason){
        throw exception.FILE_CANNOT_WRITE(file);
    }

    promise.then(onSucces, onError);
  },

  readFile: function(file){
    let promise = OS.File.read(file.path, { encoding: 'utf-8' });

    onSucces = function(result){
      // Verify if str contains newline at end
      if(result.substr(result.length-1) != "\n") result += "\n";
      return result;
    };

    onError = function(aVal){
      throw exception.FILE_NOT_FOUND(file);
    };

    return promise.then(onSucces, onError);
  },
}
