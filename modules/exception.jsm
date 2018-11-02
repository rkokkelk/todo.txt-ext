/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Components.utils.import("resource://gre/modules/Services.jsm");

this.EXPORTED_SYMBOLS = ['exception'];

var exception = {
  
  // Randomize URI to work around bug 719376
  strings: Services.strings.createBundle('chrome://todotxt/locale/exceptions.properties?'+Math.random()),

  FILE_NOT_FOUND: function(file){
    let message = this.strings.GetStringFromName('FILE_NOT_FOUND') + ' ' + file.leafName;

    return Components.Exception(message,
        Components.results.NS_ERROR_UNEXPECTED);
  },

  FILE_CANNOT_WRITE: function(file){
    let message = this.strings.GetStringFromName('FILE_CANNOT_WRITE') + ' ' + file.leafName;

    return Components.Exception(message,
      Components.results.NS_ERROR_UNEXPECTED);
  },

  FILES_NOT_SPECIFIED: function(){
    let message = this.strings.GetStringFromName('FILES_NOT_SPECIFIED')

    return Components.Exception(message,
      Components.results.NS_ERROR_UNEXPECTED);
  },

  ITEM_NOT_FOUND: function(){
    let message = this.strings.GetStringFromName('ITEM_NOT_FOUND')

    return Components.Exception(message,
      Components.results.NS_ERROR_UNEXPECTED);
  },

  EVENT_ENCOUNTERED: function(){
    let message = this.strings.GetStringFromName('EVENT_ENCOUNTERED')

    return Components.Exception(message,
      Components.results.NS_ERROR_UNEXPECTED);
  },

  UNKNOWN: function(){
    let message = this.strings.GetStringFromName('UNKNOWN')

    return Components.Exception(message,
      Components.results.NS_ERROR_UNEXPECTED);
  }
};
