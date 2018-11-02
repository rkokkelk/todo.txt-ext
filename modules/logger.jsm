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

Cu.import("resource://calendar/modules/calUtils.jsm");

this.EXPORTED_SYMBOLS = ['todotxtLogger'];

let todotxtLogger = {
  
  notif: {},
  
  get debugMode() {
    var mDebugMode = true;
    return mDebugMode;
  },
  set debugMode(aValue) {
    this.mDebugMode = aValue;
  },

  getEpoch: function(){
    return new Date().getTime();
  },

  getDateTime: function(){
    return new Date().toLocaleString();
  },

  debug: function(src, msg) {
    if (this.debugMode) {
      let output = '('+this.getDateTime()+') ';
      if (src) {
        output += '[' + src + ']';
      }
      if (msg) {
        if (output.length > 0) {
          output += ' ';
        }
        output += msg;
      }
      cal.LOG(output);
    }
  },

  error: function(src, error) {
    this.showNotification(error.message);

    let output = '('+this.getDateTime()+') ';

    if (src) {
      output += '[' + src + ']';
    }
    output += ' ERROR: ';

    if (error)
      output += error.message;

    if (this.debugMode) 
      output += "\n"+error.stack;
    
    cal.LOG(output);
  },

  resetNotifications: function(){
    // reset notification counter when settings changed
    // so that new errors are displayed immediatly
    this.notif = {};
  },

  showNotification: function(message){
    // Time between messages is 30 seconds
    let seconds = 30*1000;

    // prevent notifications pop-up overload
    // time delay is 30,60,120,240,etc seconds
    if(this.notif[message] == null){

      this.notif[message] = {};
      this.notif[message]['count'] = 0;
      this.notif[message]['time'] = this.getEpoch() + seconds;
    }else{
      if(this.getEpoch() < this.notif[message]['time']){
        return;
      }else{
        let count = this.notif[message]['count'] + 1;
        let time = this.getEpoch() + (seconds * Math.pow(2,count));

        this.notif[message]['count'] = count;
        this.notif[message]['time'] = time;
      }
    }

    let prompts = Cc["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Ci.nsIPromptService);
    prompts.alert(null,'Warning Todo.txt',message);
  },
};
