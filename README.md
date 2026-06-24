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

## Components

### `ExtUI.Dashboard` — Sidebar + Tab Router

Creates a full dashboard layout with a sticky sidebar, brand header, and tab navigation.

```js
var dash = new ExtUI.Dashboard({
  brandIcon:  'icons/icon.svg',     // optional
  brandTitle: 'My Extension',
  tabs: [
    { id: 'general',  label: 'General',  icon: '<svg ...></svg>' },
    { id: 'settings', label: 'Settings', icon: '<svg ...></svg>' },
  ],
  defaultTab: 'general',
});

document.body.appendChild(dash.element);

// Append content into the main area
dash.tabContent.appendChild(someElement);

// Programmatic tab switch
dash.switchTab('settings');

// Listen for tab changes
dash.onTabChange(function(tabId) {
  console.log('Switched to', tabId);
});
```

### `ExtUI.TabPanel` — Named Tab Content

Creates a tab panel that integrates with a `Dashboard`.

```js
var panel = new ExtUI.TabPanel({
  id:          'settings',
  title:       'Settings',
  description: 'Configure how the extension behaves.',
  dashboard:   dash,           // the Dashboard instance
  headerActions: clearButton,  // optional DOM element (e.g. a button)
});

// Append content
panel.body.appendChild(mySettingsGrid);
```

### `ExtUI.createSettingRow()` — Toggle / Number / Text Setting

Creates a setting row with label, description, and a control.

**Toggle:**
```js
var row = ExtUI.createSettingRow({
  label:       'Feature Name',
  description: 'What it does',
  type:        'toggle',
  checked:     true,
  onChange:     function(val) { console.log(val); },
});

settingsGrid.appendChild(row.element);

// Later:
row.setValue(false);
var current = row.getValue();
```

**Number:**
```js
var row = ExtUI.createSettingRow({
  label:       'Max Items',
  description: 'Older entries are removed',
  type:        'number',
  value:       100,
  min:         10,
  max:         500,
  step:        10,
  onChange:     function(val) { saveMaxHistory(val); },
});
```

**Text:**
```js
var row = ExtUI.createSettingRow({
  label:       'API Key',
  description: 'Your service API key',
  type:        'text',
  value:       '',
  placeholder: 'sk-...',
  onChange:     function(val) { saveApiKey(val); },
});
```

### `ExtUI.SortableList` — Drag-and-Drop Reorderable List

```js
var list = new ExtUI.SortableList({
  container: someElement,
  items: [
    { id: 'a', name: 'Item A', enabled: true },
    { id: 'b', name: 'Item B', enabled: false, badge: 'Custom' },
  ],
  showToggle:   true,
  showRemove:   true,
  removableIds: ['b'],   // only these IDs show remove button
  onToggle:     function(id, val) { ... },
  onRemove:     function(id) { ... },
  onReorder:    function(newItems) { ... },
});

// Update later:
list.setItems(newItemsArray);
var current = list.getItems();
```

### `ExtUI.HistoryView` — Expandable List with Action Buttons

```js
var hv = new ExtUI.HistoryView({
  container: someElement,
  emptyText: 'No items yet.',
  onAction: function(itemId, actionId, entry) {
    console.log('Action', actionId, 'on item', itemId);
  },
});

// Set items
hv.setItems([
  {
    id: 'h1',
    title: 'https://example.com/photo.jpg',
    meta: 'Google Lens, TinEye \u00B7 5m ago',
    primaryActions: [
      { id: 'google', label: 'Google Lens' },
    ],
    secondaryActions: [
      { id: 'yandex', label: 'Yandex' },
    ],
    allAction: { id: 'all', label: 'All' },
  },
]);

// Clear
hv.clear();
```

### `ExtUI.Popup` — Browser Action Popup Shell

```js
var popup = ExtUI.Popup.init({
  container:     document.body,
  logo:          'icons/icon.svg',
  title:         'My Extension',
  version:       'v1',
  sectionLabel:  'Recent Items',
  emptyText:     'No items yet.',
  footerButtons: [
    { label: 'Clear', onClick: function() { ... } },
    { label: 'Settings', className: 'eui-popup-footer-accent', onClick: function() { ... } },
  ],
});

// popup.listEl  → append ExtUI.Popup.createItem() here
// popup.emptyEl → toggle display
```

**Create expandable popup items:**
```js
var item = ExtUI.Popup.createItem({
  title:           'https://example.com/photo.jpg',
  meta:            'Google Lens \u00B7 5m ago',
  thumbnailUrl:    'https://...',           // optional
  placeholderIcon: '\uD83D\uDD0D',          // optional fallback
  primaryActions: [
    { id: 'google', label: 'Google Lens' },
  ],
  secondaryActions: [
    { id: 'yandex', label: 'Yandex' },
  ],
  allAction: { id: 'all', label: 'All' },
  data: { imageUrl: 'https://example.com/photo.jpg' },
  onAction: function(actionId, data) {
    console.log(actionId, data);
  },
});

popup.listEl.appendChild(item);
```

### `ExtUI.createImportExport()` — Config Backup / Restore

```js
ExtUI.createImportExport({
  container:   someElement,
  title:       'Import / Export',
  description: 'Back up or restore your configuration.',
  filename:    'my-extension-config',
  onExport:    function() {
    // Return a JSON string or object (auto-downloads as .json)
    return { settingA: true, settingB: 'hello' };
  },
  onImport:    function(jsonObject) {
    // Apply imported settings
    applySettings(jsonObject);
  },
  onError:     function(message) { alert(message); },
});
```

### `ExtUI.createShortcutsList()` — Keyboard Shortcut Display

```js
ExtUI.createShortcutsList({
  container: someElement,
  title: 'Keyboard Shortcuts',
  shortcuts: [
    { keys: 'Ctrl+Shift+S', description: 'Search hovered image' },
    { keys: 'Ctrl+Shift+B', description: 'Toggle batch mode' },
  ],
  footnote: 'Change shortcuts at about:addons.',
});
```

### `ExtUI.createSection()` — Generic Section Card

```js
var sec = ExtUI.createSection({
  container:   someElement,
  title:       'Section Title',
  description: 'What this section does.',
});
sec.body.appendChild(myContent);
```

### `ExtUI.createPreview()` — URL / Value Preview Tool

```js
var pv = ExtUI.createPreview({
  container:   someElement,
  title:       'Live Preview',
  description: 'Paste a URL to see how it resolves.',
  placeholder: 'https://example.com/photo.jpg',
  buttonText:  'Test',
  onPreview:   function(value) {
    return [
      { label: 'Engine A', value: 'https://resolved-url.com/...', disabled: false },
      { label: 'Engine B', value: 'https://other.com/...', disabled: true },
    ];
  },
});
```

---

## Helpers

```js
ExtUI.timeAgo(1700000000000);     // "2d ago"
ExtUI.truncate('long string', 10); // "long stri\u2026"
ExtUI.escapeHtml('<script>');      // "&lt;script&gt;"
ExtUI.createEl('div', 'my-class', 'Hello'); // DOM element
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
├── ext-ui-lib.css   — Full design system (~450 lines)
├── ext-ui-lib.js    — All components (~520 lines)
└── README.md        — This file
```

---

## Browser Compatibility

Designed for Firefox Manifest V3. Uses `var` and `function` declarations (no arrow functions in the library itself) for maximum compatibility. Works in Chrome MV3 as well if you swap `browser.*` for `chrome.*` in your extension code.

---

## License

MIT