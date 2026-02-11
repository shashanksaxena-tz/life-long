/* ========================================
   Life Long - Shared Utilities
   ======================================== */

var LL = (function() {
  'use strict';

  // --- Date formatting ---
  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateLong(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getDayOfWeek(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    if (isNaN(d)) return null;
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  }

  function relativeDate(dateStr) {
    var days = daysUntil(dateStr);
    if (days === null) return '';
    if (days < 0) return Math.abs(days) + 'd overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days <= 7) return 'Due in ' + days + 'd';
    return 'Due ' + formatDate(dateStr);
  }

  // --- Badge helpers ---
  function badgeClass(status) {
    if (!status) return 'badge-todo';
    var s = status.toLowerCase().replace(/\s+/g, '-');
    if (s === 'done' || s === 'active') return 'badge-done';
    if (s === 'in-progress') return 'badge-in-progress';
    if (s === 'planning') return 'badge-planning';
    if (s === 'raw') return 'badge-raw';
    if (s === 'archived') return 'badge-archived';
    return 'badge-todo';
  }

  function priorityBadgeClass(priority) {
    if (!priority) return '';
    var p = priority.toLowerCase();
    if (p === 'critical') return 'badge-priority-critical';
    if (p === 'high') return 'badge-priority-high';
    if (p === 'medium') return 'badge-priority-medium';
    if (p === 'low') return 'badge-priority-low';
    return '';
  }

  function dueDateClass(dateStr) {
    var days = daysUntil(dateStr);
    if (days === null) return '';
    if (days < 0) return 'overdue';
    if (days <= 3) return 'due-soon';
    return 'due-later';
  }

  // --- Markdown renderer ---
  function renderMarkdown(text) {
    if (!text) return '';
    var html = text;

    html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(m, lang, code) {
      return '<pre><code>' + code.trim() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, function(match) {
      if (match.indexOf('<ul>') === -1) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs
    var lines = html.split('\n');
    var result = [];
    var inBlock = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.match(/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|div|table)/)) {
        inBlock = true;
        result.push(line);
      } else if (line.match(/^<\/(ul|ol|pre|blockquote|div|table)/)) {
        inBlock = false;
        result.push(line);
      } else if (line === '') {
        result.push('');
      } else if (!inBlock && !line.match(/^<\//)) {
        result.push('<p>' + line + '</p>');
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
  }

  // --- Search helper ---
  function matchesSearch(item, query, fields) {
    if (!query) return true;
    var q = query.toLowerCase();
    for (var i = 0; i < fields.length; i++) {
      var val = item[fields[i]];
      if (typeof val === 'string' && val.toLowerCase().indexOf(q) !== -1) return true;
      if (Array.isArray(val)) {
        for (var j = 0; j < val.length; j++) {
          if (typeof val[j] === 'string' && val[j].toLowerCase().indexOf(q) !== -1) return true;
        }
      }
    }
    return false;
  }

  // --- Export helpers ---
  function exportJSON(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
  }

  function exportCSV(items, columns, filename) {
    var rows = [columns.map(function(c) { return c.label; }).join(',')];
    items.forEach(function(item) {
      var row = columns.map(function(c) {
        var val = item[c.key];
        if (Array.isArray(val)) val = val.join('; ');
        if (val === undefined || val === null) val = '';
        val = String(val).replace(/"/g, '""');
        return '"' + val + '"';
      });
      rows.push(row.join(','));
    });
    var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    downloadBlob(blob, filename);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Keyboard shortcuts ---
  var shortcuts = {};
  var shortcutPanelVisible = false;

  function registerShortcut(key, description, handler) {
    shortcuts[key.toLowerCase()] = { description: description, handler: handler };
  }

  function initKeyboardShortcuts() {
    // Default navigation shortcuts
    registerShortcut('g d', 'Go to Dashboard', function() { window.location.href = 'index.html'; });
    registerShortcut('g p', 'Go to Projects', function() { window.location.href = 'projects.html'; });
    registerShortcut('g t', 'Go to Tasks', function() { window.location.href = 'tasks.html'; });
    registerShortcut('g l', 'Go to Logs', function() { window.location.href = 'logs.html'; });
    registerShortcut('g i', 'Go to Ideas', function() { window.location.href = 'ideas.html'; });
    registerShortcut('n', 'New item (Add)', function() { if (window.llShowAddModal) window.llShowAddModal(); });
    registerShortcut('/', 'Focus search', function() {
      var input = document.querySelector('.search-input');
      if (input) { input.focus(); return true; }
    });
    registerShortcut('?', 'Toggle shortcut help', function() { toggleShortcutPanel(); });

    var keyBuffer = '';
    var bufferTimeout = null;

    document.addEventListener('keydown', function(e) {
      // Don't trigger in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      // Don't trigger if modifier keys (except shift for ?)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      var key = e.key;

      if (bufferTimeout) clearTimeout(bufferTimeout);
      keyBuffer += key.toLowerCase();

      // Check for exact match
      if (shortcuts[keyBuffer]) {
        e.preventDefault();
        shortcuts[keyBuffer].handler();
        keyBuffer = '';
        return;
      }

      // Check if any shortcut starts with buffer
      var hasPrefix = Object.keys(shortcuts).some(function(k) { return k.indexOf(keyBuffer) === 0 && k !== keyBuffer; });
      if (hasPrefix) {
        bufferTimeout = setTimeout(function() { keyBuffer = ''; }, 800);
      } else {
        keyBuffer = '';
      }
    });
  }

  function toggleShortcutPanel() {
    shortcutPanelVisible = !shortcutPanelVisible;
    var panel = document.getElementById('ll-shortcut-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'll-shortcut-panel';
      panel.className = 'shortcut-panel';
      var html = '<h4>Keyboard Shortcuts</h4>';
      Object.keys(shortcuts).forEach(function(key) {
        html += '<div class="shortcut-row"><span>' + shortcuts[key].description + '</span><span class="shortcut-key">' + key + '</span></div>';
      });
      panel.innerHTML = html;
      document.body.appendChild(panel);
    }
    panel.classList.toggle('visible', shortcutPanelVisible);
  }

  // --- Streak calculation ---
  function calculateStreak(logs) {
    if (!logs || logs.length === 0) return { current: 0, longest: 0, days: [] };

    var dates = logs.map(function(l) { return l.date; }).filter(Boolean).sort().reverse();
    var uniqueDates = [];
    dates.forEach(function(d) { if (uniqueDates.indexOf(d) === -1) uniqueDates.push(d); });

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = today.toISOString().split('T')[0];

    // Current streak
    var current = 0;
    var checkDate = new Date(today);
    // Allow today or yesterday as start
    if (uniqueDates.indexOf(todayStr) !== -1) {
      current = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      var yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      var yesterdayStr = yesterday.toISOString().split('T')[0];
      if (uniqueDates.indexOf(yesterdayStr) !== -1) {
        current = 1;
        checkDate = new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    if (current > 0) {
      while (true) {
        var ds = checkDate.toISOString().split('T')[0];
        if (uniqueDates.indexOf(ds) !== -1) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest streak
    var longest = 0;
    var tempStreak = 1;
    for (var i = 0; i < uniqueDates.length - 1; i++) {
      var d1 = new Date(uniqueDates[i]);
      var d2 = new Date(uniqueDates[i + 1]);
      var diff = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        tempStreak++;
      } else {
        if (tempStreak > longest) longest = tempStreak;
        tempStreak = 1;
      }
    }
    if (tempStreak > longest) longest = tempStreak;
    if (uniqueDates.length === 1 && longest === 0) longest = 1;

    // Last 30 days map
    var last30 = [];
    for (var d = 29; d >= 0; d--) {
      var dd = new Date(today);
      dd.setDate(dd.getDate() - d);
      var dateStr = dd.toISOString().split('T')[0];
      last30.push({
        date: dateStr,
        active: uniqueDates.indexOf(dateStr) !== -1,
        today: d === 0
      });
    }

    return { current: current, longest: longest, days: last30 };
  }

  // --- Weekly summary ---
  function weeklyStats(tasks, logs) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    var tasksCompleted = 0;
    var tasksCreated = 0;
    (tasks || []).forEach(function(t) {
      var updated = new Date(t.updated || t.created);
      var created = new Date(t.created);
      if (t.status === 'done' && updated >= weekAgo) tasksCompleted++;
      if (created >= weekAgo) tasksCreated++;
    });

    var logCount = 0;
    (logs || []).forEach(function(l) {
      var ld = new Date(l.date);
      if (ld >= weekAgo) logCount++;
    });

    return {
      tasksCompleted: tasksCompleted,
      tasksCreated: tasksCreated,
      logEntries: logCount
    };
  }

  // --- Productivity score ---
  function productivityScore(tasks, logs) {
    var ws = weeklyStats(tasks, logs);
    // Simple scoring: tasks completed * 20 + log entries * 10 + tasks created * 5, capped at 100
    var score = Math.min(100, ws.tasksCompleted * 20 + ws.logEntries * 10 + ws.tasksCreated * 5);
    return score;
  }

  // --- Init ---
  function init() {
    initKeyboardShortcuts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    formatDate: formatDate,
    formatDateLong: formatDateLong,
    getDayOfWeek: getDayOfWeek,
    daysUntil: daysUntil,
    relativeDate: relativeDate,
    badgeClass: badgeClass,
    priorityBadgeClass: priorityBadgeClass,
    dueDateClass: dueDateClass,
    renderMarkdown: renderMarkdown,
    matchesSearch: matchesSearch,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    calculateStreak: calculateStreak,
    weeklyStats: weeklyStats,
    productivityScore: productivityScore,
    registerShortcut: registerShortcut,
    toggleShortcutPanel: toggleShortcutPanel
  };
})();
