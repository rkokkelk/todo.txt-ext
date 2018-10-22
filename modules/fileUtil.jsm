Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm")
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Components.utils.import('resource://todotxt/util.jsm');
Components.utils.import('resource://todotxt/logger.jsm');
Components.utils.import('resource://todotxt/exception.jsm');
Components.utils.import("resource://todotxt/todotxt.js");

this.EXPORTED_SYMBOLS = ['fileUtil'];

let fileUtil = {

  writeTodo: function(todo){
    let prefs = util.getPreferences();

    let todoFile = prefs.getCharPref("todo-txt");
    let doneFile = prefs.getCharPref("done-txt");

    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});

    this.writeToFile(todoFile, todoRender);
    this.writeToFile(doneFile, doneRender);
  },

  writeToFile: function(file, input){
    let promise = OS.File.writeAtomic(file, input, {encoding: "utf-8", flush: true});

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
      let prefs = util.getPreferences();

      // Use MD5, hash for comparison and needs to be fast not secure
      let ch = Components.classes["@mozilla.org/security/hash;1"].
                          createInstance(Components.interfaces.nsICryptoHash);
      let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                          createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      converter.charset = "UTF-8";

      ch.init(ch.MD5);

      let todoFile = prefs.getCharPref("todo-txt");
      let doneFile = prefs.getCharPref("done-txt");

      Promise.all([fileUtil.readFile(todoFile), fileUtil.readFile(doneFile)]).then(function (promiseResult) {
        let parseBlob = "";
        parseBlob += promiseResult[0];
        parseBlob += promiseResult[1];

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
