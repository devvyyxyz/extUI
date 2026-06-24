/* ============================================================
   ExtUI — Reusable Firefox Extension UI Library (JS)

   Global namespace:  window.ExtUI

   Components:
     ExtUI.Dashboard         — sidebar + tab router
     ExtUI.createSettingRow  — toggle / number / text setting
     ExtUI.SortableList      — drag-and-drop reorderable list
     ExtUI.HistoryView       — expandable list with action buttons
     ExtUI.Popup             — popup shell (header + footer + list)
     ExtUI.createImportExport— config backup / restore pair
     ExtUI.createShortcutsList — keyboard shortcut display

   Helpers:
     ExtUI.timeAgo(ts)
     ExtUI.truncate(str, max)
     ExtUI.escapeHtml(s)
     ExtUI.createEl(tag, className, textContent)
   ============================================================ */

(function (root) {
  "use strict";

  /* ── Helpers ─────────────────────────────────────────────── */

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + "\u2026" : str;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function createEl(tag, className, textContent) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent !== undefined && textContent !== null) el.textContent = textContent;
    return el;
  }

  /* ═══════════════════════════════════════════════════════════
     DASHBOARD — Sidebar + Tab Router
     ═══════════════════════════════════════════════════════════
     Usage:
       var dash = new ExtUI.Dashboard({
         brandIcon:  'icons/icon.svg',   // optional
         brandTitle: 'My Extension',
         tabs: [
           { id: 'general', label: 'General', icon: '<svg ...></svg>' },
           { id: 'settings', label: 'Settings', icon: '<svg ...></svg>' },
         ],
         defaultTab: 'general',          // optional, defaults to first
       });
       // dash.tabContent   → DOM element where you append tab panels
       // dash.switchTab(id)  → programmatic tab switch
       // dash.onTabChange(callback)  → fires on every switch
     ═══════════════════════════════════════════════════════════ */

  function Dashboard(opts) {
    var self = this;
    opts = opts || {};

    // Root layout
    var layout = createEl("div", "eui-layout");
    var sidebar = createEl("div", "eui-sidebar");
    var main = createEl("div", "eui-main");

    // Brand
    var brand = createEl("div", "eui-sidebar-brand");
    if (opts.brandIcon) {
      var brandImg = createEl("img");
      brandImg.src = opts.brandIcon;
      brandImg.alt = "";
      brandImg.width = 24;
      brandImg.height = 24;
      brand.appendChild(brandImg);
    }
    var brandTitle = createEl("span", "eui-sidebar-title", opts.brandTitle || "Settings");
    brand.appendChild(brandTitle);
    sidebar.appendChild(brand);

    // Nav
    var nav = createEl("ul", "eui-nav");
    var tabs = opts.tabs || [];

    var currentTab = opts.defaultTab || (tabs.length ? tabs[0].id : null);

    tabs.forEach(function (tab) {
      var li = createEl("li");
      var btn = createEl("button", "eui-nav-btn" + (tab.id === currentTab ? " active" : ""));
      btn.dataset.tab = tab.id;
      if (tab.icon) {
        var wrapper = document.createElement("span");
        wrapper.innerHTML = tab.icon;
        while (wrapper.firstChild) btn.appendChild(wrapper.firstChild);
      }
      btn.appendChild(createEl("span", null, tab.label));

      btn.addEventListener("click", function () {
        self.switchTab(tab.id);
      });

      li.appendChild(btn);
      nav.appendChild(li);
    });

    sidebar.appendChild(nav);
    layout.appendChild(sidebar);
    layout.appendChild(main);

    self.element = layout;
    self.sidebar = sidebar;
    self.tabContent = main;
    self._currentTab = currentTab;
    self._navBtns = nav.querySelectorAll(".eui-nav-btn");
    self._tabChangeCallbacks = [];

    // Public: switch tab
    self.switchTab = function (id) {
      self._navBtns.forEach(function (b) { b.classList.toggle("active", b.dataset.tab === id); });
      // Hide all direct children of main (tab panels)
      var panels = main.children;
      for (var i = 0; i < panels.length; i++) {
        panels[i].style.display = panels[i].id === "eui-tab-" + id ? "block" : "none";
      }
      self._currentTab = id;
      self._tabChangeCallbacks.forEach(function (cb) { cb(id); });
    };

    // Public: listen for tab changes
    self.onTabChange = function (cb) {
      self._tabChangeCallbacks.push(cb);
    };
  }

  /* ═══════════════════════════════════════════════════════════
     TAB PANEL — Creates a named tab panel for Dashboard
     ═══════════════════════════════════════════════════════════
     Usage:
       var panel = new ExtUI.TabPanel({
         id: 'general',
         title: 'General Settings',
         description: 'Configure core behaviour.',
         dashboard: dash,   // the Dashboard instance
       });
       panel.element  → DOM element to append content into
     ═══════════════════════════════════════════════════════════ */

  function TabPanel(opts) {
    opts = opts || {};
    var panel = createEl("div", null, null);
    panel.id = "eui-tab-" + (opts.id || "tab");

    var header = createEl("div", "eui-tab-header");

    if (opts.title) {
      var h2 = createEl("h2", null, opts.title);
      if (opts.headerActions) {
        var row = createEl("div", "eui-tab-header-row");
        row.appendChild(h2);
        row.appendChild(opts.headerActions);
        header.appendChild(row);
      } else {
        header.appendChild(h2);
      }
    }

    if (opts.description) {
      header.appendChild(createEl("p", "eui-tab-desc", opts.description));
    }

    panel.appendChild(header);

    // Hide if not the active tab
    var dash = opts.dashboard;
    if (dash && dash._currentTab !== opts.id) {
      panel.style.display = "none";
    }

    if (dash) {
      dash.tabContent.appendChild(panel);
    }

    this.element = panel;
    this.body = panel; // alias — users append children here
  }

  /* ═══════════════════════════════════════════════════════════
     SETTING ROW — Toggle / Number / Text
     ═══════════════════════════════════════════════════════════
     Usage (toggle):
       ExtUI.createSettingRow({
         label: 'Feature Name',
         description: 'What it does',
         type: 'toggle',
         checked: true,
         onChange: function(val) { ... },
       });

     Usage (number):
       ExtUI.createSettingRow({
         label: 'Max Items',
         description: 'Older entries are removed',
         type: 'number',
         value: 100,
         min: 10,
         max: 500,
         step: 10,
         onChange: function(val) { ... },
       });
     ═══════════════════════════════════════════════════════════ */

  function createSettingRow(opts) {
    var row = createEl("div", "eui-setting-row");

    // Info
    var info = createEl("div", "eui-setting-info");
    info.appendChild(createEl("span", "eui-setting-label", opts.label));
    if (opts.description) {
      info.appendChild(createEl("span", "eui-setting-desc", opts.description));
    }
    row.appendChild(info);

    if (opts.type === "toggle") {
      var toggle = createEl("label", "eui-toggle");
      toggle.setAttribute("aria-label", opts.label);
      var input = createEl("input");
      input.type = "checkbox";
      input.checked = !!opts.checked;
      var slider = createEl("span", "eui-toggle-slider");
      toggle.appendChild(input);
      toggle.appendChild(slider);
      row.appendChild(toggle);

      if (opts.onChange) {
        input.addEventListener("change", function () { opts.onChange(input.checked); });
      }

      // Return object with getter/setter
      return {
        element: row,
        getValue: function () { return input.checked; },
        setValue: function (v) { input.checked = !!v; },
      };
    }

    if (opts.type === "number") {
      var numInput = createEl("input", "eui-input eui-input-narrow");
      numInput.type = "number";
      numInput.value = opts.value != null ? opts.value : "";
      if (opts.min != null) numInput.min = opts.min;
      if (opts.max != null) numInput.max = opts.max;
      if (opts.step != null) numInput.step = opts.step;
      row.appendChild(numInput);

      if (opts.onChange) {
        numInput.addEventListener("change", function () {
          var v = parseFloat(numInput.value);
          if (opts.min != null) v = Math.max(opts.min, v);
          if (opts.max != null) v = Math.min(opts.max, v);
          opts.onChange(v);
        });
      }

      return {
        element: row,
        getValue: function () { return parseFloat(numInput.value); },
        setValue: function (v) { numInput.value = v; },
      };
    }

    if (opts.type === "text") {
      var txtInput = createEl("input", "eui-input");
      txtInput.type = "text";
      txtInput.value = opts.value || "";
      txtInput.placeholder = opts.placeholder || "";
      row.appendChild(txtInput);

      if (opts.onChange) {
        txtInput.addEventListener("change", function () { opts.onChange(txtInput.value); });
      }

      return {
        element: row,
        getValue: function () { return txtInput.value; },
        setValue: function (v) { txtInput.value = v; },
      };
    }

    return { element: row };
  }

  /* ═══════════════════════════════════════════════════════════
     SORTABLE LIST — Drag-and-drop reorderable items
     ═══════════════════════════════════════════════════════════
     Usage:
       var list = new ExtUI.SortableList({
         container: someEl,
         items: [
           { id: 'a', name: 'Item A', enabled: true },
           { id: 'b', name: 'Item B', enabled: false, badge: 'Custom' },
         ],
         showToggle: true,            // show a toggle per item
         showRemove: false,           // show a remove button
         removableIds: ['b'],         // only these IDs can be removed
         onToggle: function(id, val) { ... },
         onRemove: function(id) { ... },
         onReorder: function(newItems) { ... },
       });
     ═══════════════════════════════════════════════════════════ */

  function SortableList(opts) {
    var self = this;
    opts = opts || {};
    self._opts = opts;
    self._items = (opts.items || []).slice();

    var container = opts.container;
    var listEl = createEl("div", "eui-sortable-list");
    container.appendChild(listEl);
    self.element = listEl;

    var dragSourceIndex = null;

    function render() {
      listEl.textContent = "";

      self._items.forEach(function (item, index) {
        var el = createEl("div", "eui-sortable-item");
        el.setAttribute("draggable", "true");
        el.dataset.index = index;

        // Drag handle
        var handle = createEl("span", "eui-drag-handle");
        handle.title = "Drag to reorder";
        handle.setAttribute("aria-hidden", "true");
        for (var g = 0; g < 3; g++) {
          handle.appendChild(createEl("span", "eui-grip-dot"));
        }
        el.appendChild(handle);

        // Name
        var nameSpan = createEl("span", "eui-sortable-name", item.name || item.id);
        el.appendChild(nameSpan);

        // Badge
        if (item.badge) {
          el.appendChild(createEl("span", "eui-badge", item.badge));
        }

        // Toggle
        if (opts.showToggle) {
          var toggle = createEl("label", "eui-toggle");
          toggle.setAttribute("aria-label", "Toggle " + (item.name || item.id));
          var cb = createEl("input");
          cb.type = "checkbox";
          cb.checked = item.enabled !== false;
          cb.dataset.id = item.id;
          var sl = createEl("span", "eui-toggle-slider");
          toggle.appendChild(cb);
          toggle.appendChild(sl);
          el.appendChild(toggle);

          cb.addEventListener("change", function () {
            if (opts.onToggle) opts.onToggle(item.id, cb.checked);
          });
        }

        // Remove button
        var canRemove = opts.showRemove && (!opts.removableIds || opts.removableIds.indexOf(item.id) !== -1);
        if (canRemove) {
          var rmBtn = createEl("button", "eui-item-remove");
          rmBtn.title = "Remove";
          rmBtn.textContent = "\u00D7";
          rmBtn.addEventListener("click", function () {
            if (opts.onRemove) opts.onRemove(item.id);
          });
          el.appendChild(rmBtn);
        }

        // Drag events
        el.addEventListener("dragstart", onDragStart);
        el.addEventListener("dragover", onDragOver);
        el.addEventListener("dragend", onDragEnd);
        el.addEventListener("drop", onDrop);

        listEl.appendChild(el);
      });
    }

    function onDragStart(e) {
      dragSourceIndex = +e.currentTarget.dataset.index;
      e.currentTarget.classList.add("eui-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(dragSourceIndex));
    }

    function onDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      var rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.classList.toggle("eui-drag-over-top", e.clientY < rect.top + rect.height / 2);
      e.currentTarget.classList.toggle("eui-drag-over-bottom", e.clientY >= rect.top + rect.height / 2);
    }

    function onDragEnd(e) {
      e.currentTarget.classList.remove("eui-dragging");
      clearDragClasses();
    }

    function onDrop(e) {
      e.preventDefault();
      var targetIndex = +e.currentTarget.dataset.index;
      if (dragSourceIndex === null || dragSourceIndex === targetIndex) return;

      var moved = self._items.splice(dragSourceIndex, 1)[0];
      self._items.splice(targetIndex, 0, moved);

      if (opts.onReorder) opts.onReorder(self._items.slice());
      clearDragClasses();
      dragSourceIndex = null;
    }

    function clearDragClasses() {
      listEl.querySelectorAll(".eui-drag-over-top,.eui-drag-over-bottom").forEach(function (el) {
        el.classList.remove("eui-drag-over-top", "eui-drag-over-bottom");
      });
    }

    // Public API
    self.setItems = function (items) {
      self._items = items.slice();
      render();
    };

    self.getItems = function () {
      return self._items.slice();
    };

    render();
  }

  /* ═══════════════════════════════════════════════════════════
     HISTORY VIEW — Expandable list with per-item action buttons
     ═══════════════════════════════════════════════════════════
     Usage:
       var hv = new ExtUI.HistoryView({
         container: someEl,
         emptyText: 'No items yet.',
         items: [
           {
             id: 'h1',
             title: 'https://example.com/photo.jpg',
             meta: 'Google Lens, TinEye \u00B7 5m ago',
             timestamp: 1700000000000,
             thumbnailUrl: 'https://...',     // optional
             primaryActions: [                  // actions shown solid
               { id: 'google', label: 'Google Lens' },
             ],
             secondaryActions: [               // actions shown dimmed
               { id: 'yandex', label: 'Yandex' },
             ],
             allAction: { id: 'all', label: 'All' },  // optional
           },
         ],
         onAction: function(itemId, actionId) { ... },
       });
     ═══════════════════════════════════════════════════════════ */

  function HistoryView(opts) {
    var self = this;
    opts = opts || {};
    self._opts = opts;

    var container = opts.container;
    var listEl = createEl("div", "eui-history-list");
    container.appendChild(listEl);
    self.element = listEl;

    function render(items) {
      listEl.textContent = "";

      if (!items || items.length === 0) {
        listEl.appendChild(createEl("p", "eui-empty", opts.emptyText || "No items yet."));
        return;
      }

      items.forEach(function (entry) {
        var row = createEl("div", "eui-history-row");

        // Title / URL
        var titleDiv = createEl("div", "eui-history-url");
        titleDiv.textContent = truncate(entry.title || "", 80);
        if (entry.title) titleDiv.title = entry.title;
        row.appendChild(titleDiv);

        // Meta
        if (entry.meta) {
          row.appendChild(createEl("div", "eui-history-meta", entry.meta));
        }

        // Action buttons
        var actions = (entry.primaryActions || []).concat(entry.secondaryActions || []);
        if (actions.length > 0 || entry.allAction) {
          var btnRow = createEl("div", "eui-history-actions");

          (entry.primaryActions || []).forEach(function (act) {
            var btn = createEl("button", "eui-action-btn", act.label);
            btn.title = act.label;
            btn.addEventListener("click", function (e) {
              e.stopPropagation();
              if (opts.onAction) opts.onAction(entry.id, act.id, entry);
            });
            btnRow.appendChild(btn);
          });

          (entry.secondaryActions || []).forEach(function (act) {
            var btn = createEl("button", "eui-action-btn eui-action-btn-dim", act.label);
            btn.title = act.label;
            btn.addEventListener("click", function (e) {
              e.stopPropagation();
              if (opts.onAction) opts.onAction(entry.id, act.id, entry);
            });
            btnRow.appendChild(btn);
          });

          if (entry.allAction) {
            var allBtn = createEl("button", "eui-action-btn eui-action-btn-accent", entry.allAction.label);
            allBtn.title = entry.allAction.label;
            allBtn.addEventListener("click", function (e) {
              e.stopPropagation();
              if (opts.onAction) opts.onAction(entry.id, entry.allAction.id, entry);
            });
            btnRow.appendChild(allBtn);
          }

          row.appendChild(btnRow);
        }

        listEl.appendChild(row);
      });
    }

    // Public
    self.setItems = function (items) {
      render(items);
    };

    self.clear = function () {
      render([]);
    };

    // Initial render
    if (opts.items) render(opts.items);
  }

  /* ═══════════════════════════════════════════════════════════
     POPUP — Shell for browser action popup
     ═══════════════════════════════════════════════════════════
     Usage:
       ExtUI.Popup.init({
         container: document.querySelector('.eui-popup-container') || document.body,
         logo: 'icons/icon.svg',
         title: 'My Extension',
         version: 'v1',
         footerButtons: [
           { label: 'Clear', className: '', onClick: function() {} },
           { label: 'Settings', className: 'eui-popup-footer-accent', onClick: function() {} },
         ],
       });
       // Returns { container, listEl } — append items to listEl
     ═══════════════════════════════════════════════════════════ */

  var Popup = {
    init: function (opts) {
      opts = opts || {};
      var container = opts.container || document.body;
      container.className = "eui-popup-body";

      // Build the structure
      var wrapper = createEl("div", "eui-popup-container");

      // Header
      var header = createEl("div", "eui-popup-header");
      if (opts.logo) {
        var logo = createEl("img", "eui-popup-logo");
        logo.src = opts.logo;
        logo.alt = "";
        logo.width = 18;
        logo.height = 18;
        header.appendChild(logo);
      }
      header.appendChild(createEl("span", "eui-popup-title", opts.title || ""));
      if (opts.version) {
        header.appendChild(createEl("span", "eui-popup-version", opts.version));
      }
      wrapper.appendChild(header);

      // Section (list area)
      var section = createEl("div", "eui-popup-section");
      if (opts.sectionLabel) {
        section.appendChild(createEl("div", "eui-popup-label", opts.sectionLabel));
      }
      var listEl = createEl("div", "eui-popup-list");
      section.appendChild(listEl);

      var emptyEl = createEl("div", "eui-empty");
      emptyEl.style.display = "none";
      emptyEl.textContent = opts.emptyText || "No items yet.";
      section.appendChild(emptyEl);
      wrapper.appendChild(section);

      // Footer
      if (opts.footerButtons && opts.footerButtons.length) {
        var footer = createEl("div", "eui-popup-footer");
        opts.footerButtons.forEach(function (fb) {
          var btn = createEl("button", "eui-popup-footer-btn " + (fb.className || ""), fb.label);
          if (fb.onClick) btn.addEventListener("click", fb.onClick);
          footer.appendChild(btn);
        });
        wrapper.appendChild(footer);
      }

      container.textContent = "";
      container.appendChild(wrapper);

      return {
        container: wrapper,
        listEl: listEl,
        emptyEl: emptyEl,
        section: section,
      };
    },

    /* Create an expandable list item for the popup */
    createItem: function (opts) {
      opts = opts || {};
      var item = createEl("div", "eui-popup-item");

      // Thumbnail
      var thumbWrap = createEl("div", "eui-popup-thumb-wrap");
      if (opts.thumbnailUrl) {
        var img = createEl("img", "eui-popup-thumb");
        img.src = opts.thumbnailUrl;
        img.alt = "";
        img.loading = "lazy";
        thumbWrap.appendChild(img);
      } else if (opts.placeholderIcon) {
        var ph = createEl("div", "eui-popup-thumb-placeholder");
        ph.textContent = opts.placeholderIcon;
        thumbWrap.appendChild(ph);
      }
      item.appendChild(thumbWrap);

      // Info
      var info = createEl("div", "eui-popup-item-info");
      var title = createEl("div", "eui-popup-item-title");
      title.textContent = truncate(opts.title || "", 50);
      if (opts.title) title.title = opts.title;
      info.appendChild(title);

      if (opts.meta) {
        info.appendChild(createEl("div", "eui-popup-item-meta", opts.meta));
      }
      item.appendChild(info);

      // Expand arrow
      var arrow = createEl("div", "eui-popup-expand-arrow", "\u25B6");
      item.appendChild(arrow);

      // Click handler
      var expanded = false;
      var actionsBar = null;

      function toggle() {
        // Collapse others
        var parent = item.parentElement;
        if (parent) {
          parent.querySelectorAll(".eui-popup-item-expanded").forEach(function (el) {
            el.classList.remove("eui-popup-item-expanded");
            var bar = el.querySelector(".eui-popup-actions");
            if (bar) bar.remove();
          });
        }

        if (expanded && actionsBar) {
          actionsBar.remove();
          item.classList.remove("eui-popup-item-expanded");
          expanded = false;
          return;
        }

        item.classList.add("eui-popup-item-expanded");
        actionsBar = createEl("div", "eui-popup-actions");

        (opts.primaryActions || []).forEach(function (act) {
          var btn = createEl("button", "eui-popup-action-btn", act.label);
          btn.title = act.label || "";
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (opts.onAction) opts.onAction(act.id, opts.data);
          });
          actionsBar.appendChild(btn);
        });

        (opts.secondaryActions || []).forEach(function (act) {
          var btn = createEl("button", "eui-popup-action-btn eui-popup-action-btn-dim", act.label);
          btn.title = act.label || "";
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (opts.onAction) opts.onAction(act.id, opts.data);
          });
          actionsBar.appendChild(btn);
        });

        if (opts.allAction) {
          var allBtn = createEl("button", "eui-popup-action-btn eui-popup-action-btn-accent", opts.allAction.label);
          allBtn.title = opts.allAction.label || "";
          allBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (opts.onAction) opts.onAction(opts.allAction.id, opts.data);
          });
          actionsBar.appendChild(allBtn);
        }

        item.appendChild(actionsBar);
        expanded = true;
      }

      item.addEventListener("click", function () { toggle(); });

      return item;
    },
  };

  /* ═══════════════════════════════════════════════════════════
     IMPORT / EXPORT — Config backup / restore
     ═══════════════════════════════════════════════════════════
     Usage:
       ExtUI.createImportExport({
         container: someEl,
         onExport: function() { return jsonData; },   // return JSON string or object
         onImport: function(jsonObject) { ... },       // receives parsed object
       });
     ═══════════════════════════════════════════════════════════ */

  function createImportExport(opts) {
    var section = createEl("section", "eui-section");
    section.appendChild(createEl("h3", null, opts.title || "Import / Export"));
    if (opts.description) {
      section.appendChild(createEl("p", "eui-section-desc", opts.description));
    }

    var row = createEl("div", "eui-import-export-row");

    var exportBtn = createEl("button", "eui-btn", "Export Config");
    exportBtn.addEventListener("click", function () {
      var data = opts.onExport ? opts.onExport() : null;
      if (!data) return;
      var json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
      var blob = new Blob([json], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = createEl("a");
      a.href = url;
      a.download = (opts.filename || "config") + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    row.appendChild(exportBtn);

    var importLabel = createEl("label", "eui-btn eui-btn-accent eui-import-label");
    importLabel.textContent = "Import Config";
    var fileInput = createEl("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.hidden = true;
    fileInput.addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          if (opts.onImport) opts.onImport(obj);
        } catch (err) {
          if (opts.onError) opts.onError("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
      fileInput.value = "";
    });
    importLabel.appendChild(fileInput);
    row.appendChild(importLabel);

    section.appendChild(row);
    opts.container.appendChild(section);

    return { element: section };
  }

  /* ═══════════════════════════════════════════════════════════
     SHORTCUTS LIST — Keyboard shortcut display
     ═══════════════════════════════════════════════════════════
     Usage:
       ExtUI.createShortcutsList({
         container: someEl,
         shortcuts: [
           { keys: 'Ctrl+Shift+S', description: 'Do something' },
         ],
         footnote: 'Change shortcuts at about:addons.',
       });
     ═══════════════════════════════════════════════════════════ */

  function createShortcutsList(opts) {
    var section = createEl("section", "eui-section");
    section.appendChild(createEl("h3", null, opts.title || "Keyboard Shortcuts"));

    var list = createEl("div", "eui-shortcuts-list");
    (opts.shortcuts || []).forEach(function (sc) {
      var row = createEl("div", "eui-shortcut-row");
      var kbd = createEl("kbd", null, sc.keys);
      row.appendChild(kbd);
      row.appendChild(createEl("span", null, sc.description));
      list.appendChild(row);
    });
    section.appendChild(list);

    if (opts.footnote) {
      var fn = createEl("p", "eui-section-desc");
      fn.style.marginTop = "10px";
      fn.style.marginBottom = "0";
      fn.textContent = opts.footnote;
      section.appendChild(fn);
    }

    opts.container.appendChild(section);

    return { element: section };
  }

  /* ═══════════════════════════════════════════════════════════
     SECTION — Generic section card
     ═══════════════════════════════════════════════════════════
     Usage:
       var sec = ExtUI.createSection({
         container: someEl,
         title: 'Section Title',
         description: 'What this section does.',
       });
       sec.element → the <section> DOM node
       sec.body    → same reference, append content here
     ═══════════════════════════════════════════════════════════ */

  function createSection(opts) {
    var section = createEl("section", "eui-section");
    if (opts.title) section.appendChild(createEl("h3", null, opts.title));
    if (opts.description) section.appendChild(createEl("p", "eui-section-desc", opts.description));
    if (opts.container) opts.container.appendChild(section);
    return { element: section, body: section };
  }

  /* ═══════════════════════════════════════════════════════════
     PREVIEW — URL/value preview tool
     ═══════════════════════════════════════════════════════════
     Usage:
       var pv = ExtUI.createPreview({
         container: someEl,
         placeholder: 'https://example.com/photo.jpg',
         buttonText: 'Test',
         onPreview: function(value) {
           return [
             { label: 'Engine A', value: 'https://...', disabled: false },
           ];
         },
       });
     ═══════════════════════════════════════════════════════════ */

  function createPreview(opts) {
    var section = createEl("section", "eui-section");
    section.appendChild(createEl("h3", null, opts.title || "Preview"));
    if (opts.description) {
      section.appendChild(createEl("p", "eui-section-desc", opts.description));
    }

    var inputRow = createEl("div", "eui-preview-input-row");
    var input = createEl("input", "eui-input");
    input.type = "text";
    input.placeholder = opts.placeholder || "";
    input.autocomplete = "off";
    input.spellcheck = false;
    inputRow.appendChild(input);

    var btn = createEl("button", "eui-btn eui-btn-accent", opts.buttonText || "Test");
    inputRow.appendChild(btn);
    section.appendChild(inputRow);

    var results = createEl("div", "eui-preview-results");
    section.appendChild(results);

    function run() {
      results.textContent = "";
      var val = input.value.trim();
      if (!val) {
        results.appendChild(createEl("p", "eui-preview-empty", "Enter a value above to test."));
        return;
      }
      if (opts.onPreview) {
        var rows = opts.onPreview(val);
        (rows || []).forEach(function (r) {
          var row = createEl("div", "eui-preview-row" + (r.disabled ? " disabled" : ""));
          row.appendChild(createEl("span", "eui-preview-label", r.label));
          var code = createEl("code", "eui-preview-value");
          code.textContent = truncate(r.value, 120);
          code.title = r.value;
          row.appendChild(code);
          results.appendChild(row);
        });
      }
    }

    btn.addEventListener("click", run);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });

    if (opts.container) opts.container.appendChild(section);

    return { element: section, run: run, input: input };
  }

  /* ═══════════════════════════════════════════════════════════
     MODAL — Themed dialog (alert, confirm, prompt, custom)
     ═══════════════════════════════════════════════════════════ */

  var _toastContainer = null;
  function getToastContainer() {
    if (_toastContainer) return _toastContainer;
    _toastContainer = createEl("div", "eui-toast-container");
    document.body.appendChild(_toastContainer);
    return _toastContainer;
  }

  function _closeModalOnEscape(e) {
    if (e.key === "Escape") Modal.closeAll();
  }

  var Modal = {
    _stack: [],

    alert: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var type = opts.type || "info";
        var icons = { danger: "\u2716", success: "\u2714", warn: "\u26A0", info: "\u2139" };

        var overlay = createEl("div", "eui-modal-overlay");
        var modal = createEl("div", "eui-modal");
        var header = createEl("div", "eui-modal-header");
        var closeBtn = createEl("button", "eui-modal-close", "\u00D7");
        header.appendChild(createEl("h3", null, opts.title || (type === "danger" ? "Error" : type === "warn" ? "Warning" : "Notice")));
        header.appendChild(closeBtn);
        modal.appendChild(header);

        var body = createEl("div", "eui-modal-body");
        if (opts.icon !== false) {
          var iconDiv = createEl("div", "eui-modal-icon eui-modal-icon-" + type);
          iconDiv.textContent = icons[type] || icons.info;
          body.appendChild(iconDiv);
        }
        var p = createEl("p");
        p.textContent = opts.message || "";
        body.appendChild(p);
        modal.appendChild(body);

        var footer = createEl("div", "eui-modal-footer");
        var okBtn = createEl("button", "eui-btn eui-btn-accent", opts.okText || "OK");
        footer.appendChild(okBtn);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        function close() {
          overlay.classList.remove("eui-modal-visible");
          setTimeout(function () { overlay.remove(); }, 200);
          document.removeEventListener("keydown", _closeModalOnEscape);
          Modal._stack = Modal._stack.filter(function (m) { return m !== overlay; });
          resolve(true);
        }

        okBtn.addEventListener("click", close);
        closeBtn.addEventListener("click", close);
        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add("eui-modal-visible"); });
        Modal._stack.push(overlay);
        if (Modal._stack.length === 1) document.addEventListener("keydown", _closeModalOnEscape);

        okBtn.focus();
      });
    },

    confirm: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var type = opts.type || "warn";
        var icons = { danger: "\u2716", success: "\u2714", warn: "\u26A0", info: "\u2139" };

        var overlay = createEl("div", "eui-modal-overlay");
        var modal = createEl("div", "eui-modal");
        var header = createEl("div", "eui-modal-header");
        var closeBtn = createEl("button", "eui-modal-close", "\u00D7");
        header.appendChild(createEl("h3", null, opts.title || "Confirm"));
        header.appendChild(closeBtn);
        modal.appendChild(header);

        var body = createEl("div", "eui-modal-body");
        if (opts.icon !== false) {
          var iconDiv = createEl("div", "eui-modal-icon eui-modal-icon-" + type);
          iconDiv.textContent = icons[type] || icons.warn;
          body.appendChild(iconDiv);
        }
        var p = createEl("p");
        p.textContent = opts.message || "Are you sure?";
        body.appendChild(p);
        modal.appendChild(body);

        var footer = createEl("div", "eui-modal-footer");
        var cancelBtn = createEl("button", "eui-btn", opts.cancelText || "Cancel");
        var okBtn = createEl("button", "eui-btn" + (type === "danger" ? " eui-btn-danger" : " eui-btn-accent"), opts.okText || "Confirm");
        footer.appendChild(cancelBtn);
        footer.appendChild(okBtn);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        function close(result) {
          overlay.classList.remove("eui-modal-visible");
          setTimeout(function () { overlay.remove(); }, 200);
          document.removeEventListener("keydown", _closeModalOnEscape);
          Modal._stack = Modal._stack.filter(function (m) { return m !== overlay; });
          resolve(result);
        }

        okBtn.addEventListener("click", function () { close(true); });
        cancelBtn.addEventListener("click", function () { close(false); });
        closeBtn.addEventListener("click", function () { close(false); });
        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(false); });

        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add("eui-modal-visible"); });
        Modal._stack.push(overlay);
        if (Modal._stack.length === 1) document.addEventListener("keydown", _closeModalOnEscape);

        okBtn.focus();
      });
    },

    prompt: function (opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        var overlay = createEl("div", "eui-modal-overlay");
        var modal = createEl("div", "eui-modal");
        var header = createEl("div", "eui-modal-header");
        var closeBtn = createEl("button", "eui-modal-close", "\u00D7");
        header.appendChild(createEl("h3", null, opts.title || "Input"));
        header.appendChild(closeBtn);
        modal.appendChild(header);

        var body = createEl("div", "eui-modal-body");
        var p = createEl("p");
        p.textContent = opts.message || "";
        body.appendChild(p);
        var input = createEl("input", "eui-input eui-modal-prompt-input");
        input.type = "text";
        input.value = opts.defaultValue || "";
        input.placeholder = opts.placeholder || "";
        body.appendChild(input);
        modal.appendChild(body);

        var footer = createEl("div", "eui-modal-footer");
        var cancelBtn = createEl("button", "eui-btn", "Cancel");
        var okBtn = createEl("button", "eui-btn eui-btn-accent", "OK");
        footer.appendChild(cancelBtn);
        footer.appendChild(okBtn);
        modal.appendChild(footer);
        overlay.appendChild(modal);

        function close(result) {
          overlay.classList.remove("eui-modal-visible");
          setTimeout(function () { overlay.remove(); }, 200);
          document.removeEventListener("keydown", _closeModalOnEscape);
          Modal._stack = Modal._stack.filter(function (m) { return m !== overlay; });
          resolve(result);
        }

        function submit() { close(input.value); }

        okBtn.addEventListener("click", submit);
        cancelBtn.addEventListener("click", function () { close(null); });
        closeBtn.addEventListener("click", function () { close(null); });
        overlay.addEventListener("click", function (e) { if (e.target === overlay) close(null); });
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });

        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add("eui-modal-visible"); });
        Modal._stack.push(overlay);
        if (Modal._stack.length === 1) document.addEventListener("keydown", _closeModalOnEscape);

        input.focus();
        input.select();
      });
    },

    closeAll: function () {
      Modal._stack.slice().forEach(function (overlay) {
        overlay.classList.remove("eui-modal-visible");
        setTimeout(function () { overlay.remove(); }, 200);
      });
      Modal._stack = [];
      document.removeEventListener("keydown", _closeModalOnEscape);
    },
  };

  /* ═══════════════════════════════════════════════════════════
     TOAST — Non-blocking notifications
     ═══════════════════════════════════════════════════════════ */

  var Toast = {
    _icons: { danger: "\u2716", success: "\u2714", warn: "\u26A0", info: "\u2139" },

    show: function (message, type, duration) {
      type = type || "info";
      duration = duration || 4000;
      var container = getToastContainer();

      var toast = createEl("div", "eui-toast eui-toast-" + type);
      var iconSpan = createEl("span", "eui-toast-icon eui-toast-icon-" + type);
      iconSpan.textContent = Toast._icons[type] || Toast._icons.info;
      toast.appendChild(iconSpan);

      var msg = createEl("span", "eui-toast-msg");
      msg.textContent = message;
      toast.appendChild(msg);

      var closeBtn = createEl("button", "eui-toast-close", "\u00D7");
      toast.appendChild(closeBtn);

      container.appendChild(toast);
      requestAnimationFrame(function () { toast.classList.add("eui-toast-visible"); });

      var timer = setTimeout(function () { hideToast(); }, duration);

      function hideToast() {
        clearTimeout(timer);
        toast.classList.remove("eui-toast-visible");
        toast.classList.add("eui-toast-hiding");
        setTimeout(function () { toast.remove(); }, 300);
      }

      closeBtn.addEventListener("click", hideToast);

      return { hide: hideToast };
    },
  };

  /* ═══════════════════════════════════════════════════════════
     ABOUT PANEL — Extension info + changelog
     ═══════════════════════════════════════════════════════════ */

  function createAbout(opts) {
    opts = opts || {};
    var wrap = createEl("div", "eui-about");

    if (opts.logo) {
      var logo = createEl("img", "eui-about-logo");
      logo.src = opts.logo;
      logo.alt = "";
      wrap.appendChild(logo);
    }

    wrap.appendChild(createEl("h2", "eui-about-name", opts.name || "My Extension"));

    if (opts.version) {
      wrap.appendChild(createEl("p", "eui-about-version", opts.version));
    }

    if (opts.description) {
      wrap.appendChild(createEl("p", "eui-about-desc", opts.description));
    }

    if (opts.links && opts.links.length) {
      var linksDiv = createEl("div", "eui-about-links");
      opts.links.forEach(function (link) {
        var a = createEl("a", "eui-about-link");
        a.href = link.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = link.label;
        if (link.icon) {
          var iconWrap = document.createElement("span");
          iconWrap.innerHTML = link.icon;
          while (iconWrap.firstChild) a.insertBefore(iconWrap.firstChild, a.firstChild);
        }
        linksDiv.appendChild(a);
      });
      wrap.appendChild(linksDiv);
    }

    // Changelog
    if (opts.changelog && opts.changelog.length) {
      var cl = createEl("div", "eui-changelog");
      cl.appendChild(createEl("h4", null, "Changelog"));
      var list = createEl("div", "eui-changelog-list");
      opts.changelog.forEach(function (entry) {
        var el = createEl("div", "eui-changelog-entry");
        el.appendChild(createEl("div", "eui-changelog-version", entry.version));
        if (entry.date) {
          el.appendChild(createEl("div", "eui-changelog-date", entry.date));
        }
        var ul = createEl("ul", "eui-changelog-changes");
        (entry.changes || []).forEach(function (c) {
          ul.appendChild(createEl("li", null, c));
        });
        el.appendChild(ul);
        list.appendChild(el);
      });
      cl.appendChild(list);
      wrap.appendChild(cl);
    }

    if (opts.container) opts.container.appendChild(wrap);
    return { element: wrap };
  }

  /* ═══════════════════════════════════════════════════════════
     BANNER — Notification / permission banner
     ═══════════════════════════════════════════════════════════ */

  function createBanner(opts) {
    opts = opts || {};
    var type = opts.type || "info";
    var bannerIcons = { warn: "\u26A0", info: "\u2139", danger: "\u2716", success: "\u2714" };

    var banner = createEl("div", "eui-banner eui-banner-" + type);

    var iconEl = createEl("span", "eui-banner-icon");
    iconEl.textContent = bannerIcons[type] || bannerIcons.info;
    banner.appendChild(iconEl);

    var content = createEl("div", "eui-banner-content");
    if (opts.title) content.appendChild(createEl("div", "eui-banner-title", opts.title));
    if (opts.description) content.appendChild(createEl("div", "eui-banner-desc", opts.description));

    if (opts.actions && opts.actions.length) {
      var actions = createEl("div", "eui-banner-actions");
      opts.actions.forEach(function (act) {
        var btn = createEl("button", "eui-btn eui-btn-sm" + (act.accent ? " eui-btn-accent" : ""), act.label);
        if (act.onClick) btn.addEventListener("click", function (e) { e.stopPropagation(); act.onClick(); });
        actions.appendChild(btn);
      });
      content.appendChild(actions);
    }

    banner.appendChild(content);

    if (opts.dismissable !== false) {
      var dismissBtn = createEl("button", "eui-banner-dismiss", "\u00D7");
      dismissBtn.addEventListener("click", function () {
        banner.style.opacity = "0";
        banner.style.transform = "translateY(-8px)";
        banner.style.transition = "opacity .2s, transform .2s";
        setTimeout(function () { banner.remove(); }, 200);
      });
      banner.appendChild(dismissBtn);
    }

    if (opts.container) opts.container.appendChild(banner);
    return { element: banner, remove: function () { banner.remove(); } };
  }

  /* ═══════════════════════════════════════════════════════════
     HORIZONTAL TABS
     ═══════════════════════════════════════════════════════════ */

  function createHTabs(opts) {
    opts = opts || {};
    var wrap = createEl("div");
    var tabsBar = createEl("div", "eui-htabs");
    var panels = {};

    (opts.tabs || []).forEach(function (tab, i) {
      var btn = createEl("button", "eui-htab" + (i === 0 ? " active" : ""));
      btn.textContent = tab.label;
      btn.dataset.idx = String(i);
      tabsBar.appendChild(btn);

      var panel = createEl("div", "eui-htab-panel" + (i === 0 ? " active" : ""));
      if (tab.content) panel.appendChild(tab.content);
      wrap.appendChild(panel);
      panels[tab.id || String(i)] = panel;
    });

    wrap.insertBefore(tabsBar, wrap.firstChild);

    tabsBar.addEventListener("click", function (e) {
      var btn = e.target.closest(".eui-htab");
      if (!btn) return;
      var idx = btn.dataset.idx;
      tabsBar.querySelectorAll(".eui-htab").forEach(function (b) { b.classList.remove("active"); });
      wrap.querySelectorAll(".eui-htab-panel").forEach(function (p) { p.classList.remove("active"); });
      btn.classList.add("active");
      wrap.querySelectorAll(".eui-htab-panel")[idx].classList.add("active");
    });

    if (opts.container) opts.container.appendChild(wrap);
    return { element: wrap, switchTab: function (id) {
      var tabIds = (opts.tabs || []).map(function (t) { return t.id; });
      var idx = tabIds.indexOf(id);
      if (idx < 0) return;
      tabsBar.querySelectorAll(".eui-htab").forEach(function (b) { b.classList.remove("active"); });
      wrap.querySelectorAll(".eui-htab-panel").forEach(function (p) { p.classList.remove("active"); });
      tabsBar.children[idx].classList.add("active");
      wrap.querySelectorAll(".eui-htab-panel")[idx].classList.add("active");
    }};
  }

  /* ═══════════════════════════════════════════════════════════
     ACCORDION
     ═══════════════════════════════════════════════════════════ */

  function createAccordion(opts) {
    opts = opts || {};
    var wrap = createEl("div", "eui-accordion");

    (opts.items || []).forEach(function (item, i) {
      var el = createEl("div", "eui-accordion-item" + (item.open ? " eui-accordion-open" : ""));

      var trigger = createEl("button", "eui-accordion-trigger");
      trigger.appendChild(createEl("span", null, item.title));
      var chevron = createEl("span", "eui-accordion-chevron", "\u25B6");
      trigger.appendChild(chevron);
      el.appendChild(trigger);

      var body = createEl("div", "eui-accordion-body");
      if (item.content) {
        if (typeof item.content === "string") {
          body.textContent = item.content;
        } else {
          body.appendChild(item.content);
        }
      }
      el.appendChild(body);

      trigger.addEventListener("click", function () {
        var isOpen = el.classList.contains("eui-accordion-open");
        // Close all if single mode
        if (opts.single) {
          wrap.querySelectorAll(".eui-accordion-open").forEach(function (a) {
            a.classList.remove("eui-accordion-open");
          });
        }
        el.classList.toggle("eui-accordion-open", !isOpen);
      });

      wrap.appendChild(el);
    });

    if (opts.container) opts.container.appendChild(wrap);
    return { element: wrap };
  }

  /* ═══════════════════════════════════════════════════════════
     CARD GRID
     ═══════════════════════════════════════════════════════════ */

  function createCardGrid(opts) {
    opts = opts || {};
    var grid = createEl("div", "eui-card-grid");

    (opts.cards || []).forEach(function (card) {
      var el;
      if (card.url) {
        el = createEl("a", "eui-card");
        el.href = card.url;
        el.target = "_blank";
        el.rel = "noopener";
      } else {
        el = createEl("div", "eui-card");
      }

      if (card.image) {
        var img = createEl("img", "eui-card-img");
        img.src = card.image;
        img.alt = card.title || "";
        img.loading = "lazy";
        el.appendChild(img);
      }

      var body = createEl("div", "eui-card-body");
      body.appendChild(createEl("div", "eui-card-title", card.title || ""));
      if (card.description) body.appendChild(createEl("div", "eui-card-desc", card.description));
      el.appendChild(body);

      if (card.footer || card.tag) {
        var footer = createEl("div", "eui-card-footer");
        if (card.tag) {
          var tag = createEl("span", "eui-card-tag", card.tag);
          footer.appendChild(tag);
        }
        if (card.footer) {
          var footerText = createEl("span", null, card.footer);
          footerText.style.marginLeft = "auto";
          footer.appendChild(footerText);
        }
        el.appendChild(footer);
      }

      if (card.onClick && !card.url) {
        el.style.cursor = "pointer";
        el.addEventListener("click", card.onClick);
      }

      grid.appendChild(el);
    });

    if (opts.container) opts.container.appendChild(grid);
    return { element: grid };
  }

  /* ═══════════════════════════════════════════════════════════
     STATS CARDS
     ═══════════════════════════════════════════════════════════ */

  function createStatsGrid(opts) {
    opts = opts || {};
    var grid = createEl("div", "eui-stats-grid");

    (opts.stats || []).forEach(function (stat) {
      var card = createEl("div", "eui-stat-card");
      card.appendChild(createEl("div", "eui-stat-value", stat.value));
      card.appendChild(createEl("div", "eui-stat-label", stat.label));
      if (stat.change) {
        var isUp = stat.change.charAt(0) === "+" || stat.change > 0;
        var changeEl = createEl("div", "eui-stat-change " + (isUp ? "eui-stat-change-up" : "eui-stat-change-down"));
        changeEl.textContent = (isUp ? "\u2191 " : "\u2193 ") + stat.change;
        card.appendChild(changeEl);
      }
      grid.appendChild(card);
    });

    if (opts.container) opts.container.appendChild(grid);
    return { element: grid };
  }

  /* ═══════════════════════════════════════════════════════════
     DATA TABLE
     ═══════════════════════════════════════════════════════════ */

  function createTable(opts) {
    opts = opts || {};
    var wrap = createEl("div", "eui-table-wrap");
    var table = createEl("table", "eui-table");

    // Header
    var thead = createEl("thead");
    var headRow = createEl("tr");
    (opts.columns || []).forEach(function (col, i) {
      var th = createEl("th", col.sortable ? "eui-table-sortable" : "");
      th.textContent = col.label || "";
      if (col.sortable) {
        var arrow = createEl("span", "eui-table-sort-arrow");
        arrow.textContent = "\u2195";
        th.appendChild(arrow);
        th.addEventListener("click", function () {
          var current = th.dataset.sort || "none";
          var dir = current === "asc" ? "desc" : "asc";
          thead.querySelectorAll(".eui-table-sort-arrow").forEach(function (a) {
            a.classList.remove("active");
            a.textContent = "\u2195";
          });
          arrow.textContent = dir === "asc" ? "\u2191" : "\u2193";
          arrow.classList.add("active");
          th.dataset.sort = dir;
          if (opts.onSort) opts.onSort(col.key || i, dir);
        });
      }
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    var tbody = createEl("tbody");
    function renderRows(rows) {
      tbody.textContent = "";
      if (!rows || rows.length === 0) {
        var tr = createEl("tr");
        var td = createEl("td", "eui-table-empty");
        td.colSpan = (opts.columns || []).length;
        td.textContent = opts.emptyText || "No data.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      rows.forEach(function (row) {
        var tr = createEl("tr");
        (opts.columns || []).forEach(function (col, i) {
          var td = createEl("td");
          var val = col.key ? row[col.key] : (row[i] != null ? row[i] : "");
          if (col.render) {
            col.render(td, val, row);
          } else {
            td.textContent = val != null ? String(val) : "";
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    renderRows(opts.rows);

    if (opts.container) opts.container.appendChild(wrap);
    return { element: wrap, setRows: renderRows };
  }

  /* ═══════════════════════════════════════════════════════════
     SEARCH FILTER
     ═══════════════════════════════════════════════════════════ */

  function createFilter(opts) {
    opts = opts || {};
    var wrap = createEl("div", "eui-filter-row");

    var icon = createEl("span", "eui-filter-icon");
    var iconSvg = document.createElement("span");
    iconSvg.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    while (iconSvg.firstChild) icon.appendChild(iconSvg.firstChild);
    wrap.appendChild(icon);

    var input = createEl("input", "eui-filter-input");
    input.type = "text";
    input.placeholder = opts.placeholder || "Filter\u2026";
    wrap.appendChild(input);

    var countSpan = createEl("span", "eui-filter-count");
    wrap.appendChild(countSpan);

    function applyFilter() {
      var query = input.value.toLowerCase().trim();
      var items = (opts.target || wrap.parentElement).querySelectorAll(opts.selector || ".eui-sortable-item, .eui-history-row, .eui-card, [data-filterable]");
      var visible = 0;
      items.forEach(function (item) {
        var text = (item.textContent || "").toLowerCase();
        var show = !query || text.indexOf(query) !== -1;
        item.classList.toggle("eui-filter-hidden", !show);
        if (show) visible++;
      });
      countSpan.textContent = query ? visible + "/" + items.length : "";
      if (opts.onFilter) opts.onFilter(query, visible);
    }

    input.addEventListener("input", applyFilter);

    if (opts.container) opts.container.appendChild(wrap);
    return { element: wrap, apply: applyFilter, input: input };
  }

  /* ═══════════════════════════════════════════════════════════
     CODE BLOCK
     ═══════════════════════════════════════════════════════════ */

  function createCodeBlock(opts) {
    opts = opts || {};
    var block = createEl("div", "eui-code-block");

    var header = createEl("div", "eui-code-header");
    if (opts.language) header.appendChild(createEl("span", "eui-code-lang", opts.language));

    var copyBtn = createEl("button", "eui-code-copy", "Copy");
    copyBtn.addEventListener("click", function () {
      var code = opts.code || "";
      try {
        navigator.clipboard.writeText(code).then(function () {
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("eui-code-copied");
          setTimeout(function () {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("eui-code-copied");
          }, 2000);
        });
      } catch (_) {}
    });
    header.appendChild(copyBtn);
    block.appendChild(header);

    var body = createEl("div", "eui-code-body");
    var pre = createEl("pre");
    pre.textContent = opts.code || "";
    body.appendChild(pre);
    block.appendChild(body);

    if (opts.container) opts.container.appendChild(block);
    return { element: block };
  }

  /* ═══════════════════════════════════════════════════════════
     PROGRESS BAR
     ═══════════════════════════════════════════════════════════ */

  function createProgress(opts) {
    opts = opts || {};
    var wrap = createEl("div");

    var bar = createEl("div", "eui-progress");
    var fill = createEl("div", "eui-progress-bar" + (opts.striped ? " eui-progress-bar-striped" : ""));
    fill.style.width = (opts.value || 0) + "%";
    bar.appendChild(fill);
    wrap.appendChild(bar);

    if (opts.showLabel !== false) {
      var label = createEl("div", "eui-progress-label");
      var leftLabel = createEl("span", null, opts.leftLabel || "");
      var rightLabel = createEl("span", null, (opts.value || 0) + "%");
      label.appendChild(leftLabel);
      label.appendChild(rightLabel);
      wrap.appendChild(label);

      return {
        element: wrap,
        setValue: function (v) {
          fill.style.width = v + "%";
          rightLabel.textContent = v + "%";
        },
      };
    }

    return {
      element: wrap,
      setValue: function (v) { fill.style.width = v + "%"; },
    };
  }

  /* ═══════════════════════════════════════════════════════════
     SKELETON / LOADING HELPERS
     ═══════════════════════════════════════════════════════════ */

  var Skeleton = {
    text: function (width) {
      var el = createEl("div", "eui-skeleton eui-skeleton-text");
      if (width) el.style.width = width;
      return el;
    },
    heading: function (width) {
      var el = createEl("div", "eui-skeleton eui-skeleton-heading");
      if (width) el.style.width = width;
      return el;
    },
    avatar: function () {
      return createEl("div", "eui-skeleton eui-skeleton-avatar");
    },
    row: function () {
      var row = createEl("div", "eui-skeleton-row");
      row.appendChild(createEl("div", "eui-skeleton eui-skeleton-avatar"));
      var info = createEl("div", "eui-skeleton-row-info");
      info.appendChild(createEl("div", "eui-skeleton eui-skeleton-text", " "));
      info.appendChild(createEl("div", "eui-skeleton eui-skeleton-text"));
      row.appendChild(info);
      return row;
    },
    rows: function (count) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < (count || 3); i++) frag.appendChild(Skeleton.row());
      return frag;
    },
  };

  /* ═══════════════════════════════════════════════════════════
     QUICK ACTIONS GRID (popup)
     ═══════════════════════════════════════════════════════════ */

  function createQuickActions(opts) {
    opts = opts || {};
    var grid = createEl("div", "eui-actions-grid" + (opts.columns === 2 ? " eui-actions-grid-2" : ""));

    (opts.actions || []).forEach(function (act) {
      var card = createEl("div", "eui-action-card");
      card.title = act.label || "";
      card.appendChild(createEl("span", "eui-action-card-icon", act.icon || "\u25CF"));
      card.appendChild(createEl("span", "eui-action-card-label", act.label || ""));
      card.addEventListener("click", function () { if (act.onClick) act.onClick(act.id); });
      grid.appendChild(card);
    });

    if (opts.container) opts.container.appendChild(grid);
    return { element: grid };
  }

  /* ═══════════════════════════════════════════════════════════
     SEARCH BAR (popup)
     ═══════════════════════════════════════════════════════════ */

  function createSearchBar(opts) {
    opts = opts || {};
    var bar = createEl("div", "eui-search-bar");
    var wrap = createEl("div", "eui-search-wrap");

    var icon = createEl("span", "eui-search-icon");
    var iconSvg = document.createElement("span");
    iconSvg.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    while (iconSvg.firstChild) icon.appendChild(iconSvg.firstChild);
    wrap.appendChild(icon);

    var input = createEl("input", "eui-search-input");
    input.type = "text";
    input.placeholder = opts.placeholder || "Search\u2026";
    wrap.appendChild(input);
    bar.appendChild(wrap);

    var resultsDiv = createEl("div", "eui-search-results");
    resultsDiv.style.display = "none";
    bar.appendChild(resultsDiv);

    var activeIdx = -1;

    function showResults(items, query) {
      resultsDiv.textContent = "";
      if (!items || items.length === 0) {
        resultsDiv.style.display = "block";
        resultsDiv.appendChild(createEl("div", "eui-search-no-results", "No results"));
        return;
      }
      resultsDiv.style.display = "block";
      activeIdx = -1;
      items.forEach(function (item, i) {
        var el = createEl("div", "eui-search-result");
        if (opts.renderItem) {
          opts.renderItem(el, item, query);
        } else {
          el.textContent = item.label || item.title || String(item);
        }
        el.dataset.idx = String(i);
        el.addEventListener("click", function () {
          resultsDiv.style.display = "none";
          if (opts.onSelect) opts.onSelect(item);
        });
        el.addEventListener("mouseenter", function () {
          resultsDiv.querySelectorAll(".eui-search-result").forEach(function (r) { r.classList.remove("active"); });
          el.classList.add("active");
          activeIdx = i;
        });
        resultsDiv.appendChild(el);
      });
    }

    input.addEventListener("input", function () {
      var q = input.value.trim();
      if (!q) { resultsDiv.style.display = "none"; return; }
      if (opts.onSearch) opts.onSearch(q, showResults);
    });

    input.addEventListener("keydown", function (e) {
      var results = resultsDiv.querySelectorAll(".eui-search-result");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, results.length - 1);
        results.forEach(function (r, i) { r.classList.toggle("active", i === activeIdx); });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
        results.forEach(function (r, i) { r.classList.toggle("active", i === activeIdx); });
      } else if (e.key === "Enter") {
        if (activeIdx >= 0 && results[activeIdx]) {
          results[activeIdx].click();
        } else if (opts.onSearch) {
          opts.onSearch(input.value.trim(), showResults);
        }
      } else if (e.key === "Escape") {
        resultsDiv.style.display = "none";
      }
    });

    // Close on outside click
    document.addEventListener("click", function (e) {
      if (!bar.contains(e.target)) resultsDiv.style.display = "none";
    });

    if (opts.container) opts.container.insertBefore(bar, opts.container.firstChild);
    return { element: bar, input: input, showResults: showResults };
  }

  /* ═══════════════════════════════════════════════════════════
     COLOR PICKER
     ═══════════════════════════════════════════════════════════ */

  function createColorPicker(opts) {
    opts = opts || {};
    var wrap = createEl("div", "eui-color-row");

    var swatch = createEl("div", "eui-color-swatch");
    swatch.style.background = opts.value || "#58a6ff";
    var colorInput = createEl("input");
    colorInput.type = "color";
    colorInput.value = opts.value || "#58a6ff";
    swatch.appendChild(colorInput);
    wrap.appendChild(swatch);

    var hexWrap = createEl("div", "eui-color-hex");
    var hexInput = createEl("input", "eui-input");
    hexInput.type = "text";
    hexInput.value = (opts.value || "#58a6ff").toUpperCase();
    hexInput.maxLength = 7;
    hexInput.spellcheck = false;
    hexWrap.appendChild(hexInput);
    wrap.appendChild(hexWrap);

    if (opts.container) opts.container.appendChild(wrap);

    return {
      element: wrap,
      getValue: function () { return colorInput.value; },
      setValue: function (hex) {
        colorInput.value = hex;
        swatch.style.background = hex;
        hexInput.value = hex.toUpperCase();
      },
      onChange: function (cb) {
        colorInput.addEventListener("input", function () {
          swatch.style.background = colorInput.value;
          hexInput.value = colorInput.value.toUpperCase();
          cb(colorInput.value);
        });
        hexInput.addEventListener("change", function () {
          var v = hexInput.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            colorInput.value = v;
            swatch.style.background = v;
            cb(v);
          }
        });
      },
    };
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT NAMESPACE
     ═══════════════════════════════════════════════════════════ */

  var ExtUI = {
    // Class-based components
    Dashboard: Dashboard,
    TabPanel: TabPanel,
    SortableList: SortableList,
    HistoryView: HistoryView,
    Popup: Popup,
    Modal: Modal,
    Toast: Toast,
    Skeleton: Skeleton,

    // Factory functions
    createSettingRow: createSettingRow,
    createImportExport: createImportExport,
    createShortcutsList: createShortcutsList,
    createSection: createSection,
    createPreview: createPreview,
    createAbout: createAbout,
    createBanner: createBanner,
    createHTabs: createHTabs,
    createAccordion: createAccordion,
    createCardGrid: createCardGrid,
    createStatsGrid: createStatsGrid,
    createTable: createTable,
    createFilter: createFilter,
    createCodeBlock: createCodeBlock,
    createProgress: createProgress,
    createQuickActions: createQuickActions,
    createSearchBar: createSearchBar,
    createColorPicker: createColorPicker,

    // Helpers
    timeAgo: timeAgo,
    truncate: truncate,
    escapeHtml: escapeHtml,
    createEl: createEl,
  };

  // Expose globally
  root.ExtUI = ExtUI;

})(window);