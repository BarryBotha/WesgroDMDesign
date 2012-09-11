//=========================================================
// FreshBooks Calendar Widget
//
// http://www.freshbooks.com
// (c) 2007 2ndSite Inc.
//---------------------------------------------------------

var FbCalendar = {
  idCounter: 0,    // Index of last initialized calendar instance
  instances: [],   // Array of calendar instances
  hashInstances: {},
  heightOffset: 2, // Number of pixels
  formatType: 0,   // Display format type -- see: this.formatDate()
	borderColor: '#dddddd',
  weekDayNames: [ "S", "M", "T", "W", "T", "F", "S" ], 
  monthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  
  // Constants
  SINGLE: 1,
  DOUBLE: 2,
  LEFT: 4,
  RIGHT: 8,
  ABOVE: 16,
  BELOW: 32,
  
  BOTH:       0,
  PREV_ONLY:  1,
  NEXT_ONLY:  2,
    
  get: function(id) {
    if (typeof(id) == 'number')
      return this.instances[id];
    else
      return this.hashInstances[id];
  },

  setFormat: function(index) {
    this.formatType = index;
  },

  formatDate: function(date) {
    switch (this.formatType) {
      case 0: return formatDate(date, 'MM/dd/yy');
      case 1: return formatDate(date, 'MM/dd/yyyy');
      case 2: return formatDate(date, 'dd/MM/yy');
      case 3: return formatDate(date, 'dd/MM/yyyy');
      case 4: return formatDate(date, 'yy-MM-dd');
      case 5: return formatDate(date, 'yyyy-MM-dd');
    }
  },
  
  datesEqual: function(d1, d2) {
     return !(d1 > d2) && !(d1 < d2);
  },
  
  // Attempt to pull the month/year from the dateString according to
  // the current format type -- return value is a hash
  extractDate: function(dateString) {
    var month = null, year = null; day = null;
    
    var thisYear = (new Date).getFullYear();
    var thisCentury = Math.round(thisYear / 100);
    var lastCentury = thisCentury - 1;
  
    var dateSplit = this.formatType < 4 ? 
      dateString.split('/') : dateString.split('-')
      
    switch (this.formatType) {
      case 0: // mm/dd/yy
        month = dateSplit[0]; year = dateSplit[2]; day = dateSplit[1];
        if (year) { year = year > '50' ? lastCentury + year : thisCentury + year; }
        break;
      case 1: // mm/dd/yyyy
        month = dateSplit[0]; year = dateSplit[2]; day = dateSplit[1];
        break;
      case 2: // dd/mm/yy
        month = dateSplit[1]; year = dateSplit[2]; day = dateSplit[0];
        if (year) { year = year > '50' ? lastCentury + year : thisCentury + year; }
        break;
      case 3: // dd/mm/yyyy
        month = dateSplit[1]; year = dateSplit[2]; day = dateSplit[0];
        break;
      case 4: // yy-mm-dd
        month = dateSplit[1]; year = dateSplit[0]; day = dateSplit[2];
        if (year) { year = year > '50' ? lastCentury + year: thisCentury + year; }
        break;
      case 5: // yyyy-mm-dd
        month = dateSplit[1]; year = dateSplit[0]; day = dateSplit[2];
        break;
    }
    
    // Convert to integers
    if (month != null) { month = parseInt(month.replace(/^0/, '')); }
    if (year  != null) { year  = parseInt(year.replace(/^0/, '')); }
    if (day   != null) { day   = parseInt(day.replace(/^0/, '')); }
    
    // Return a hash
    return { month: month, year: year, day: day }
  },

  showCalendarEvent: function(e) { 
    if (!e) var e = window.event; 
    if (e.target) var id = e.target.id;
    if (e.srcElement) var id = e.srcElement.id;
    FbCalendar.get(id).show();
  },

  hideCalendarEvent: function(e) { 
    if (!e) var e = window.event; 
    if (e.target) var id = e.target.id;
    if (e.srcElement) var id = e.srcElement.id;
    FbCalendar.get(id).hide();
  },

  refreshCalendarEvent: function(e) {
    for (var i = 0; i < FbCalendar.instances.length; i++) {
      var cal = FbCalendar.instances[i];
			cal.hide();
    }
  },
  mouseOverEvent: function(id) { 
    FbCalendar.get(id).mouseOverCalendar = true; 
  },

  mouseOutEvent: function(id) { 
    FbCalendar.get(id).mouseOverCalendar = false; 
  },

  mouseClickEvent: function(id) {
    inputId = FbCalendar.get(id).input_id;
    inputElem = document.getElementById(inputId);
    inputElem.focus();
  },
      
  create: function(id, type) {
    // Insert a new div inside the calendar_area div
    var mouseOverStr = ' onmouseover="FbCalendar.mouseOverEvent(\'' + id + '\')" ';
    var mouseOutStr =  ' onmouseout="FbCalendar.mouseOutEvent(\'' + id + '\')" ';
    var mouseClickStr = ' onclick="FbCalendar.mouseClickEvent(\'' + id + '\')" ';
    
		var style = 'fb-double';
		if (type & FbCalendar.SINGLE) style = 'fb-single';
		
    var output = '' +
      '<iframe class="fb-iframe" id="' + id + '_cal_iframe' + '" src="iframe_dummy.html" frame style="display:none;"></iframe>' + 
      '<div class="fb-container" style="display:none" id="' + id + '_container"' +
      mouseOverStr + mouseOutStr + mouseClickStr + '>' +
      '<div class="fb-calendar ' + style + '" style="background-color:' + FbCalendar.borderColor + '" id="' + id + '_calendar">' +
      '</div></div>';

   // Insert the div before the input for which it was created
   var container = document.createElement('div');
   container.innerHTML = output;
   var anchor = document.getElementById('fb_calendar_anchor');
   anchor.parentNode.insertBefore(container, anchor);
   
    // Instantiate the calendar object
    var newCalendar =  {
      currentMonth: null,
      currentYear: null,
      lastSelected: null,
      lastInputValue: null,
      visible: false,
      type: type,
      dirtyFlag: true,

      input_id: id,
      div_id: id + '_calendar',
      iframe_id: id + '_cal_iframe',
      container_id: id + '_container',
      id: this.idCounter++,
      dates: [[], []],
      
      mouseOverCalendar: false,
      
      buildTable: function(month, year, cal, options) {
        var realDate = new Date(year, month - 1, 1);
        var month = realDate.getMonth() + 1;
        var year = realDate.getFullYear();

        var firstWeekDay = realDate.getDay();
        var lastDayOfMonth = new Date(year, month, 0).getDate();

        var dayCounter = 0;
        var cellCounter = 0;

        var out = '';
        out += '<div class="calPad"><table cellspacing="1" cellpadding="0" style="background-color: #ddd;" id="cal_main">';
        out += '  <thead><tr><td class="button">';

        // Previous month button
        if (options == FbCalendar.BOTH || 
            options == FbCalendar.PREV_ONLY) {
          out +=  '   <a href="#" class="prev" onclick="FbCalendar.get(' + this.id + ').prevYear(); event.cancelBubble=true; return false;">&#60;&#60;&nbsp;&nbsp;</a>';
		  out +=  '   <a href="#" class="prev" onclick="FbCalendar.get(' + this.id + ').prevMonth(); event.cancelBubble=true; return false;">&#60;</a>';
					/*out +=  '</td><td class="button">';
					out +=  '   <a href="#">&lt;</a>';*/
        }
        out += '    </td>';
        
        // Date header
        out += '    <td colspan="5" class="title">' + FbCalendar.monthNames[month-1] + ' ' + year + '</td>';

        // Next month button
        out += '    <td class="button">';
        if (options == FbCalendar.BOTH || 
            options == FbCalendar.NEXT_ONLY) {
          out += '    <a href="#" class="next" onclick="FbCalendar.get(' + this.id + ').nextMonth();event.cancelBubble=true;return false;">&#62;</a>';
		  out += '    <a href="#" class="next" onclick="FbCalendar.get(' + this.id + ').nextYear();event.cancelBubble=true;return false;">&nbsp;&nbsp;&#62;&#62;</a>';
		
					/*out += '</td><td class="button">';
					out += '    <a href="#">&gt;</a>';*/
        }
        out += '    </td></tr></thead>';

        // Weekday names - S, M, T, W ...
        out += '  <tbody><tr class="days">';
        for (i = 0; i < 7; i++) {
          out += '  <td>' + FbCalendar.weekDayNames[i] + '</td>';
        }
        out += '  </tr>';

        // Now, the guts of the calendar
        for (row = 0; row < 6; row++) {
          out += '<tr>'
      
          for (col = 0; col < 7; col++) {
            var afterFirstDay = cellCounter >= firstWeekDay;
            var beforeLastDay = cellCounter < lastDayOfMonth + firstWeekDay;
            cellCounter += 1;
						
						// "Close" button
						if (col > 4 && row > 4 && (options == FbCalendar.NEXT_ONLY || options == FbCalendar.BOTH)) {
							out += '<td class="button cal_close" colspan="2">' +
							  '<a href="#" onclick="FbCalendar.get(' + this.id + ').hide(true);event.cancelBubble=true;return false;">Close</a></td>';
							break;
						}
						
            if (afterFirstDay && beforeLastDay) {
              // Get a date object for this day
              date = new Date(year, month - 1, dayCounter + 1);
              
              // The unique id for this table cell
              elem_id = this.div_id + "_" + cal + "_" + dayCounter;
              
              // Was this date selected earlier
              if (this.lastSelectedDate && FbCalendar.datesEqual(date, this.lastSelectedDate))
                out += '<td id="' + elem_id + '" class="selected">';  
              else
                out += '<td id="' + elem_id + '">';
                
              out += '<a href="#" onclick="FbCalendar.get(' + 
                     this.id + ').pickDate(' + cal + ', ' + dayCounter + 
                     ');event.cancelBubble=true;return false;">' + 
                     (dayCounter + 1) + '</td>';  

              // Store the date in our 2d array
              this.dates[cal][dayCounter] = date;

              dayCounter += 1;
            } else {
              // Empty table cell -- no day falls on this cell
              out += '<td class="cal_empty">&nbsp;</td>';
            }
          }
          out += '</tr>';
        }
        out += '</tbody></table></div>';
        return out;
      },

      //---------------------------------------------------------------------//
      // Render the calendar -- prepare it for display (don't show it)
      render: function() {
      
        var firstWeekDay = new Date(this.currentYear, this.currentMonth - 1, 1).getDay();
        var lastDayOfMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

        var div = document.getElementById(this.div_id);
        div.innerHTML = '';
        if (type == FbCalendar.DOUBLE) {
          // Double-month calendar        
          leftTable  = this.buildTable(
            this.currentMonth, this.currentYear, 0, FbCalendar.PREV_ONLY
          );
          
          rightTable = this.buildTable(
            this.currentMonth + 1, this.currentYear, 1, FbCalendar.NEXT_ONLY
          ); 
          
          //div.innerHTML += leftTable + '<div class="fb-divider"><img alt="WESGRO" src="images/spacerTrans.gif"/></div>' + rightTable;  
		  div.innerHTML += leftTable + rightTable;  
          
        } else { 
          // Single-month calendar
          table = this.buildTable(
            this.currentMonth, this.currentYear, 0, FbCalendar.BOTH
          );
          div.innerHTML += table;
        }
        
        // Add close button
				div.innerHTML += '<div style="clear:both">';
/*        div.innerHTML += '<div class="close"><a href="#" onclick="FbCalendar.get(' 
            + this.id + ').hide(true);event.cancelBubble=true;return false;">Close</a></div>'*/
  
        // Mark as no longer dirty
        this.dirtyFlag = false;            
      }, // render()
	  
	  //---------------------------------------------------------------------//
	  
	  nextYear: function() {
	  	this.changeDate(this.currentMonth, this.currentYear+1, true);
	  },
	  
	  //---------------------------------------------------------------------//
	  
	  prevYear: function() {
	  	this.changeDate(this.currentMonth, this.currentYear-1, true);
	  },
	  
      //---------------------------------------------------------------------//
      nextMonth: function() {
        if (this.currentMonth == 12)
          this.changeDate(1, this.currentYear + 1, true);
        else
          this.changeDate(this.currentMonth + 1, this.currentYear, true);
      },

      //---------------------------------------------------------------------//
      prevMonth: function() {
        if (this.currentMonth == 1)
          this.changeDate(12, this.currentYear - 1, true);
        else
          this.changeDate(this.currentMonth - 1, this.currentYear, true);
      },

      //--------------------------------------------------------------------//
      // Read date from input
      readDate: function() {
        var inputElem = document.getElementById(this.input_id);
        var dateString = inputElem.value;
        var date = FbCalendar.extractDate(dateString);
        
        if (dateString != '' && date.month && date.year) {
          this.changeDate(date.month, date.year);
            
          if (date.day) {
            this.lastInputValue = inputElem.value;
            this.lastSelectedDate = new Date(date.year, date.month - 1, date.day);
            this.dirtyFlag = true;
          }
        } // date && year
      },
      
      //---------------------------------------------------------------------//
      // Change the current month(s) shown on the calendar
      changeDate: function(month, year, setfocus) {
        this.currentMonth = month;
        this.currentYear = year;

        this.render();
        
        // Return focus
        if (setfocus) {
          inputElem = document.getElementById(this.input_id);
          inputElem.focus();
        }
      },
      
      attachTo: function(elemId) {
        elem = document.getElementById(elemId);
        elem.onclick = function(e) { 
        alert(e.target);
        if (!e) var e = window.event;
        if (e.target) var id = e.target.id;
        if (e.srcElement) var id = e.srcElement.id;
        document.getElementById(FbCalendar.get(id)).focus();
      }
    },
    
      //---------------------------------------------------------------------//
      pickDate: function(cal, index) {
        var input = document.getElementById(this.input_id);
        input.value = FbCalendar.formatDate(this.dates[cal][index]);

        this.lastInputValue = input.value;
        this.dirtyFlag = true;
        this.lastSelectedDate = this.dates[cal][index];
        this.hide(true); // force hide

      },

      //---------------------------------------------------------------------//
     // Hides the calendar
      hide: function(force) {
        // Don't hide if the mouse is over the calendar
        // OPTIONAL: force the hide using the 'force' param
        if (force || !this.mouseOverCalendar) {
          div = document.getElementById(this.container_id);
          div.style.display = 'none';
          iframe = document.getElementById(this.iframe_id);
          iframe.style.display = 'none';
          this.visible = false;
        }
      },

      //---------------------------------------------------------------------//
    // Reveals the calendar
      show: function() {
        // Before showing the calendar, we read the value from the input box,
        // and if its legible, we change the date on the calendar

        var inputElem = document.getElementById(this.input_id);
        if (!this.visible && inputElem.value != this.lastInputValue) {        
          this.readDate();
        }
        
        if (this.dirtyFlag) {
          this.render();
        }
                        
        // Get the calendar container
        var div = document.getElementById(this.container_id);
        div.style.position = 'absolute';

        // Find the coordinates and dimensions of all the players
        // -- input box, calendar, window
        var inputCoords = findPos(inputElem);
        var inputDims = proto_getDimensions(inputElem);
        var windowDims = util_windowDims();
        var scrollDims = util_scrollDims();
        var calDims = proto_getDimensions(div);

        // Re-orient the calendar to fit inside the window

        // Width
        if ((inputCoords[0] + calDims[0] > windowDims[0]) &&
            (inputCoords[0] - calDims[0] + inputDims[0] > 0))
          div.style.left = (inputCoords[0] + inputDims[0] - calDims[0]) + 'px';
        else
          div.style.left = inputCoords[0] + 'px';

        // Height
        if ((inputCoords[1] + inputDims[1] + calDims[1] > windowDims[1] + scrollDims[1]) &&
            (inputCoords[1] - calDims[1] > scrollDims[1])) {
          div.style.top = (inputCoords[1] - proto_getHeight(div) - 
                          FbCalendar.heightOffset) + 'px';
        }
        else {
          div.style.top = (inputCoords[1] + proto_getHeight(inputElem) + 
                          + FbCalendar.heightOffset) + 'px';
        }
          
        // Do the same for the iframe                        
        var iframe = document.getElementById(this.iframe_id);
        iframe.style.position = 'absolute';
        iframe.style.left = div.style.left;
        iframe.style.top = div.style.top;
        iframe.style.width = proto_getWidth(div) + 'px';
        iframe.style.height = proto_getHeight(div) + 'px';
        iframe.style.display = 'block';

        div.style.display = 'block';     
        this.visible = true;
      },
    
      refresh: function() {
        if (this.visible) { this.hide(); this.show(); }
      },

      //---------------------------------------------------------------------//
      // Reveals/hides the calendar, depending on its current state
      toggleVisible: function() {
        if (this.visible) 
          this.hide();
        else 
          this.show();
      }
    }
    
    // Add an onclick event to the input HTML element to which this calendar
     // is "attached"
    var input = document.getElementById(id);
    var container = document.getElementById(newCalendar.container_id);

    // Cross-platform event hackery because Daniel won't let me use Prototype :( :(    
    if (input.addEventListener) {
      // Firefox/Mozilla/Opera
      input.addEventListener('focus', FbCalendar.showCalendarEvent, false);
      input.addEventListener('blur', FbCalendar.hideCalendarEvent, false);
      input.addEventListener('keydown', FbCalendar.hideCalendarEvent, false);
      window.addEventListener('resize', FbCalendar.refreshCalendarEvent, false);
      // Moved most mouseover events to the div's themselves 
      // -- fixed a bunch of problems

      //container.addEventListener('mouseover', FbCalendar.mouseOverEvent, false);
      //container.addEventListener('mouseout', FbCalendar.mouseOutEvent, false);

    } else if (input.attachEvent) {
      // MSIE 6.x/7.x
      //input.attachEvent('onfocus', FbCalendar.showCalendarEvent);
      input.attachEvent('onfocus', FbCalendar.showCalendarEvent);
      input.attachEvent('onblur', FbCalendar.hideCalendarEvent);
      input.attachEvent('onkeydown', FbCalendar.hideCalendarEvent);
      window.attachEvent('onresize', FbCalendar.refreshCalendarEvent);
      //container.attachEvent('onmouseover', FbCalendar.mouseOverEvent);
      //container.attachEvent('onmouseout', FbCalendar.mouseOutEvent);
    }

    // Add the calendar object to the list of instances
    this.instances[newCalendar.id] = newCalendar;
    this.hashInstances[id] = newCalendar;

		var today = new Date();
		newCalendar.changeDate(today.getMonth()+1,today.getFullYear());
    return newCalendar;
  } 
}

// This method was pulled from prototype.js
function proto_getHeight(element) {
  return proto_getDimensions(element)[1];
}

function proto_getWidth(element) {
  return proto_getDimensions(element)[0];
}

function proto_getDimensions(element) {
  var display = element.style.display;
  if (display != 'none' && display != null) // Safari bug
    return [element.offsetWidth, element.offsetHeight];//{width: element.offsetWidth, height: element.offsetHeight};

  // All *Width and *Height properties give 0 on elements with display none,
  // so enable the element temporarily
  var els = element.style;
  var originalVisibility = els.visibility;
  var originalPosition = els.position;
  var originalDisplay = els.display;
  els.visibility = 'hidden';
  els.position = 'absolute';
  els.display = 'block';
  var originalWidth = element.clientWidth;
  var originalHeight = element.clientHeight;
  els.display = originalDisplay;
  els.position = originalPosition;
  els.visibility = originalVisibility;
  return [originalWidth, originalHeight];//{width: originalWidth, height: originalHeight}
}


// Author: Peter-Paul Koch
// http://www.quirksmode.org/js/findpos.html
// License: http://www.quirksmode.org/about/copyright.html

function findPos(obj) {
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    curleft = obj.offsetLeft;
    curtop = obj.offsetTop;
    while (obj = obj.offsetParent) {
      curleft += obj.offsetLeft;
      curtop += obj.offsetTop;
    }
  }
  return [curleft, curtop];
}


// Author: Matt Kruse <matt@mattkruse.com>
// http://www.mattkruse.com/javascript/date/source.html

var MONTH_NAMES=new Array('January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec');
var DAY_NAMES=new Array('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sun','Mon','Tue','Wed','Thu','Fri','Sat');
function LZ(x) {return(x<0||x>9?"":"0")+x}

function formatDate(date,format) {
  format=format+"";
  var result="";
  var i_format=0;
  var c="";
  var token="";
  var y=date.getYear()+"";
  var M=date.getMonth()+1;
  var d=date.getDate();
  var E=date.getDay();
  var H=date.getHours();
  var m=date.getMinutes();
  var s=date.getSeconds();
  var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
  // Convert real date parts into formatted versions
  var value=new Object();
  if (y.length < 4) {y=""+(y-0+1900);}
  value["y"]=""+y;
  value["yyyy"]=y;
  value["yy"]=y.substring(2,4);
  value["M"]=M;
  value["MM"]=LZ(M);
  value["MMM"]=MONTH_NAMES[M-1];
  value["NNN"]=MONTH_NAMES[M+11];
  value["d"]=d;
  value["dd"]=LZ(d);
  value["E"]=DAY_NAMES[E+7];
  value["EE"]=DAY_NAMES[E];
  value["H"]=H;
  value["HH"]=LZ(H);
  if (H==0){value["h"]=12;}
  else if (H>12){value["h"]=H-12;}
  else {value["h"]=H;}
  value["hh"]=LZ(value["h"]);
  if (H>11){value["K"]=H-12;} else {value["K"]=H;}
  value["k"]=H+1;
  value["KK"]=LZ(value["K"]);
  value["kk"]=LZ(value["k"]);
  if (H > 11) { value["a"]="PM"; }
  else { value["a"]="AM"; }
  value["m"]=m;
  value["mm"]=LZ(m);
  value["s"]=s;
  value["ss"]=LZ(s);
  while (i_format < format.length) {
    c=format.charAt(i_format);
    token="";
    while ((format.charAt(i_format)==c) && (i_format < format.length)) {
      token += format.charAt(i_format++);
      }
    if (value[token] != null) { result=result + value[token]; }
    else { result=result + token; }
    }
  return result;
}

function util_windowDims() {
  var width = 0;
  var height = 0;
  if( typeof( window.innerWidth ) == 'number' ) {
    //Non-IE
    width = window.innerWidth;
    height = window.innerHeight;
  } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    width = document.documentElement.clientWidth;
    height = document.documentElement.clientHeight;
  } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
    //IE 4 compatible
    width = document.body.clientWidth;
    height = document.body.clientHeight;
  }
  return [width, height];
}

function util_scrollDims() {
  var scrOfX = 0, scrOfY = 0;
  if( typeof( window.pageYOffset ) == 'number' ) {
    //Netscape compliant
    scrOfY = window.pageYOffset;
    scrOfX = window.pageXOffset;
  } else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    scrOfY = document.body.scrollTop;
    scrOfX = document.body.scrollLeft;
  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    scrOfY = document.documentElement.scrollTop;
    scrOfX = document.documentElement.scrollLeft;
  }
  return [ scrOfX, scrOfY ];
}


