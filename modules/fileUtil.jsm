var { OS } = ChromeUtils.import("resource://gre/modules/osfile.jsm")

var { exception } = ChromeUtils.import('resource://todotxt/exception.jsm');
var { TodoTxt } = ChromeUtils.import("resource://todotxt/todotxt.js");
var { todotxtLogger } = ChromeUtils.import("resource://todotxt/logger.jsm");
var { util } = ChromeUtils.import("resource://todotxt/util.jsm");

this.EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  getTodoFile: function(silent_ignore){
    return this.getFilePreference('todo-txt', silent_ignore);
  },

  getDoneFile: function(silent_ignore){
    return this.getFilePreference('done-txt', silent_ignore);
  },

  getFilePreference: function(tag, silent_ignore){
    let prefs = util.getPreferences();

    if(!prefs.prefHasUserValue(tag) && silent_ignore)
      return null;

    else if(!prefs.prefHasUserValue(tag) && !silent_ignore)
      throw exception.FILES_NOT_SPECIFIED();

    else
      return prefs.getCharPref(tag);
  },

  writeTodo: function(todo){
    let prefs = util.getPreferences();

    let todoFile = fileUtil.getTodoFile(false);
    let doneFile = fileUtil.getDoneFile(false);

    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});

    this.writeToFile(todoFile, todoRender);
    this.writeToFile(doneFile, doneRender);
  },

  writeToFile: function(file, input){
    let promise = OS.File.writeAtomic(file, input, {encoding: "utf-8", flush: true});
      let data_array = [];

    let onSucces = function(aVal){
        todotxtLogger.debug("fileUtil.jsm", "written to file");
    }

    let onError = function(aReason){
        throw exception.FILE_CANNOT_WRITE(file);
    }

    promise.then(onSucces, onError);
  },

  readFile: function(file){
    todotxtLogger.debug("fileUtil.jsm", "reading file: "+file);
    let promise = OS.File.read(file, { encoding: 'utf-8' });

    let onSucces = function(result){
      // Verify if str contains newline at end
      if(result.substr(result.length-1) != "\n") result += "\n";
      return result;
    };

    let onError = function(aVal){
      throw exception.FILE_NOT_FOUND(file);
    };

    return promise.then(onSucces, onError);
  },

  calculateMD5: function(){
    let promise = new Promise(function(resolve, reject) {

      let result = "";
      let data_array = [];
      let prefs = util.getPreferences();

      // Use MD5, hash for comparison and needs to be fast not secure
      let ch = Components.classes["@mozilla.org/security/hash;1"].
                          createInstance(Components.interfaces.nsICryptoHash);
      let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                          createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      converter.charset = "UTF-8";

      ch.init(ch.MD5);

      let todoFile = fileUtil.getTodoFile(true);
      let doneFile = fileUtil.getDoneFile(true);

      if (todoFile)
        data_array.push(fileUtil.readFile(todoFile));
      if (doneFile)
        data_array.push(fileUtil.readFile(doneFile));

      Promise.all(data_array).then(function (promiseResult) {
        let parseBlob = "";

        for (var i = 0; i < promiseResult.length; i++)
          parseBlob += promiseResult[i];

        let converterResult = {};
        let data = converter.convertToByteArray(parseBlob, converterResult);
        ch.update(data, data.length);

        result = ch.finish(true);
        todotxtLogger.debug('fileUtil:calculateMD5','hash ['+result+']');

        resolve(result);
      }, function (aError) {
        reject(aError);
      });
    });

    return promise;
  }
}
