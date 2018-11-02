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

Cu.import('resource://todotxt/exception.jsm');

EXPORTED_SYMBOLS = ['util'];

var util = {

  makeTitle: function(item){
    let itemTitle = "";
    let prefs = this.getPreferences();

    if(prefs.getBoolPref('thunderbird'))

      // Show Projects & Contexts in title
      if(prefs.getBoolPref('showFullTitle')){
        itemTitle = item.render();

        // Filter out priority, start date & adds-ons
        let regex = [
            /^\([A-Za-z]{1}\)\s*/,
            /^\d{4}-\d{2}-\d{2}\s*/,
            /[\w\d-_]+:[\w\d-_]+\s*/]
              
        for (let i=0; i< regex.length; i++){
          itemTitle = itemTitle.replace(regex[i],"");
        }
      } else
        itemTitle = this.makeStr(item.textTokens());
    else
      itemTitle = item.render();
    
    return itemTitle;
  },

  makeArray:function(string){
    let result = [];

    if(!string) return result;
    let str_split = string.split(' ');

    for(let i=0; i < str_split.length;i++){
      let tmp_word = str_split[i].trim();
      if (tmp_word) result.push(tmp_word);
    }

    return result;
  },

  makeStr:function(array, separator){
    let result = "";
    if(separator == undefined) separator = ' ';
    for(let i=0; i<array.length;i++){
      result += array[i];

      if(i != array.length -1)
        result += separator;
    }
    return result;
  },

  getPreferences: function(){
    let prefs = Cc["@mozilla.org/preferences-service;1"]
                            .getService(Ci.nsIPrefService)
                            .getBranch("extensions.todotxt.");
    prefs.QueryInterface(Ci.nsIPrefBranch);

    return prefs;
  },
  
  makeDateStr: function(date) {
    let day = date.getDate();
    let month = (date.getMonth()+1);

    day = (day < 10) ? '0' + day : day;
    month = (month < 10) ? '0' + month : month;
    
    return date.getFullYear() + '-' + month + '-' + day;
  },
  
  makeTimeStr: function(date) {
    let hour = (date.hour < 10) ? '0' + date.hour : date.hour;
    let minute = (date.minute < 10) ? '0' + date.minute : date.minute;
    
    return hour + ':' + minute;
  },

  // Due to errors parsing ISO format in accordance with local time,
  // use the following function to parse String dates
  // parse a date in yyyy-mm-dd format
  parseDate: function(input) {

    // jsDueDate is parsed to 01:00:00, 
    // because no time is used set back to 00:00:00
    var parts = input.split('-');
    return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
  },

  // Priority 
  // A --> 1, High
  // B --> 5, Normal
  // C --> 9, Low
  calPriority: function(pri){
    if(typeof pri === 'string'){
      let p = pri.charAt(0);
      switch(p){
        case "A":
          return 1
        case "B":
            return 5;
        case "C":
            return 9;
        default:
            return 0;
      }
    } else if (typeof pri === 'number'){
      switch(pri){
        case 1:
          return 'A';
        case 5:
          return 'B';
        case 9:
          return 'C';
        default:
          return null;
      }
    }else
      throw exception.UNKNOWN();
  },

  toType: function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  },
};
