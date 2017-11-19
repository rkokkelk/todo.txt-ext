/* Todo.txt add-on for Thunderbird email application.
 * Copyright (C) 2017 Roy Kokkelkoren
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA. */

const Cc = Components.classes
const Cu = Components.utils
const Ci = Components.interfaces

Cu.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

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

    let todoRender = todo.render({isComplete:false});
    let doneRender = todo.render({isComplete:true},{field: 'completedDate', direction: TodoTxt.SORT_DESC});

    this.writeToFile(todoFile, todoRender);
    this.writeToFile(doneFile, doneRender);
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
