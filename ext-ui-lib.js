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
     EXPORT NAMESPACE
     ═══════════════════════════════════════════════════════════ */

  var ExtUI = {
    // Components
    Dashboard: Dashboard,
    TabPanel: TabPanel,
    SortableList: SortableList,
    HistoryView: HistoryView,
    Popup: Popup,

    // Factory functions
    createSettingRow: createSettingRow,
    createImportExport: createImportExport,
    createShortcutsList: createShortcutsList,
    createSection: createSection,
    createPreview: createPreview,

    // Helpers
    timeAgo: timeAgo,
    truncate: truncate,
    escapeHtml: escapeHtml,
    createEl: createEl,
  };

  // Expose globally
  root.ExtUI = ExtUI;

})(window);