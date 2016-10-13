/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

EXPORTED_SYMBOLS = ['exception'];

var exception = {

  FILE_NOT_FOUND: function(file){
    return Components.Exception("File does not exists: "+file.leafName,
        Components.results.NS_ERROR_UNEXPECTED);
  },

  FILE_CANNOT_WRITE: function(file){
    return Components.Exception("Cannot write to file: "+file.leafName,
      Components.results.NS_ERROR_UNEXPECTED);
  },

  FILES_NOT_SPECIFIED: function(){
    return Components.Exception("Please specify todo.txt & done.txt in properties",
      Components.results.NS_ERROR_UNEXPECTED);
  },

  ITEM_NOT_FOUND: function(){
    return Components.Exception("Todo task cannot be found in Todo.txt",
      Components.results.NS_ERROR_UNEXPECTED);
  },

  UNKNOWN: function(){
    return Components.Exception("Unknown error occured",
      Components.results.NS_ERROR_UNEXPECTED);
  }
};
