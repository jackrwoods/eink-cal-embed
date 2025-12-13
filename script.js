const CORS_URL = 'https://cors-anywhere.herokuapp.com/';

const ical_field = document.getElementById('ical');
const show_title_field = document.getElementById('show_title');
const show_nav_field = document.getElementById('show_nav');
const show_date_field = document.getElementById('show_date');
const show_details_field = document.getElementById('show_details');
const show_view_field = document.getElementById('show_view');
const show_when_field = document.getElementById('show_when');
const show_description_field = document.getElementById('show_description');
const monday_start_field = document.getElementById('monday_start');
const default_view_field = document.getElementById('default_view');
const font_family_field = document.getElementById('font_family');
const min_hour_field = document.getElementById('min_hour');
const max_hour_field = document.getElementById('max_hour');
const color_field = document.getElementById('color');
const colorbg_field = document.getElementById('colorbg');
const colortxt_field = document.getElementById('colortxt');
const colorsectxt_field = document.getElementById('colorsecondarytxt');
const embed_field = document.getElementById('embed_link');
const copy_button = document.getElementById('copy_url');
const cors_button = document.getElementById('add_cors');
const iframe = document.getElementById('iframe');

// Defaults
let ical = 'https://gra0007.github.io/modern-cal-embed/example.ics';
let show_title = 1;
let show_nav = 1;
let show_date = 1;
let show_details = 0;
let show_view = 1;
let show_when = 1;
let show_description = 1;
let monday_start = 0;
let default_view = 0;
let font_family = 'open-sans';
let min_hour = '';
let max_hour = '';
let color = '#8B6F47';
let colorbg = '#FEFEF8';
let colortxt = '#3E3E3E';
let colorsecondarytxt = '#FFFFFF';

// Reload iframe with new params
function refresh() {
	let minHourParam = min_hour !== '' ? `&minhour=${encodeURIComponent(min_hour)}` : '';
	let maxHourParam = max_hour !== '' ? `&maxhour=${encodeURIComponent(max_hour)}` : '';
	let fontParam = font_family !== 'open-sans' ? `&font=${encodeURIComponent(font_family)}` : '';
	let whenParam = show_when === 0 ? `&when=${show_when}` : '';
	let descParam = show_description === 0 ? `&desc=${show_description}` : '';
	let embed = `${document.URL.substr(0, document.URL.lastIndexOf('/'))}/iframe.html?ical=${encodeURIComponent(ical)}&title=${show_title}&nav=${show_nav}&date=${show_date}&view=${show_view}&details=${show_details}&monstart=${monday_start}&dview=${default_view}&color=${encodeURIComponent(color)}&colorbg=${encodeURIComponent(colorbg)}&colortxt=${encodeURIComponent(colortxt)}&colorsecondarytxt=${encodeURIComponent(colorsecondarytxt)}${minHourParam}${maxHourParam}${fontParam}${whenParam}${descParam}`;
	embed_field.value = embed;
	iframe.src = embed;
}

// Apply font to iframe preview
function applyFontToFrame() {
	const frameBody = document.getElementById('iframe').contentDocument?.body;
	if (frameBody) {
		frameBody.classList.remove('font-fuzzy-bubbles', 'font-crimson-text');
		if (font_family === 'fuzzy-bubbles') {
			frameBody.classList.add('font-fuzzy-bubbles');
		} else if (font_family === 'crimson-text') {
			frameBody.classList.add('font-crimson-text');
		}
	}
}

ical_field.addEventListener('change', () => {
	ical = ical_field.value;
	refresh();
});

show_title_field.addEventListener('change', () => {
	show_title = show_title_field.checked ? 1 : 0;
	refresh();
});

show_nav_field.addEventListener('change', () => {
	show_nav = show_nav_field.checked ? 1 : 0;
	refresh();
});

show_date_field.addEventListener('change', () => {
	show_date = show_date_field.checked ? 1 : 0;
	refresh();
});

show_details_field.addEventListener('change', () => {
	show_details = show_details_field.checked ? 1 : 0;
	refresh();
});

show_view_field.addEventListener('change', () => {
	show_view = show_view_field.checked ? 1 : 0;
	refresh();
});

show_when_field.addEventListener('change', () => {
	show_when = show_when_field.checked ? 1 : 0;
	refresh();
});

show_description_field.addEventListener('change', () => {
	show_description = show_description_field.checked ? 1 : 0;
	refresh();
});

monday_start_field.addEventListener('change', () => {
	monday_start = monday_start_field.checked ? 1 : 0;
	refresh();
});

color_field.addEventListener('change', () => {
	color = color_field.value;
	refresh();
});
colorbg_field.addEventListener('change', () => {
	colorbg = colorbg_field.value;
	refresh();
});
colortxt_field.addEventListener('change', () => {
	colortxt = colortxt_field.value;
	refresh();
});
colorsectxt_field.addEventListener('change', () => {
	colorsecondarytxt = colorsectxt_field.value;
	refresh();
});

default_view_field.addEventListener('change', () => {
	default_view = default_view_field.value;
	refresh();
});

font_family_field.addEventListener('change', () => {
	font_family = font_family_field.value;
	refresh();
	// Apply font to preview after iframe loads
	setTimeout(applyFontToFrame, 100);
});

min_hour_field.addEventListener('change', () => {
	min_hour = min_hour_field.value;
	refresh();
});

max_hour_field.addEventListener('change', () => {
	max_hour = max_hour_field.value;
	refresh();
});

// Palette selector buttons
document.querySelectorAll('.palette-btn').forEach(btn => {
	btn.addEventListener('click', () => {
		const colors = JSON.parse(btn.getAttribute('data-colors'));
		color = colors.color;
		colorbg = colors.colorbg;
		colortxt = colors.colortxt;
		colorsecondarytxt = colors.colorsecondarytxt;

		// Update form fields
		color_field.value = color;
		colorbg_field.value = colorbg;
		colortxt_field.value = colortxt;
		colorsectxt_field.value = colorsecondarytxt;

		refresh();
	});
});

copy_button.addEventListener('click', () => {
	embed_field.select();
	embed_field.setSelectionRange(0, 99999);
	document.execCommand("copy");
	copy_button.innerHTML = 'Copied!';
	window.setTimeout(() => {
		copy_button.innerHTML = 'Copy';
	}, 1000);
});

cors_button.addEventListener('click', () => {
	if (!ical_field.value.startsWith(CORS_URL)) {
		ical_field.value = CORS_URL + ical_field.value;
	}
	ical = ical_field.value;
	refresh();
});

refresh();
