const AGENDA_DAYS = 20;
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let ampm = (h) => (h < 12 || h === 24) ? "am" : "pm";

const url = new URL(window.location.href);
const loading = document.getElementById('loading');

const ical = url.searchParams.get('ical');
let show_title = url.searchParams.get('title') || 1;
const show_nav = url.searchParams.get('nav') || 1;
const show_date = url.searchParams.get('date') || 1;
const show_details = url.searchParams.get('details') || 0;
const show_view = url.searchParams.get('view') || 2;
const default_view = url.searchParams.get('dview') || 2;
const monday_start = url.searchParams.get('monstart') || 0;
const min_hour = url.searchParams.get('minhour');
const max_hour = url.searchParams.get('maxhour');
const color = url.searchParams.get('color') || '#8B6F47';
const colorBG = url.searchParams.get('colorbg') || '#FEFEF8';
const colorText = url.searchParams.get('colortxt') || '#3E3E3E';
const colorThemeText = url.searchParams.get('colorsecondarytxt') || '#FFFFFF';
const fontFamily = url.searchParams.get('font') || 'open-sans';
const showWhen = url.searchParams.get('when') !== '0';
const showDescription = url.searchParams.get('desc') !== '0';
const startToday = url.searchParams.get('starttoday') === '1';
const timezone = url.searchParams.get('tz') || 'America/Los_Angeles';

// Convert hex color to RGB for use in rgba()
function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
}

// Truncate text to max 128 characters
function truncateText(text, maxLength = 128) {
	if (text && text.length > maxLength) {
		return text.substring(0, maxLength) + '…';
	}
	return text;
}

// Set CSS variables for theme colors
document.documentElement.style.setProperty('--background-color', colorBG);
document.documentElement.style.setProperty('--text-color', colorText);
document.documentElement.style.setProperty('--theme-color', color);
document.documentElement.style.setProperty('--theme-text-color', colorThemeText);
document.documentElement.style.setProperty('--theme-color-rgb', hexToRgb(color));

// Apply font family
if (fontFamily === 'fuzzy-bubbles') {
	document.body.classList.add('font-fuzzy-bubbles');
} else if (fontFamily === 'crimson-text') {
	document.body.classList.add('font-crimson-text');
}

// Get today's date in the specified timezone
function getTodayInTimezone(tz) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const parts = formatter.formatToParts(new Date());
	const year = parts.find(p => p.type === 'year').value;
	const month = parts.find(p => p.type === 'month').value;
	const day = parts.find(p => p.type === 'day').value;
	const date = new Date(`${year}-${month}-${day}T00:00:00`);
	return date;
}

let today = getTodayInTimezone(timezone);
let selectedDay = new Date(today.valueOf());
let selectedView = default_view;

function getHumanDate(date) {
	return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, 0)}-${date.getDate().toString().padStart(2, 0)}`;
}

function createDateCell(date, todayd = false) {
	let day = date.getDay();
	let dateM = date.getDate();
	let month = date.getMonth();
	let dateCell = document.createElement('td');
	dateCell.tabIndex = '-1';
	dateCell.dataset.date = getHumanDate(date);
	dateCell.onfocus = () => {
		selectDay(getHumanDate(date), false)
	};
	if (todayd) {
		dateCell.className = 'today';
	}
	let dayEl = document.createElement('span');
	dayEl.className = 'dayname';
	dayEl.appendChild(document.createTextNode(DAYS_OF_WEEK[day].substring(0, 3).toUpperCase()));
	dateCell.appendChild(dayEl);
	let dateEl = document.createElement('span');
	dateEl.className = 'day';
	let dateSpan = document.createElement('span');
	dateSpan.appendChild(document.createTextNode(dateM));
	dateEl.appendChild(dateSpan);
	dateCell.appendChild(dateEl);
	let monthEl = document.createElement('span');
	monthEl.className = 'month';
	monthEl.appendChild(document.createTextNode(MONTHS[month].substring(0, 3).toUpperCase()));
	dateCell.appendChild(monthEl);
	return dateCell;
}

function selectDay(date, focus = true, events = null) {
	let newSelection = new Date(date + 'T00:00');
	let newMonth = false;
	if (selectedDay.getMonth() != newSelection.getMonth() && events != null) {
		renderMonth(events, newSelection);
		newMonth = true;
	}

	selectedDay = newSelection;

	document.querySelector('#date_label span').innerHTML = `${DAYS_OF_WEEK[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}`;
	document.getElementById('date').value = getHumanDate(selectedDay);

	let selectedElement = document.querySelector(`td[data-date='${getHumanDate(selectedDay)}']`);
	if (selectedElement && (focus || newMonth)) {
		selectedElement.focus();
	}
}

function calculateHoursToShow(hoursWithEvents) {
	// Rules:
	// 1. Always show exactly 7 hours
	// 2. If no events, show 12-19 (7 hours)
	// 3. If events span > 7 hours, skip gaps: show padding around first and last events
	// 4. If too dense, show only 12-19 (noon onwards, 7 hours)

	if (hoursWithEvents.size === 0) {
		// No events - show 12-19 (7 hours), but reduce if needed for height
		let result = Array.from({length: 7}, (_, i) => 12 + i);
		return reduceHoursIfNeeded(result);
	}

	const sortedHours = Array.from(hoursWithEvents).sort((a, b) => a - b);
	const minHour = sortedHours[0];
	const maxHour = sortedHours[sortedHours.length - 1];
	const hourSpan = maxHour - minHour;

	if (hourSpan < 7) {
		// Events fit within 7 hours, show all hours between min and max
		const result = Array.from({length: hourSpan + 1}, (_, i) => minHour + i);
		// Pad to exactly 7 hours if needed
		while (result.length < 7) {
			if (result[result.length - 1] < 23) {
				result.push(result[result.length - 1] + 1);
			} else if (result[0] > 0) {
				result.unshift(result[0] - 1);
			} else {
				break;
			}
		}
		return result.slice(0, 7);
	}

	// Events span >= 7 hours - skip gaps between events
	// Add padding around first and last events, distributing 7 total hours

	// Calculate how much padding we can add before first event and after last event
	const paddingBefore = minHour; // Max hours we can go back
	const paddingAfter = 23 - maxHour; // Max hours we can go forward
	const totalPaddingAvailable = paddingBefore + paddingAfter;

	// We have 7 hours total, minus space for at least the min and max hours = at most 5 hours of padding
	const maxPaddingToUse = 5;
	const paddingToUse = Math.min(totalPaddingAvailable, maxPaddingToUse);

	// Distribute padding proportionally before and after
	let padBefore, padAfter;
	if (totalPaddingAvailable === 0) {
		padBefore = 0;
		padAfter = 0;
	} else {
		padBefore = Math.floor((paddingBefore / totalPaddingAvailable) * paddingToUse);
		padAfter = paddingToUse - padBefore;
		// Adjust if we exceed available padding
		padBefore = Math.min(padBefore, paddingBefore);
		padAfter = Math.min(padAfter, paddingAfter);
	}

	const startHour = minHour - padBefore;
	const endHour = maxHour + padAfter;
	const result = Array.from({length: endHour - startHour + 1}, (_, i) => startHour + i);

	// Ensure exactly 7 hours
	if (result.length > 7) {
		return result.slice(0, 7);
	} else if (result.length < 7) {
		// Pad to 7 hours
		while (result.length < 7) {
			if (result[result.length - 1] < 23) {
				result.push(result[result.length - 1] + 1);
			} else if (result[0] > 0) {
				result.unshift(result[0] - 1);
			} else {
				break;
			}
		}
	}

	return reduceHoursIfNeeded(result.slice(0, 7));
}

function reduceHoursIfNeeded(hours) {
	// Check if rendering these hours will exceed 480px height
	// Each hour = 32px (hour row) + 16px (half row) = 48px
	// Header ~60px, nav ~40px, title ~30px, spacing/padding ~20px = ~150px overhead
	// So available for hours: 480 - 150 = 330px
	// Max hours that fit: 330 / 48 = 6.875, so 6 hours safely fit

	const AVAILABLE_HEIGHT = 330; // px available for hours
	const PIXELS_PER_HOUR = 48; // 32px hour + 16px half
	const MAX_HOURS = Math.floor(AVAILABLE_HEIGHT / PIXELS_PER_HOUR);

	if (hours.length <= MAX_HOURS) {
		// Fits within height constraint
		return hours;
	}

	// Need to reduce hours - keep first MAX_HOURS
	return hours.slice(0, MAX_HOURS);
}

function setView(newView, events) {
	selectedView = newView;
	document.getElementById('agenda').classList.add('hidden');
	document.getElementById('month').classList.add('hidden');
	document.getElementById('week').classList.add('hidden');
	if (selectedView == 1) {
		renderMonth(events);
	} else if (selectedView == 2) {
		renderWeek(events);
	} else if (selectedView == 3) {
		render5DayWeek(events);
	} else {
		renderAgenda(events);
	}
}

function renderWeek(events) {
	// Find the first day of the week
	let weekEl = document.getElementById('week');
	let baseDay = new Date(selectedDay.valueOf());
	let dayOfWeek = baseDay.getDay();
	let weekStart = new Date(baseDay.valueOf());

	if (startToday) {
		// Start week on today (selected day)
		// No adjustment needed, weekStart is already at baseDay
	} else {
		// Start week on Monday
		weekStart.setDate(baseDay.getDate() - ((dayOfWeek + 6) % 7));
	}

	// Find min and max hours with events in the week
	let hoursWithEvents = new Set();
	for (let i = 0; i < 7; i++) {
		let d = new Date(weekStart.valueOf());
		d.setDate(weekStart.getDate() + i);
		let dayStr = getHumanDate(d);
		let dayHasAllDay = events.some(e => getHumanDate(e.startDate) === dayStr && e.allDay);
		events.forEach(e => {
			if (getHumanDate(e.startDate) === dayStr && !e.allDay) {
				hoursWithEvents.add(e.startDate.getHours());
			}
		});
	}

	// Determine hours to show: use URL params if provided, otherwise use new calculation logic
	let hoursToShow;
	if (min_hour !== null && max_hour !== null) {
		// User specified both min and max
		let minH = parseInt(min_hour);
		let maxH = parseInt(max_hour);
		hoursToShow = Array.from({length: maxH - minH + 1}, (_, i) => minH + i);
	} else if (min_hour !== null) {
		// User specified only min, go to 8pm
		let minH = parseInt(min_hour);
		hoursToShow = Array.from({length: 20 - minH}, (_, i) => minH + i);
	} else if (max_hour !== null) {
		// User specified only max, go from 8am
		let maxH = parseInt(max_hour);
		hoursToShow = Array.from({length: maxH - 8 + 1}, (_, i) => 8 + i);
	} else {
		// Auto-detect from events using new logic: exactly 7 hours
		hoursToShow = calculateHoursToShow(hoursWithEvents);
	}

	// Build header row (Hour label + Mon-Sun)
	let header = document.createElement('tr');
	// Empty top-left cell for hour labels
	let emptyTh = document.createElement('th');
	emptyTh.className = 'week-hour-label';
	header.appendChild(emptyTh);
	for (let i = 0; i < 7; i++) {
		let d = new Date(weekStart.valueOf());
		d.setDate(weekStart.getDate() + i);
		let th = document.createElement('th');
		th.innerText = DAYS_OF_WEEK[(d.getDay())].substring(0, 3);
		let dateSpan = document.createElement('span');
		dateSpan.className = 'date';
		dateSpan.innerText = d.getDate();
		if (getHumanDate(d) === getHumanDate(today)) dateSpan.classList.add('today');
		th.appendChild(document.createElement('br'));
		th.appendChild(dateSpan);
		header.appendChild(th);
	}

	// Build time grid - only show hours with events (or default range if empty)
	let tbody = document.createElement('tbody');
	let hoursToRender = hoursToShow;

	for (let hour of hoursToRender) {
		// Full hour row
		let row = document.createElement('tr');
		// Hour label cell
		let hourLabel = document.createElement('td');
		hourLabel.className = 'week-hour-label';
		let hourText = (hour === 12 ? '12pm' : hour === 0 ? '12am' : hour < 12 ? hour + 'am' : (hour - 12) + 'pm');
		hourLabel.innerText = hourText;
		row.appendChild(hourLabel);

		for (let i = 0; i < 7; i++) {
			let d = new Date(weekStart.valueOf());
			d.setDate(weekStart.getDate() + i);
			let td = document.createElement('td');
			td.className = 'week-hour';
			td.dataset.date = getHumanDate(d);
			td.dataset.hour = hour;
			if (getHumanDate(d) === getHumanDate(today)) {
				td.dataset.today = 'true';
			}

			let dayStr = getHumanDate(d);

			// Separate all-day and timed events
			let timedEvents = events.filter(e => dayStr === getHumanDate(e.startDate) && !e.allDay && e.startDate.getHours() === hour);
			let allDayEvents = events.filter(e => dayStr === getHumanDate(e.startDate) && e.allDay);

			// Render all-day events as semi-transparent background
			if (allDayEvents.length > 0 && hour === hoursToRender[0]) {
				// Only show all-day events in the first hour row of the day
				for (let e = 0; e < allDayEvents.length; e++) {
					let event = document.createElement('div');
					event.className = 'event event-allday';
					let summary = document.createElement('div');
					summary.className = 'summary';
					let eName = document.createElement('span');
					eName.className = 'name';
					eName.appendChild(document.createTextNode(truncateText(allDayEvents[e].name)));
					summary.appendChild(eName);
					event.appendChild(summary);
					event.appendChild(eventDetails(allDayEvents[e]));
					td.appendChild(event);
				}
			}

			// Render timed events on top
			for (let e = 0; e < timedEvents.length; e++) {
				let event = document.createElement('div');
				event.className = 'event';
				let summary = document.createElement('div');
				summary.className = 'summary';
				let eName = document.createElement('span');
				eName.className = 'name';
				eName.appendChild(document.createTextNode(truncateText(timedEvents[e].name)));
				summary.appendChild(eName);
				if (showWhen) {
					let startTime = `${(timedEvents[e].startDate.getHours() % 12) || 12}:${timedEvents[e].startDate.getMinutes().toString().padStart(2, '0')}`;
					let endTime = `${(timedEvents[e].endDate.getHours() % 12) || 12}:${timedEvents[e].endDate.getMinutes().toString().padStart(2, '0')}`;
					let startM = ampm(timedEvents[e].startDate.getHours());
					let endM = ampm(timedEvents[e].endDate.getHours());
					let eTime = document.createElement('span');
					eTime.className = 'time';
					let timeText = `${startTime} ${startM == endM ? '' : startM} - ${endTime} ${endM}`;
					if (timedEvents[e].days === 0) {
						timeText = `${startTime} ${startM}`;
					} else if (timedEvents[e].days > 1 && !timedEvents[e].allDay) {
						timeText = `${MONTHS[timedEvents[e].startDate.getMonth()]} ${timedEvents[e].startDate.getDate()}, ${startTime}${startM} - ${MONTHS[timedEvents[e].endDate.getMonth()]} ${timedEvents[e].endDate.getDate()}, ${endTime}${endM}`;
					}
					eTime.appendChild(document.createTextNode(timeText));
					summary.appendChild(eTime);
				}
				event.appendChild(summary);
				event.appendChild(eventDetails(timedEvents[e]));
				td.appendChild(event);
			}

			row.appendChild(td);
		}
		tbody.appendChild(row);

		// Half-hour row (dotted)
		let halfRow = document.createElement('tr');
		// Empty cell for half-hour label
		let halfHourLabel = document.createElement('td');
		halfHourLabel.className = 'week-half-label';
		halfHourLabel.innerHTML = '';
		halfRow.appendChild(halfHourLabel);
		for (let i = 0; i < 7; i++) {
			let d = new Date(weekStart.valueOf());
			d.setDate(weekStart.getDate() + i);
			let td = document.createElement('td');
			td.className = 'week-half';
			td.innerHTML = '';
			if (getHumanDate(d) === getHumanDate(today)) {
				td.dataset.today = 'true';
			}
			halfRow.appendChild(td);
		}
		tbody.appendChild(halfRow);
	}

	weekEl.innerHTML = '';
	let thead = document.createElement('thead');
	thead.appendChild(header);
	weekEl.appendChild(thead);
	weekEl.appendChild(tbody);
	weekEl.classList.remove('hidden');
}

function render5DayWeek(events) {
	// Find the first day of the week (Mon-Fri)
	let weekEl = document.getElementById('week');
	let baseDay = new Date(selectedDay.valueOf());
	let dayOfWeek = baseDay.getDay();
	let weekStart = new Date(baseDay.valueOf());

	if (startToday) {
		// Start 5-day week on today (selected day) or nearest Monday
		// If today is Sat/Sun, start on previous Monday
		if (dayOfWeek === 0) {
			weekStart.setDate(baseDay.getDate() - 2);
		} else if (dayOfWeek === 6) {
			weekStart.setDate(baseDay.getDate() - 1);
		}
	} else {
		// Start week on Monday
		weekStart.setDate(baseDay.getDate() - ((dayOfWeek + 6) % 7));
	}

	// Find min and max hours with events in the 5-day period
	let hoursWithEvents = new Set();
	for (let i = 0; i < 5; i++) {
		let d = new Date(weekStart.valueOf());
		d.setDate(weekStart.getDate() + i);
		let dayStr = getHumanDate(d);
		let dayHasAllDay = events.some(e => getHumanDate(e.startDate) === dayStr && e.allDay);
		events.forEach(e => {
			if (getHumanDate(e.startDate) === dayStr && !e.allDay) {
				hoursWithEvents.add(e.startDate.getHours());
			}
		});
	}

	// Determine hours to show: use URL params if provided, otherwise use new calculation logic
	let hoursToShow;
	if (min_hour !== null && max_hour !== null) {
		// User specified both min and max
		let minH = parseInt(min_hour);
		let maxH = parseInt(max_hour);
		hoursToShow = Array.from({length: maxH - minH + 1}, (_, i) => minH + i);
	} else if (min_hour !== null) {
		// User specified only min, go to 8pm
		let minH = parseInt(min_hour);
		hoursToShow = Array.from({length: 20 - minH}, (_, i) => minH + i);
	} else if (max_hour !== null) {
		// User specified only max, go from 8am
		let maxH = parseInt(max_hour);
		hoursToShow = Array.from({length: maxH - 8 + 1}, (_, i) => 8 + i);
	} else {
		// Auto-detect from events using new logic: exactly 7 hours
		hoursToShow = calculateHoursToShow(hoursWithEvents);
	}

	// Build header row (Hour label + Mon-Fri)
	let header = document.createElement('tr');
	// Empty top-left cell for hour labels
	let emptyTh = document.createElement('th');
	emptyTh.className = 'week-hour-label';
	header.appendChild(emptyTh);
	for (let i = 0; i < 5; i++) {
		let d = new Date(weekStart.valueOf());
		d.setDate(weekStart.getDate() + i);
		let th = document.createElement('th');
		th.innerText = DAYS_OF_WEEK[(d.getDay())].substring(0, 3);
		let dateSpan = document.createElement('span');
		dateSpan.className = 'date';
		dateSpan.innerText = d.getDate();
		if (getHumanDate(d) === getHumanDate(today)) dateSpan.classList.add('today');
		th.appendChild(document.createElement('br'));
		th.appendChild(dateSpan);
		header.appendChild(th);
	}

	// Build time grid - only show hours with events (or default range if empty)
	let tbody = document.createElement('tbody');
	let hoursToRender = hoursToShow;

	for (let hour of hoursToRender) {
		// Full hour row
		let row = document.createElement('tr');
		// Hour label cell
		let hourLabel = document.createElement('td');
		hourLabel.className = 'week-hour-label';
		let hourText = (hour === 12 ? '12pm' : hour === 0 ? '12am' : hour < 12 ? hour + 'am' : (hour - 12) + 'pm');
		hourLabel.innerText = hourText;
		row.appendChild(hourLabel);

		for (let i = 0; i < 5; i++) {
			let d = new Date(weekStart.valueOf());
			d.setDate(weekStart.getDate() + i);
			let td = document.createElement('td');
			td.className = 'week-hour';
			td.dataset.date = getHumanDate(d);
			td.dataset.hour = hour;
			if (getHumanDate(d) === getHumanDate(today)) {
				td.dataset.today = 'true';
			}

			let dayStr = getHumanDate(d);

			// Separate all-day and timed events
			let timedEvents = events.filter(e => dayStr === getHumanDate(e.startDate) && !e.allDay && e.startDate.getHours() === hour);
			let allDayEvents = events.filter(e => dayStr === getHumanDate(e.startDate) && e.allDay);

			// Render all-day events as semi-transparent background
			if (allDayEvents.length > 0 && hour === hoursToRender[0]) {
				// Only show all-day events in the first hour row of the day
				for (let e = 0; e < allDayEvents.length; e++) {
					let event = document.createElement('div');
					event.className = 'event event-allday';
					let summary = document.createElement('div');
					summary.className = 'summary';
					let eName = document.createElement('span');
					eName.className = 'name';
					eName.appendChild(document.createTextNode(truncateText(allDayEvents[e].name)));
					summary.appendChild(eName);
					event.appendChild(summary);
					event.appendChild(eventDetails(allDayEvents[e]));
					td.appendChild(event);
				}
			}

			// Render timed events on top
			for (let e = 0; e < timedEvents.length; e++) {
				let event = document.createElement('div');
				event.className = 'event';
				let summary = document.createElement('div');
				summary.className = 'summary';
				let eName = document.createElement('span');
				eName.className = 'name';
				eName.appendChild(document.createTextNode(truncateText(timedEvents[e].name)));
				summary.appendChild(eName);
				if (showWhen) {
					let startTime = `${(timedEvents[e].startDate.getHours() % 12) || 12}:${timedEvents[e].startDate.getMinutes().toString().padStart(2, '0')}`;
					let endTime = `${(timedEvents[e].endDate.getHours() % 12) || 12}:${timedEvents[e].endDate.getMinutes().toString().padStart(2, '0')}`;
					let startM = ampm(timedEvents[e].startDate.getHours());
					let endM = ampm(timedEvents[e].endDate.getHours());
					let eTime = document.createElement('span');
					eTime.className = 'time';
					let timeText = `${startTime} ${startM == endM ? '' : startM} - ${endTime} ${endM}`;
					if (timedEvents[e].days === 0) {
						timeText = `${startTime} ${startM}`;
					} else if (timedEvents[e].days > 1 && !timedEvents[e].allDay) {
						timeText = `${MONTHS[timedEvents[e].startDate.getMonth()]} ${timedEvents[e].startDate.getDate()}, ${startTime}${startM} - ${MONTHS[timedEvents[e].endDate.getMonth()]} ${timedEvents[e].endDate.getDate()}, ${endTime}${endM}`;
					}
					eTime.appendChild(document.createTextNode(timeText));
					summary.appendChild(eTime);
				}
				event.appendChild(summary);
				event.appendChild(eventDetails(timedEvents[e]));
				td.appendChild(event);
			}

			row.appendChild(td);
		}
		tbody.appendChild(row);

		// Half-hour row (dotted)
		let halfRow = document.createElement('tr');
		// Empty cell for half-hour label
		let halfHourLabel = document.createElement('td');
		halfHourLabel.className = 'week-half-label';
		halfHourLabel.innerHTML = '';
		halfRow.appendChild(halfHourLabel);
		for (let i = 0; i < 5; i++) {
			let d = new Date(weekStart.valueOf());
			d.setDate(weekStart.getDate() + i);
			let td = document.createElement('td');
			td.className = 'week-half';
			td.innerHTML = '';
			if (getHumanDate(d) === getHumanDate(today)) {
				td.dataset.today = 'true';
			}
			halfRow.appendChild(td);
		}
		tbody.appendChild(halfRow);
	}

	weekEl.innerHTML = '';
	let thead = document.createElement('thead');
	thead.appendChild(header);
	weekEl.appendChild(thead);
	weekEl.appendChild(tbody);
	weekEl.classList.remove('hidden');
}

function eventDetails(event) {
	let startTime = `${(event.startDate.getHours() % 12) || 12}:${event.startDate.getMinutes() < 10 ? '0' : ''}${event.startDate.getMinutes()}`;
	let endTime = `${(event.endDate.getHours() % 12) || 12}:${event.endDate.getMinutes() < 10 ? '0' : ''}${event.endDate.getMinutes()}`;
	let startM = ampm(event.startDate.getHours());
	let endM = ampm(event.endDate.getHours());

	let eDetails = document.createElement('div');
	eDetails.className = 'details';

	// Show "when" section if enabled
	if (showWhen) {
		let when = document.createElement('span');
		when.className = 'when';
		let whenText = `${DAYS_OF_WEEK[event.startDate.getDay()].substring(0, 3)}, ${MONTHS[event.startDate.getMonth()]} ${event.startDate.getDate()}, ${startTime}${startM} - ${endTime}${endM}`;
		if (event.days == 1 && event.allDay) {
			whenText = `${DAYS_OF_WEEK[event.startDate.getDay()]}, ${MONTHS[event.startDate.getMonth()].substring(0, 3)} ${event.startDate.getDate()}, ${event.startDate.getFullYear()}`;
		} else if (event.days % 1 == 0 && event.allDay) {
			let newEnd = new Date(event.endDate.valueOf());
			newEnd.setDate(newEnd.getDate() - 1);
			whenText = `${MONTHS[event.startDate.getMonth()].substring(0, 3)} ${event.startDate.getDate()} - ${MONTHS[newEnd.getMonth()].substring(0, 3)} ${newEnd.getDate()}, ${event.startDate.getFullYear()}`;
		} else if (event.days > 1) {
			whenText = `${MONTHS[event.startDate.getMonth()]} ${event.startDate.getDate()}, ${startTime}${startM} - ${MONTHS[event.endDate.getMonth()]} ${event.endDate.getDate()}, ${endTime}${endM}`;
		}

		when.appendChild(document.createTextNode(whenText));
		eDetails.appendChild(when);
	}

	if (typeof event.location === 'string' && event.location !== '') {
		if (showWhen) {
			eDetails.appendChild(document.createElement('br'));
		}
		let whereLabel = document.createElement('strong');
		whereLabel.appendChild(document.createTextNode('Where: '));
		let where = document.createElement('span');
		where.className = 'where';
		let whereText = document.createTextNode(event.location);
		if (event.location.startsWith('http')) {
			whereText = document.createElement('a');
			whereText.href = event.location;
			whereText.target = '_blank';
			whereText.appendChild(document.createTextNode(event.location));
		}
		where.appendChild(whereText);
		eDetails.appendChild(whereLabel);
		eDetails.appendChild(where);
	}

	// Show "description" section if enabled
	if (showDescription && event.description != '') {
		if (showWhen || (typeof event.location === 'string' && event.location !== '')) {
			eDetails.appendChild(document.createElement('br'));
		}
		let desc = document.createElement('span');
		desc.className = 'description';
		desc.innerHTML = event.description;
		eDetails.appendChild(desc);
	}

	return eDetails;
}

function renderAgenda(events) {
	// Filter after today
	events = events.filter((e) => {
		let end = new Date(e.endDate.valueOf());
		end.setHours(0, 0, 0, 0);
		return end >= today;
	});

	// Create elements
	let days = [];
	let row;
	let column;
	let prevDay = null;
	let indicator = document.createElement('div');
	indicator.className = 'indicator';
	let nowDate = new Date();
	let now = `${(nowDate.getHours() % 12) || 12}:${nowDate.getMinutes() < 10 ? '0' : ''}${nowDate.getMinutes()}`;
	let nowM = ampm(nowDate.getHours());
	indicator.title = `${now} ${nowM}`;
	let indicatorset = false;
	let todayHasEvents = false;
	for (let i = 0; i < (events.length < AGENDA_DAYS ? events.length : AGENDA_DAYS); i++) {
		let tomorrow = new Date(today.valueOf());
		tomorrow.setDate(tomorrow.getDate() + 1);
		if (events[i].startDate > tomorrow && !todayHasEvents) {
			todayHasEvents = true;
			row = document.createElement('tr');
			row.appendChild(createDateCell(
				events[i].startDate,
				true
			));
			column = document.createElement('td');
			column.className = 'emptyday';
			column.appendChild(document.createTextNode('No events today'));
			row.appendChild(column);
			days.push(row);
		}
		if (prevDay != events[i].startDate.toDateString()) {
			prevDay = events[i].startDate.toDateString();
			row = document.createElement('tr');

			let curDay = new Date(events[i].startDate.valueOf());
			curDay.setHours(0, 0, 0, 0);
			if (curDay.getTime() == today.getTime()) {
				todayHasEvents = true;
			}

			row.appendChild(createDateCell(
				events[i].startDate,
				curDay.getTime() == today.getTime()
			));
			column = document.createElement('td');
		}

		// Indicator
		let eventDay = new Date(events[i].endDate.valueOf());
		eventDay.setHours(0, 0, 0, 0);
		if (nowDate < events[i].endDate && !indicatorset && today.getTime() == eventDay.getTime()) {
			column.appendChild(indicator);
			indicatorset = true;
		}

		let event = document.createElement('div');
		event.className = 'event';

		let summary = document.createElement('div');
		summary.className = 'summary';
		if (show_details == 0) {
			summary.tabIndex = '0';
			summary.onkeypress = (e) => {
				if (e.keyCode === 13) {
					event.classList.toggle('open');
				}
			};
			summary.onclick = () => event.classList.toggle('open');
		} else {
			event.className = 'event open always';
		}

		let eName = document.createElement('span');
		eName.className = 'name';
		eName.appendChild(document.createTextNode(truncateText(events[i].name)));
		summary.appendChild(eName);

		let startTime = `${(events[i].startDate.getHours() % 12) || 12}:${events[i].startDate.getMinutes() < 10 ? '0' : ''}${events[i].startDate.getMinutes()}`;
		let endTime = `${(events[i].endDate.getHours() % 12) || 12}:${events[i].endDate.getMinutes() < 10 ? '0' : ''}${events[i].endDate.getMinutes()}`;
		let startM = ampm(events[i].startDate.getHours());
		let endM = ampm(events[i].endDate.getHours());

		if (!events[i].allDay && showWhen) {
			let eTime = document.createElement('span');
			eTime.className = 'time';
			let timeText = `${startTime} ${startM == endM ? '' : startM} - ${endTime} ${endM}`;
			if (events[i].days === 0) {
				timeText = `${startTime} ${startM}`;
			} else if (events[i].days > 1 && !events[i].allDay) {
				timeText = `${MONTHS[events[i].startDate.getMonth()]} ${events[i].startDate.getDate()}, ${startTime}${startM} - ${MONTHS[events[i].endDate.getMonth()]} ${events[i].endDate.getDate()}, ${endTime}${endM}`;
			}
			eTime.appendChild(document.createTextNode(timeText));
			summary.appendChild(eTime);
		}
		event.appendChild(summary);

		event.appendChild(eventDetails(events[i]));

		column.appendChild(event);

		if (events[i].endDate < nowDate && today.getTime() == eventDay.getTime()) {
			column.appendChild(indicator);
		}

		if (i + 1 == events.length || events[i].startDate.toDateString() != events[i + 1].startDate.toDateString()) {
			row.appendChild(column);
			days.push(row);
		}
	}

	let agenda = document.getElementById('agenda');
	agenda.innerHTML = '';
	agenda.classList.remove('hidden');
	for (let i = 0; i < days.length; i++) {
		agenda.appendChild(days[i]);
	}

	// Empty state
	if (events.length == 0) {
		let emptystate = document.createElement('tr');
		emptystate.id = 'emptystate';
		let emptydata = document.createElement('td');
		emptydata.appendChild(document.createTextNode('No upcoming events'));
		emptystate.appendChild(emptydata);
		agenda.appendChild(emptystate);
	}
}

function showMonthDetails(event) {
	let details = document.getElementById('monthDetails');

	document.querySelector('#monthDetails .summary').innerHTML = event.name;

	document.querySelector('#monthDetails .details').innerHTML = '';
	document.querySelector('#monthDetails .details').appendChild(eventDetails(event));

	details.classList.add('shown');
}

function renderMonth(events, fromDay = new Date(today.valueOf())) {
	let monthStartDate = new Date(fromDay.getFullYear(), fromDay.getMonth(), 1);
	let monthEndDate = new Date(fromDay.getFullYear(), fromDay.getMonth() + 1, 0);
	while (monthStartDate.getDay() != monday_start) {
		monthStartDate.setDate(monthStartDate.getDate() - 1);
	}
	while (monthEndDate.getDay() != (monday_start == 1 ? 0 : 6)) {
		monthEndDate.setDate(monthEndDate.getDate() + 1);
	}
	let days = (monthEndDate - monthStartDate) / (24 * 60 * 60 * 1000) + 1;
	let weeks = days / 7;

	let rows = [];

	// Labels
	let labelRow = document.createElement('tr');
	labelRow.className = 'labels';
	for (let i = 0; i < 7; i++) {
		let label = document.createElement('td');
		let n = i + parseInt(monday_start);
		label.appendChild(document.createTextNode(DAYS_OF_WEEK[(n == 7 ? 0 : n)].substring(0, 3)));
		labelRow.appendChild(label);
	}
	rows.push(labelRow);

	let day = new Date(monthStartDate.valueOf());
	for (let i = 0; i < weeks; i++) {
		let weekRow = document.createElement('tr');
		for (let j = 0; j < 7; j++) {
			let dayCell = document.createElement('td');
			dayCell.dataset.date = getHumanDate(day);
			dayCell.onfocus = () => {
				selectDay(dayCell.dataset.date, false, events);
			};
			dayCell.tabIndex = '-1';
			if (day < today) {
				dayCell.className = 'past';
			}
			let dateEl = document.createElement('span');
			dateEl.classList.add('date');
			if (day.getMonth() == fromDay.getMonth()) {
				dateEl.classList.add('current');
			}
			if (getHumanDate(day) == getHumanDate(today)) {
				dateEl.classList.add('today');
			}
			let dateText = document.createElement('span');
			dateText.appendChild(document.createTextNode(day.getDate()));
			dateEl.appendChild(dateText);
			dayCell.appendChild(dateEl);

			let dayEvents = events.filter((e) => getHumanDate(e.startDate) == getHumanDate(day));

			for (let e = 0; e < dayEvents.length; e++) {
				let event = document.createElement('div');
				event.className = 'event';
				event.tabIndex = '0';
				event.appendChild(document.createTextNode(dayEvents[e].name));
				event.onkeypress = (e) => {
					if (e.keyCode === 13) {
						showMonthDetails(dayEvents[e]);
					}
				};
				event.onclick = () => { showMonthDetails(dayEvents[e]) };
				dayCell.appendChild(event);
			}
			weekRow.appendChild(dayCell);

			day.setDate(day.getDate() + 1);
		}
		rows.push(weekRow);
	}

	let topHeight = 0;
	let topEl = document.getElementById('top');
	if (topEl.style.display != 'none') {
		topHeight = topEl.clientHeight;
	}
	let monthEl = document.getElementById('month');
	monthEl.style.height = `calc(100vh - ${topHeight + 8}px)`;
	monthEl.innerHTML = '';
	monthEl.classList.remove('hidden');
	for (let i = 0; i < rows.length; i++) {
		monthEl.appendChild(rows[i]);
	}
}

function renderCalendar(meta, events) {
	// Sort events
	events.sort((a, b) => a.startDate - b.startDate);

	// Title
	if (show_title == 1) {
		show_title = meta.calname != null;
	}
	if (show_title == 1) {
		document.getElementById('title').innerHTML = meta.calname;
	} else {
		document.getElementById('title').style.display = 'none';
	}

	// Nav
	let btn_today = document.getElementById('btn_today');
	let arrows = document.getElementById('arrows');
	btn_today.onclick = () => {
		// Scroll to today
		selectDay(getHumanDate(today), true, events);
	};
	document.getElementById('btn_prev').onclick = () => {
		let prevDay = new Date(selectedDay.valueOf());
		prevDay.setDate(prevDay.getDate() - 1);
		selectDay(getHumanDate(prevDay), true, events);
	};
	document.getElementById('btn_next').onclick = () => {
		let prevDay = new Date(selectedDay.valueOf());
		prevDay.setDate(prevDay.getDate() + 1);
		selectDay(getHumanDate(prevDay), true, events);
	};
	if (show_nav == 0) {
		btn_today.style.display = 'none';
		arrows.style.display = 'none';
	}

	// View
	let view = document.getElementById('view');
	// Set view to the default_view from URL params
	view.value = default_view;
	selectedView = default_view;
	view.onchange = () => {
		setView(view.value, events);
	};
	if (show_view == 0) {
		view.style.display = 'none';
	}

	// Date
	let date_label = document.getElementById('date_label');
	let date_input = document.getElementById('date');
	document.querySelector('#date_label span').innerHTML = `${DAYS_OF_WEEK[selectedDay.getDay()]}, ${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}`;
	date_input.value = getHumanDate(selectedDay);
	date_input.onchange = () => {
		selectDay(date_input.value, true, events);
	};
	if (show_date == 0) {
		date_label.style.display = 'none';
	}

	// Remove nav element
	if (show_title == 0 && show_nav == 0 && show_date == 0 && show_view == 0) {
		document.getElementById('top').style.display = 'none';
	}

	// Colors
	document.documentElement.style.setProperty('--theme-color', color);
	document.documentElement.style.setProperty('--text-color', colorText);
	document.documentElement.style.setProperty('--background-color', colorBG);
	document.documentElement.style.setProperty('--theme-text-color', colorThemeText);

	setView(selectedView, events);

	loading.classList.remove('loading');
}

function parseCalendar(data) {
	try {
		// Check if data looks like JSON error response from CORS proxy
		if (data.trim().startsWith('{')) {
			try {
				const jsonData = JSON.parse(data);
				if (jsonData.error) {
					throw new Error(`CORS Proxy Error (${jsonData.error.code}): ${jsonData.error.message}`);
				}
			} catch (e) {
				// Not valid JSON or no error field, continue with calendar parsing
			}
		}

		let jCal = ICAL.parse(data);
		let comp = new ICAL.Component(jCal);

		const meta = {
			calname: comp.getFirstPropertyValue('x-wr-calname'),
			timezone: new ICAL.Timezone(comp.getFirstSubcomponent('vtimezone')).tzid,
			caldesc: comp.getFirstPropertyValue('x-wr-caldesc')
		};

	let eventData = comp.getAllSubcomponents('vevent');
	let events = [];

	// Copy event data to custom array
	for (let i = 0; i < eventData.length; i++) {
		let event = new ICAL.Event(eventData[i]);
		let duration = event.endDate.subtractDate(event.startDate);
		events.push({
			uid: event.uid,
			name: event.summary,
			location: event.location,
			description: event.description,
			startDate: event.startDate.toJSDate(),
			endDate: event.endDate.toJSDate(),
			allDay: event.startDate.isDate,
			days: (duration.toSeconds() / 86400)
		});
		if (event.isRecurring()) {
			let expand = new ICAL.RecurExpansion({
				component: eventData[i],
				dtstart: event.startDate
			});

			let j = 0;
			let next;
			while (j < 10 && (next = expand.next())) {
				if (j > 0) {
					let endDate = next.clone();
					endDate.addDuration(duration);
					events.push({
						uid: event.uid,
						name: event.summary,
						location: event.location,
						description: event.description,
						startDate: next.toJSDate(),
						endDate: endDate.toJSDate(),
						allDay: event.startDate.isDate,
						days: (duration.toSeconds() / 86400)
					});
				}
				j++;
			}
		}
	}
	renderCalendar(meta, events);
	} catch (e) {
		console.error('Calendar parsing error:', e);
		loading.innerHTML = `Error parsing calendar: ${e.message}<br><br>
			<strong>Common causes:</strong><br>
			- CORS proxy blocked the request<br>
			- Calendar URL is invalid or inaccessible<br>
			- Calendar data is corrupted or in wrong format<br><br>
			Try using a different CORS proxy or a direct calendar URL.`;
	}
}

if (ical) {
	loading.classList.add('loading');
	fetch(ical).then((response) => {
		response.text().then((text) => {
			parseCalendar(text);
		});
	}).catch((e) => {
		console.error(e);
		loading.innerHTML = "Error: iCal URL doesn't exist or isn't valid<br><br>Common causes:<br>- CORS proxy blocked the request<br>- Calendar URL is unreachable<br>- Network connectivity issue";
		loading.classList.remove('loading');
	});
} else {
	loading.innerHTML = "Error: no iCal URL provided";
	loading.classList.add('loading');
}
