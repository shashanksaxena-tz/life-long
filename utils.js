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

    // Code blocks (preserve language for syntax highlighting)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function(m, lang, code) {
      var langClass = lang ? ' class="language-' + lang + '"' : '';
      return '<pre class="code-block"><code' + langClass + '>' + code.trim() + '</code></pre>';
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr>');

    // Blockquotes (handle multi-line)
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Checkbox lists (must come before regular lists)
    html = html.replace(/^[\s]*[-*] \[x\] (.+)$/gm, '<li class="md-checkbox checked"><span class="md-check">&#9745;</span> <span class="md-check-text">$1</span></li>');
    html = html.replace(/^[\s]*[-*] \[ \] (.+)$/gm, '<li class="md-checkbox"><span class="md-check">&#9744;</span> <span class="md-check-text">$1</span></li>');

    // Unordered lists
    html = html.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li[\s>][\s\S]*?<\/li>)/g, function(match) {
      if (match.indexOf('<ul>') === -1) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li class="md-ol-item">$1</li>');
    html = html.replace(/(<li class="md-ol-item">[\s\S]*?<\/li>)/g, function(match) {
      if (match.indexOf('<ol>') === -1) {
        return '<ol>' + match + '</ol>';
      }
      return match;
    });
    html = html.replace(/<\/ol>\s*<ol>/g, '');

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

  // --- Theme ---
  function getTheme() {
    return localStorage.getItem('lifelong_theme') || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem('lifelong_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === 'light' ? '#ffffff' : '#0d1117';
    }
  }

  function toggleTheme() {
    var current = getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  function initTheme() {
    var theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
  }

  // --- Keyboard shortcuts ---
  var shortcuts = {};
  var shortcutPanelVisible = false;

  function registerShortcut(key, description, handler) {
    shortcuts[key.toLowerCase()] = { description: description, handler: handler };
  }

  function initKeyboardShortcuts() {
    registerShortcut('g d', 'Go to Dashboard', function() { window.location.href = 'index.html'; });
    registerShortcut('g p', 'Go to Projects', function() { window.location.href = 'projects.html'; });
    registerShortcut('g t', 'Go to Tasks', function() { window.location.href = 'tasks.html'; });
    registerShortcut('g l', 'Go to Logs', function() { window.location.href = 'logs.html'; });
    registerShortcut('g i', 'Go to Ideas', function() { window.location.href = 'ideas.html'; });
    registerShortcut('g g', 'Go to Goals', function() { window.location.href = 'goals.html'; });
    registerShortcut('g h', 'Go to Habits', function() { window.location.href = 'habits.html'; });
    registerShortcut('n', 'New item (Add)', function() { if (window.llShowAddModal) window.llShowAddModal(); });
    registerShortcut('/', 'Focus search', function() {
      var input = document.querySelector('.search-input');
      if (input) { input.focus(); return true; }
    });
    registerShortcut('?', 'Toggle shortcut help', function() { toggleShortcutPanel(); });
    registerShortcut('1', 'Dashboard', function() { window.location.href = 'index.html'; });
    registerShortcut('2', 'Projects', function() { window.location.href = 'projects.html'; });
    registerShortcut('3', 'Tasks', function() { window.location.href = 'tasks.html'; });
    registerShortcut('4', 'Logs', function() { window.location.href = 'logs.html'; });
    registerShortcut('5', 'Ideas', function() { window.location.href = 'ideas.html'; });
    registerShortcut('6', 'Goals', function() { window.location.href = 'goals.html'; });
    registerShortcut('7', 'Habits', function() { window.location.href = 'habits.html'; });
    registerShortcut('t', 'Toggle theme', function() {
      var newTheme = toggleTheme();
      var btns = document.querySelectorAll('.theme-toggle');
      btns.forEach(function(btn) {
        btn.textContent = newTheme === 'dark' ? '\u2600' : '\u263E';
      });
    });

    var keyBuffer = '';
    var bufferTimeout = null;

    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      var key = e.key;
      if (bufferTimeout) clearTimeout(bufferTimeout);
      keyBuffer += key.toLowerCase();

      if (shortcuts[keyBuffer]) {
        e.preventDefault();
        shortcuts[keyBuffer].handler();
        keyBuffer = '';
        return;
      }

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

    var current = 0;
    var checkDate = new Date(today);
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

  // --- Activity Heatmap (GitHub-style, 365 days) ---
  function buildActivityHeatmap(logs, tasks) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var todayStr = today.toISOString().split('T')[0];

    var activityMap = {};
    (logs || []).forEach(function(l) {
      if (l.date) activityMap[l.date] = (activityMap[l.date] || 0) + 2;
    });
    (tasks || []).forEach(function(t) {
      var d = t.updated || t.created;
      if (d) activityMap[d] = (activityMap[d] || 0) + 1;
    });

    var cells = [];
    var startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    var dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    for (var d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      var ds = d.toISOString().split('T')[0];
      var count = activityMap[ds] || 0;
      var level = '';
      if (count >= 4) level = 'l4';
      else if (count >= 3) level = 'l3';
      else if (count >= 2) level = 'l2';
      else if (count >= 1) level = 'l1';
      cells.push({ date: ds, count: count, level: level, isToday: ds === todayStr });
    }

    return cells;
  }

  // --- Sparkline SVG generator ---
  function sparklineSVG(values, width, height, color) {
    width = width || 80;
    height = height || 20;
    color = color || 'var(--accent-green-text)';
    if (!values || values.length < 2) return '';

    var max = Math.max.apply(null, values);
    if (max === 0) max = 1;
    var step = width / (values.length - 1);

    var points = values.map(function(v, i) {
      var x = i * step;
      var y = height - (v / max * height * 0.8) - 2;
      return x + ',' + y;
    });

    return '<svg class="sparkline" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
      '<polyline fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="' + points.join(' ') + '"/>' +
    '</svg>';
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

    return { tasksCompleted: tasksCompleted, tasksCreated: tasksCreated, logEntries: logCount };
  }

  // --- Productivity score ---
  function productivityScore(tasks, logs) {
    var ws = weeklyStats(tasks, logs);
    var score = Math.min(100, ws.tasksCompleted * 20 + ws.logEntries * 10 + ws.tasksCreated * 5);
    return score;
  }

  // --- Task completion trend (last 7 weeks) ---
  function weeklyCompletionTrend(tasks) {
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var weeks = [];
    for (var w = 6; w >= 0; w--) {
      var weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      var weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      var count = 0;
      (tasks || []).forEach(function(t) {
        if (t.status === 'done') {
          var d = new Date(t.updated || t.created);
          if (d >= weekStart && d < weekEnd) count++;
        }
      });
      weeks.push(count);
    }
    return weeks;
  }

  // --- Progress bar HTML ---
  function progressBarHTML(done, total) {
    if (total === 0) return '';
    var pct = Math.round((done / total) * 100);
    var cls = pct >= 60 ? '' : pct >= 30 ? ' medium' : ' low';
    return '<div class="progress-bar-container"><div class="progress-bar-fill' + cls + '" style="width:' + pct + '%"></div></div>' +
      '<div class="progress-text">' + pct + '% complete (' + done + '/' + total + ')</div>';
  }

  // --- Global search ---
  var globalSearchVisible = false;

  function openGlobalSearch(data) {
    if (globalSearchVisible) return;
    globalSearchVisible = true;

    var overlay = document.createElement('div');
    overlay.className = 'global-search-overlay';
    overlay.id = 'll-global-search';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeGlobalSearch();
    });

    var box = document.createElement('div');
    box.className = 'global-search-box';

    var input = document.createElement('input');
    input.className = 'global-search-input';
    input.placeholder = 'Search everything...';
    input.type = 'text';

    var results = document.createElement('div');
    results.className = 'global-search-results';
    results.innerHTML = '<div class="global-search-empty">Type to search across all projects, tasks, ideas, and logs</div>';

    var hint = document.createElement('div');
    hint.className = 'global-search-hint';
    hint.innerHTML = '<span><span class="kbd">Esc</span> close</span><span><span class="kbd">&uarr;&darr;</span> navigate</span><span><span class="kbd">Enter</span> go</span>';

    box.appendChild(input);
    box.appendChild(results);
    box.appendChild(hint);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    setTimeout(function() { input.focus(); }, 50);

    var selectedIdx = -1;

    input.addEventListener('input', function() {
      selectedIdx = -1;
      var q = input.value.trim().toLowerCase();
      if (!q) {
        results.innerHTML = '<div class="global-search-empty">Type to search across all projects, tasks, ideas, and logs</div>';
        return;
      }
      var items = searchAllEntities(data, q);
      if (items.length === 0) {
        results.innerHTML = '<div class="global-search-empty">No results for "' + input.value.trim() + '"</div>';
        return;
      }
      results.innerHTML = items.map(function(item, i) {
        return '<div class="global-search-item" data-href="' + item.href + '" data-idx="' + i + '">' +
          '<span class="gs-type">' + item.type + '</span>' +
          '<span class="gs-title">' + item.title + '</span>' +
          '<span class="gs-meta">' + (item.meta || '') + '</span>' +
        '</div>';
      }).join('');

      results.querySelectorAll('.global-search-item').forEach(function(el) {
        el.addEventListener('click', function() { window.location.href = el.dataset.href; });
      });
    });

    input.addEventListener('keydown', function(e) {
      var items = results.querySelectorAll('.global-search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
        updateSel(items, selectedIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        updateSel(items, selectedIdx);
      } else if (e.key === 'Enter' && selectedIdx >= 0 && items[selectedIdx]) {
        window.location.href = items[selectedIdx].dataset.href;
      } else if (e.key === 'Escape') {
        closeGlobalSearch();
      }
    });
  }

  function updateSel(items, idx) {
    items.forEach(function(el, i) { el.classList.toggle('selected', i === idx); });
    if (items[idx]) items[idx].scrollIntoView({ block: 'nearest' });
  }

  function searchAllEntities(data, query) {
    var res = [];
    if (!data) return res;

    (data.projects || []).forEach(function(p) {
      if (matchesSearch(p, query, ['name', 'id', 'tags', 'body', 'status'])) {
        res.push({ type: 'Project', title: p.name || p.id, meta: p.status, href: 'projects.html' });
      }
    });
    (data.tasks || []).forEach(function(t) {
      if (matchesSearch(t, query, ['title', 'id', 'project', 'tags', 'body', 'status'])) {
        res.push({ type: 'Task', title: t.title || t.id, meta: t.status + (t.project ? ' / ' + t.project : ''), href: 'tasks.html' });
      }
    });
    (data.ideas || []).forEach(function(idea) {
      if (matchesSearch(idea, query, ['body', 'id', 'tags', 'status'])) {
        var summary = idea.body ? idea.body.split('\n').find(function(l) { return l.trim(); }) : '';
        if (summary) summary = summary.replace(/^#+\s*/, '').substring(0, 60);
        res.push({ type: 'Idea', title: summary || idea.id, meta: idea.status, href: 'ideas.html' });
      }
    });
    (data.logs || []).forEach(function(l) {
      if (matchesSearch(l, query, ['date', 'body'])) {
        var summary = l.body ? l.body.split('\n').find(function(ln) { return ln.trim(); }) : '';
        if (summary) summary = summary.replace(/^#+\s*/, '').substring(0, 60);
        res.push({ type: 'Log', title: summary || l.date, meta: formatDate(l.date), href: 'logs.html' });
      }
    });
    (data.goals || []).forEach(function(g) {
      if (matchesSearch(g, query, ['title', 'id', 'tags', 'body', 'status'])) {
        res.push({ type: 'Goal', title: g.title || g.id, meta: g.status, href: 'goals.html' });
      }
    });
    (data.habits || []).forEach(function(h) {
      if (matchesSearch(h, query, ['name', 'id', 'tags', 'body'])) {
        res.push({ type: 'Habit', title: h.name || h.id, meta: h.frequency || '', href: 'habits.html' });
      }
    });

    return res.slice(0, 25);
  }

  function closeGlobalSearch() {
    globalSearchVisible = false;
    var el = document.getElementById('ll-global-search');
    if (el) el.remove();
  }

  // --- Init ---
  function init() {
    initTheme();
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
    toggleShortcutPanel: toggleShortcutPanel,
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    buildActivityHeatmap: buildActivityHeatmap,
    sparklineSVG: sparklineSVG,
    weeklyCompletionTrend: weeklyCompletionTrend,
    progressBarHTML: progressBarHTML,
    openGlobalSearch: openGlobalSearch,
    closeGlobalSearch: closeGlobalSearch
  };
})();
