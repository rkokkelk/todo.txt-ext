Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import("resource://todotxt/todo-txt-js/todotxt.js");

EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  writeTodo: function(todo){
    let prefs = this.getPreferences();

    todoFile = prefs.getComplexValue("todo-txt", Components.interfaces.nsIFile);
    doneFile = prefs.getComplexValue("done-txt", Components.interfaces.nsIFile);

    oTodoStream = self.createOutputStream(todoFile);
    odoneStream = self.createOutputStream(doneFile);

    let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                                    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});
    let iTodoStream = converter.convertToInputStream(todoRender);
    let iDoneStream = converter.convertToInputStream(doneRender);

    writeCallback = function(status){
        if (Components.isSuccessCode(status))
          todotxtLogger.debug("fileUtil.jsm","written to file");
        else
          throw Components.Exception("Cannot write to file",Components.results.NS_ERROR_UNEXPECTED);
    };

    NetUtil.asyncCopy(iTodoStream, oTodoStream, writeCallback);
    NetUtil.asyncCopy(iDoneStream, oDoneStream, writeCallback);
  },

  readFile: function(file){
    let str = this.readInputStream(file);

    let utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
            getService(Components.interfaces.nsIUTF8ConverterService);

    // Verify if str contains newline at end
    if(str.substr(str.length-1) != "\n") str += "\n";
    return utf8Converter.convertURISpecToUTF8(str, "UTF-8");
  },

  readInputStream: function(file){
    if(!file.exists()){
      throw Components.Exception("File ["+file.leafName+"] does not exists",
          Components.results.NS_ERROR_UNEXPECTED);
    }

    let fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                          createInstance(Components.interfaces.nsIFileInputStream);
    fstream.init(file, -1, 0, 0);
    let bytesAvailable = fstream.available();

    if(bytesAvailable > 0)
      return NetUtil.readInputStreamToString(fstream, bytesAvailable);
    else
      return "";
  },

  createOutputStream: function(file){
    if(!file.exists()){
      throw Components.Exception("File ["+file.leafName+"] does not exists",
          Components.results.NS_ERROR_UNEXPECTED);
    }
      
    return FileUtils.openSafeFileOutputStream(file);
  },

  fileExists: function(file){
  }
}
