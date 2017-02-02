const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");

Cu.import('resource://todotxt/util.jsm');
Cu.import('resource://todotxt/logger.jsm');
Cu.import('resource://todotxt/exception.jsm');
Cu.import("resource://todotxt/todo-txt-js/todotxt.js");

EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  writeTodo: function(todo){
    let prefs = util.getPreferences();

    todoFile = prefs.getComplexValue("todo-txt", Ci.nsIFile);
    doneFile = prefs.getComplexValue("done-txt", Ci.nsIFile);

    oTodoStream = this.getOutputStream(todoFile);
    oDoneStream = this.getOutputStream(doneFile);

    let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
                                    createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});
    let iTodoStream = converter.convertToInputStream(todoRender);
    let iDoneStream = converter.convertToInputStream(doneRender);

    writeCallback = function(status){
        if (Components.isSuccessCode(status))
          todotxtLogger.debug("fileUtil.jsm","written to file");
        else
         throw exception.FILE_CANNOT_WRITE(file);
    };

    NetUtil.asyncCopy(iTodoStream, oTodoStream, writeCallback);
    NetUtil.asyncCopy(iDoneStream, oDoneStream, writeCallback);
  },

  readFile: function(file){
    let str = this.readInputStream(file);

    let utf8Converter = Cc["@mozilla.org/intl/utf8converterservice;1"].
            getService(Ci.nsIUTF8ConverterService);

    // Verify if str contains newline at end
    if(str.substr(str.length-1) != "\n") str += "\n";
    return utf8Converter.convertURISpecToUTF8(str, "UTF-8");
  },

  getInputStream: function(file){
    if(!file.exists())
      throw exception.FILE_NOT_FOUND(file);

    let fstream = Cc["@mozilla.org/network/file-input-stream;1"].
                          createInstance(Ci.nsIFileInputStream);
    fstream.init(file, 0x01, 0, 0);
    return fstream;
  },

  readInputStream: function(file){
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
