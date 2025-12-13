# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based iCal calendar embed tool. It allows users to:
- Input an iCal (.ics) calendar URL
- Configure display options (title, navigation, date, view type, colors, etc.)
- Generate an embeddable iframe that can be placed on any website
- Preview the calendar in three view modes: Agenda, Month, and Week

The project is entirely client-side JavaScript with no build process or package management.

## Architecture

### Two-Part System

1. **Configuration Page** (`index.html`, `script.js`, `style.css`)
   - Main interface where users input iCal URLs and adjust settings
   - Generates a shareable embed URL with all configuration parameters
   - Settings are passed as query parameters to the iframe

2. **Embed/Display Page** (`iframe.html`, `embed.js`, `embed.css`)
   - Loads as an iframe from the configuration page
   - Reads settings from URL query parameters
   - Parses iCal data using `ical.js` library and renders it
   - Independent of the configuration page and can be embedded standalone

### Key Components

- **ical.min.js**: Mozilla's iCal.js library (bundled) for parsing iCal files
- **embed.js**: Core calendar rendering logic (~600+ lines)
  - Handles three view modes (Agenda, Month, Week)
  - Manages date selection and navigation
  - Parses and displays events
  - Handles URL parameter reading

- **script.js**: Configuration page UI logic
  - Manages form inputs and checkboxes
  - Updates iframe with new parameters via URL
  - CORS proxy helper for calendar URLs that don't allow cross-origin requests

### Configuration Parameters

Query parameters passed to iframe (defined in embed.js):
- `ical`: URL to the iCal file (encoded)
- `title`: Show/hide calendar title (0 or 1)
- `nav`: Show/hide navigation buttons (0 or 1)
- `date`: Show/hide date display (0 or 1)
- `details`: Always show event details (0 or 1)
- `view`: Show/hide view selector (0 or 1)
- `monstart`: Start week on Monday instead of Sunday (0 or 1)
- `dview`: Default view mode (0=Agenda, 1=Month, 2=Week)
- `color`: Theme color (hex)
- `colorbg`: Background color (hex)
- `colortxt`: Text color (hex)
- `colorsecondarytxt`: Theme text color (hex)

## Development Notes

### Static Site
This is a static HTML/CSS/JavaScript project. No build tools, npm, or build process exists. Files are served directly.

### CORS Limitations
By default, many iCal URLs (especially Google Calendar) don't set proper CORS headers. The app includes a "Add cors proxy to url" button that prepends `https://cors-anywhere.herokuapp.com/` to bypass this.

### Event Rendering
Calendar events are parsed from iCal format and rendered into three different view types:
- **Agenda**: Chronological list view
- **Month**: Traditional calendar grid
- **Week**: Hour-by-hour time grid

Each view has separate rendering logic in embed.js.

### Styling
- Colors are dynamically applied via CSS custom properties (`--background-color`, etc.)
- embed.css handles all embed styling
- style.css handles configuration page styling
- Embed is sized at 800x480px by default

### Known Dependencies
- `ical.js` (bundled as ical.min.js) - Required for parsing iCal data
- No npm dependencies or build process
- Uses vanilla JavaScript (no frameworks)

## Common Tasks

### Testing the Calendar Embed
1. Open `index.html` in a browser
2. The default example iCal URL is already filled in
3. Adjust settings in the left panel to see live preview in the iframe
4. Copy the generated embed link to test embedding elsewhere

### Adding a New Setting
1. Add checkbox/input to `index.html` in the settings section
2. Add JavaScript variable and event listener in `script.js` to track changes
3. Add corresponding parameter to the `refresh()` function's embed URL
4. In `iframe.html` (embed.js), read the parameter from `url.searchParams.get()`
5. Use the parameter in the rendering logic to modify behavior

### Modifying Views
Calendar rendering happens in three functions in embed.js:
- `renderAgenda(events)`: Chronological list
- `renderMonth(events)`: Grid calendar
- `renderWeek(events)`: Hour-by-hour grid

Each function populates a corresponding table element in iframe.html.

### Styling Changes
- Configuration page: Edit `style.css`
- Calendar embed: Edit `embed.css` (remembers to account for dynamic color variables)

## File Structure
```
.
├── index.html              # Configuration page
├── iframe.html             # Embed page (rendered in iframe)
├── script.js               # Configuration page logic
├── embed.js                # Calendar rendering logic (~700 lines)
├── style.css               # Configuration page styles
├── embed.css               # Calendar embed styles (~300 lines)
├── ical.min.js             # iCal.js library (minified)
├── ical.min.js.map         # Source map for ical.js
├── example.ics             # Example iCal file for testing
├── favicon.ico             # Site favicon
├── README.md               # User-facing documentation
├── LICENSE                 # MIT License
└── CLAUDE.md               # This file
```
