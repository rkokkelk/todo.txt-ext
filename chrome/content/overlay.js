Components.utils.import("resource://calendar/modules/calUtils.jsm");

window.addEventListener("load", function(e) { 
	let calManager = cal.getCalendarManager();
	let url = cal.makeURL('todotxt://_unused');
	let newCal = calManager.createCalendar('todotxt',url);
	newCal.name = "Todo.txt";
	calManager.registerCalendar(newCal);
}, false);


function startup() {
}
