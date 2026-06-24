# ExtUI — Reusable Firefox Extension UI Library

Dark / OLED aesthetic dashboard & popup components for Firefox extensions (Manifest V3).

Drop this folder into any extension and build settings pages, popups, and dashboards in minutes.

---

## Quick Start

1. Copy the `ext-ui-lib/` folder into your extension root
2. Add to your HTML (dashboard or popup):

```html
<link rel="stylesheet" href="ext-ui-lib/ext-ui-lib.css">
<script src="ext-ui-lib/ext-ui-lib.js"></script>
```

3. Use the `ExtUI` global namespace

---

## Components (30 total)

### Layout

| Component | Description |
|---|---|
| `new ExtUI.Dashboard(opts)` | Sidebar + tab router with brand header |
| `new ExtUI.TabPanel(opts)` | Named tab panel for Dashboard |
| `ExtUI.createHTabs(opts)` | Horizontal inline tabs (no sidebar) |
| `ExtUI.createSection(opts)` | Generic section card |

### Settings & Forms

| Component | Description |
|---|---|
| `ExtUI.createSettingRow(opts)` | Toggle / number / text setting with getter/setter |
| `ExtUI.createColorPicker(opts)` | Color swatch + hex input |
| CSS: `.eui-form-group`, `.eui-form-label`, `.eui-form-hint`, `.eui-form-error` | Labeled form fields |
| CSS: `.eui-select`, `.eui-textarea`, `.eui-checkbox-row`, `.eui-radio-row` | Additional inputs |

### Lists & Data

| Component | Description |
|---|---|
| `new ExtUI.SortableList(opts)` | Drag-and-drop reorderable list |
| `new ExtUI.HistoryView(opts)` | List with per-item action buttons |
| `ExtUI.createTable(opts)` | Sortable data table |
| `ExtUI.createFilter(opts)` | Live-filter input that hides/shows list items |
| `ExtUI.createCardGrid(opts)` | Responsive grid of cards (image, title, desc, tag, footer) |

### Modals & Notifications

| Component | Description |
|---|---|
| `ExtUI.Modal.alert(opts)` | Promise-based themed alert (returns on close) |
| `ExtUI.Modal.confirm(opts)` | Promise-based confirm dialog (returns true/false) |
| `ExtUI.Modal.prompt(opts)` | Promise-based prompt with input (returns value or null) |
| `ExtUI.Toast.show(msg, type, duration)` | Non-blocking slide-in notification |
| `ExtUI.createBanner(opts)` | Dismissible notification/permission banner |

### Popup

| Component | Description |
|---|---|
| `ExtUI.Popup.init(opts)` | Full popup shell (header, list, footer) |
| `ExtUI.Popup.createItem(opts)` | Expandable list item with action buttons |
| `ExtUI.createQuickActions(opts)` | Icon grid for popup actions (3 or 2 columns) |
| `ExtUI.createSearchBar(opts)` | Search input with dropdown results & keyboard nav |

### Display

| Component | Description |
|---|---|
| `ExtUI.createAbout(opts)` | Logo, name, version, links, changelog |
| `ExtUI.createStatsGrid(opts)` | Big-number stat cards with change indicators |
| `ExtUI.createCodeBlock(opts)` | Monospace code block with copy button |
| `ExtUI.createProgress(opts)` | Progress bar (optionally striped + labeled) |
| `ExtUI.Skeleton` | Loading placeholder helpers (text, heading, avatar, row, rows) |

### Utility

| Component | Description |
|---|---|
| `ExtUI.createPreview(opts)` | URL/value preview with test button |
| `ExtUI.createImportExport(opts)` | Config backup/restore pair |
| `ExtUI.createShortcutsList(opts)` | Keyboard shortcut display |
| `ExtUI.createAccordion(opts)` | Collapsible sections (single or multi) |

### Helpers

```js
ExtUI.timeAgo(1700000000000);     // "2d ago"
ExtUI.truncate('long string', 10); // "long stri..."
ExtUI.escapeHtml('<script>');      // "&lt;script&gt;"
ExtUI.createEl('div', 'my-class', 'Hello'); // DOM element
```

---

## API Reference

### Modal

```js
// Alert — returns Promise
await ExtUI.Modal.alert({
  type: 'danger',       // danger | success | warn | info
  title: 'Error',
  message: 'Something went wrong.',
  okText: 'Got it',   // optional
  icon: true,          // set false to hide icon
});

// Confirm — returns Promise<boolean>
var ok = await ExtUI.Modal.confirm({
  type: 'danger',
  title: 'Delete all history?',
  message: 'This cannot be undone.',
  okText: 'Delete',
  cancelText: 'Cancel',
});

// Prompt — returns Promise<string|null>
var value = await ExtUI.Modal.prompt({
  title: 'Rename',
  message: 'Enter new name:',
  defaultValue: 'old name',
  placeholder: 'Name...',
});
if (value !== null) { /* user typed something */ }

// Close all open modals
ExtUI.Modal.closeAll();
```

### Toast

```js
var toast = ExtUI.Toast.show('Settings saved!', 'success');
// Auto-hides after 4 seconds. Returns { hide: fn } for manual dismiss.

ExtUI.Toast.show('Failed to connect', 'danger', 6000);
ExtUI.Toast.show('Heads up', 'warn');
ExtUI.Toast.show('Tip: use Ctrl+Shift+S', 'info', 8000);
```

### Banner

```js
ExtUI.createBanner({
  container: someEl,
  type: 'warn',
  title: 'Permission needed',
  description: 'This extension needs clipboard access.',
  actions: [
    { label: 'Grant', accent: true, onClick: function() { /* ... */ } },
  ],
  dismissable: true,   // default true
});
```

### About

```js
ExtUI.createAbout({
  container: someEl,
  logo: 'icons/icon.svg',
  name: 'My Extension',
  version: 'v1.2.0',
  description: 'A short description of the extension.',
  links: [
    { label: 'GitHub', url: 'https://github.com/...' },
    { label: 'AMO',   url: 'https://addons.mozilla.org/...' },
  ],
  changelog: [
    { version: '1.2.0', date: '2025-01-15', changes: ['Added feature X', 'Fixed bug Y'] },
    { version: '1.1.0', date: '2025-01-01', changes: ['Initial release'] },
  ],
});
```

### Horizontal Tabs

```js
var tab1Content = document.createElement('div');
tab1Content.textContent = 'Content for Tab 1';

var ht = ExtUI.createHTabs({
  container: someEl,
  tabs: [
    { id: 'general',  label: 'General',  content: tab1Content },
    { id: 'advanced', label: 'Advanced', content: someOtherEl },
  ],
});

// Programmatic switch
ht.switchTab('advanced');
```

### Accordion

```js
ExtUI.createAccordion({
  container: someEl,
  single: true,  // only one open at a time
  items: [
    { title: 'Section 1', content: 'Some text or a DOM element', open: true },
    { title: 'Section 2', content: document.createElement('div') },
  ],
});
```

### Card Grid

```js
ExtUI.createCardGrid({
  container: someEl,
  cards: [
    {
      title: 'My Extension',
      description: 'A cool Firefox extension.',
      image: 'https://...',
      tag: 'Featured',
      footer: '522 users',
      url: 'https://addons.mozilla.org/...',  // makes it a link
    },
    {
      title: 'Another',
      description: 'Click handler version.',
      onClick: function() { /* ... */ },
    },
  ],
});
```

### Stats Grid

```js
ExtUI.createStatsGrid({
  container: someEl,
  stats: [
    { value: '1,247', label: 'Total Searches', change: '+12%' },
    { value: '8',    label: 'Custom Engines' },
    { value: '4.2s', label: 'Avg Response', change: '-8%' },
  ],
});
```

### Data Table

```js
var table = ExtUI.createTable({
  container: someEl,
  emptyText: 'No data available.',
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status' },
    { key: 'count', label: 'Searches', sortable: true, render: function(td, val) { td.textContent = val.toLocaleString(); } },
  ],
  rows: [
    { name: 'Google Lens', status: 'Active', count: 523 },
    { name: 'TinEye', status: 'Active', count: 120 },
  ],
  onSort: function(key, direction) { /* re-sort and call table.setRows() */ },
});

// Update data later
table.setRows(newDataArray);
```

### Filter

```js
ExtUI.createFilter({
  container: someEl,
  target: someEl,              // parent to search within
  selector: '.eui-sortable-item',  // CSS selector for filterable items
  placeholder: 'Filter engines...',
  onFilter: function(query, count) { /* optional callback */ },
});
```

### Code Block

```js
ExtUI.createCodeBlock({
  container: someEl,
  language: 'json',
  code: '{"key": "value"}',
});
```

### Progress

```js
var progress = ExtUI.createProgress({
  container: someEl,
  value: 65,
  leftLabel: 'Uploading...',
  striped: true,
  showLabel: true,    // shows "65%" on the right
});

// Update later
progress.setValue(100);
```

### Skeleton Loading

```js
// Quick placeholders
listEl.appendChild(ExtUI.Skeleton.row());
listEl.appendChild(ExtUI.Skeleton.rows(5));

// Custom
var skel = ExtUI.Skeleton.text('70%');
var heading = ExtUI.Skeleton.heading('50%');
var avatar = ExtUI.Skeleton.avatar();
```

### Quick Actions Grid (Popup)

```js
ExtUI.createQuickActions({
  container: someEl,
  columns: 2,  // default 3
  actions: [
    { id: 'search', label: 'Search', icon: '\uD83D\uDD0D', onClick: function() { /* ... */ } },
    { id: 'settings', label: 'Settings', icon: '\u2699', onClick: function() { /* ... */ } },
    { id: 'about', label: 'About', icon: '\u2139', onClick: function() { /* ... */ } },
  ],
});
```

### Search Bar (Popup)

```js
ExtUI.createSearchBar({
  container: popupSection,
  placeholder: 'Search engines...',
  onSearch: function(query, showResults) {
    var results = items.filter(function(item) {
      return item.name.toLowerCase().indexOf(query) !== -1;
    });
    showResults(results, query);
  },
  onSelect: function(item) { /* navigate or act */ },
});
```

### Color Picker

```js
var picker = ExtUI.createColorPicker({
  container: someEl,
  value: '#58a6ff',
});
picker.onChange(function(hex) {
  // Apply to theme
  document.documentElement.style.setProperty('--eui-accent', hex);
});
```

---

## Theming

Override CSS custom properties to change the look:

```css
:root {
  --eui-bg:         #0a0a0f;
  --eui-surface:    #111118;
  --eui-surface-2:  #1a1a24;
  --eui-surface-3:  #22222e;
  --eui-border:     #2a2a3a;
  --eui-border-hi:  #3a3a50;
  --eui-text:       #e2e2ea;
  --eui-text-dim:   #8b8b9e;
  --eui-text-dimmer:#5c5c72;
  --eui-accent:     #58a6ff;
  --eui-accent-dim: rgba(88,166,255,.12);
  --eui-danger:     #f85149;
  --eui-success:    #3fb950;
  --eui-warn:       #f0883e;
  --eui-radius:     10px;
  --eui-radius-sm:  6px;
  --eui-sidebar-w:  200px;
}
```

All component classes use the `eui-` prefix to avoid conflicts with your extension styles.

---

## File Structure

```
ext-ui-lib/
├── ext-ui-lib.css   — Full design system (~2100 lines)
├── ext-ui-lib.js    — All 30 components (~1900 lines)
└── README.md        — This file
```

---

## Browser Compatibility

Designed for Firefox Manifest V3. Uses `var` and `function` declarations (no arrow functions in the library itself) for maximum compatibility. Works in Chrome MV3 as well if you swap `browser.*` for `chrome.*` in your extension code.

---

## License

MIT