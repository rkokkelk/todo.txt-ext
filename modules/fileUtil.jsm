Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm")
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/util.jsm');
Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import('resource://todotxt/exception.jsm');
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");

EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  writeTodo: function(todo){
    let prefs = util.getPreferences();

    todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
    doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);

    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});

    this.writeToFile(todoFile, todoRender);
    this.writeToFile(doneFile, doneRender);
  },

  writeToFile: function(file, input){
    let promise = OS.File.writeAtomic(file.path, input, {encoding: "utf-8", flush: true});

    onFulfill = function(aVal){
        todotxtLogger.debug("fileUtil.jsm","written to file");
    }

    onReject = function(aReason){
        throw exception.FILE_CANNOT_WRITE(file);
    }

    promise.then(onFulfill, onReject);
  },

  readFile: function(file){
    let str = this.readInputStream(file);

    let utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
            getService(Components.interfaces.nsIUTF8ConverterService);

    // Verify if str contains newline at end
    if(str.substr(str.length-1) != "\n") str += "\n";
    return utf8Converter.convertURISpecToUTF8(str, "UTF-8");
  },

  getInputStream: function(file){
    if(!file.exists())
      throw exception.FILE_NOT_FOUND(file);

    let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                          createInstance(Components.interfaces.nsIFileInputStream);
    fstream.init(file, 0x01, 0, 0);
    return fstream;
  },

  readInputStream: function(file){
    // TODO: change to OS.File.read
    // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread#OS.File.read()
    let fstream = this.getInputStream(file);
    let bytesAvailable = fstream.available();

    if(bytesAvailable > 0)
      return NetUtil.readInputStreamToString(fstream, bytesAvailable);
    else
      return "";
  },

  getOutputStream: function(file){
    if(!file.exists())
      throw exceptions.FILE_NOT_FOUND(file);
      
    return FileUtils.openSafeFileOutputStream(file);
  },
}
