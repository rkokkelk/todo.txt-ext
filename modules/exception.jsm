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

const Cu = Components.utils
const Cr = Components.results

Cu.import("resource://gre/modules/Services.jsm");

this.EXPORTED_SYMBOLS = ['exception'];

var exception = {
  
  // Randomize URI to work around bug 719376
  strings: Services.strings.createBundle('chrome://todotxt/locale/exceptions.properties?'+Math.random()),

  FILE_NOT_FOUND: function(file){
    let message = this.strings.GetStringFromName('FILE_NOT_FOUND') + ' ' + file.leafName;

    return Components.Exception(message,
        Cr.NS_ERROR_UNEXPECTED);
  },

  FILE_CANNOT_WRITE: function(file){
    let message = this.strings.GetStringFromName('FILE_CANNOT_WRITE') + ' ' + file.leafName;

    return Components.Exception(message,
      Cr.NS_ERROR_UNEXPECTED);
  },

  FILES_NOT_SPECIFIED: function(){
    let message = this.strings.GetStringFromName('FILES_NOT_SPECIFIED')

    return Components.Exception(message,
      Cr.NS_ERROR_UNEXPECTED);
  },

  ITEM_NOT_FOUND: function(){
    let message = this.strings.GetStringFromName('ITEM_NOT_FOUND')

    return Components.Exception(message,
      Cr.NS_ERROR_UNEXPECTED);
  },

  EVENT_ENCOUNTERED: function(){
    let message = this.strings.GetStringFromName('EVENT_ENCOUNTERED')

    return Components.Exception(message,
      Cr.NS_ERROR_UNEXPECTED);
  },

  UNKNOWN: function(){
    let message = this.strings.GetStringFromName('UNKNOWN')

    return Components.Exception(message,
      Cr.NS_ERROR_UNEXPECTED);
  }
};
