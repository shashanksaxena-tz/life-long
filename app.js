(function() {
  'use strict';

  var STORAGE_KEY = 'lifelong_config';
  var cachedData = null;

  function getConfig() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch(e) { return {}; }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  function getRepoInfo() {
    var cfg = getConfig();
    var host = window.location.hostname;
    var owner = cfg.owner || '';
    var repo = cfg.repo || '';
    if (!owner && host.endsWith('.github.io')) {
      owner = host.split('.')[0];
      repo = window.location.pathname.split('/').filter(Boolean)[0] || '';
    }
    return { owner: owner, repo: repo, token: cfg.token || '' };
  }

  async function loadSiteData() {
    if (cachedData) return cachedData;
    try {
      var res = await fetch('data/index.json?t=' + Date.now());
      cachedData = await res.json();
      return cachedData;
    } catch(e) { return null; }
  }

  function invalidateCache() { cachedData = null; }

  // Re-fetch data and re-render the current page after an action
  function triggerPageRefresh() {
    // Each page defines its own global load function — call whichever exists
    var loaders = [
      'loadDashboard', 'loadProjects', 'loadTasks',
      'loadGoals', 'loadLogs', 'loadIdeas', 'loadHabits'
    ];
    for (var i = 0; i < loaders.length; i++) {
      if (typeof window[loaders[i]] === 'function') {
        window[loaders[i]]();
        return;
      }
    }
  }

  async function createGitHubIssue(title, body) {
    var info = getRepoInfo();
    if (!info.token) { showToast('Set your GitHub token in Settings first.', 'error'); showSettingsModal(); throw new Error('No token configured'); }
    if (!info.owner || !info.repo) { showToast('Set repository owner/name in Settings first.', 'error'); showSettingsModal(); throw new Error('No repo configured'); }
    var res = await fetch('https://api.github.com/repos/' + info.owner + '/' + info.repo + '/issues', {
      method: 'POST',
      headers: { 'Authorization': 'token ' + info.token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, body: body, labels: ['input'] })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      if (res.status === 401) throw new Error('Invalid token — check Settings');
      if (res.status === 403) throw new Error('Token lacks permissions — needs repo or public_repo scope');
      if (res.status === 404) throw new Error('Repository not found — check Settings');
      throw new Error(err.message || ('HTTP ' + res.status));
    }
    return res.json();
  }

  function injectStyles() {
    if (document.getElementById('ll-app-styles')) return;
    var style = document.createElement('style');
    style.id = 'll-app-styles';
    style.textContent = [
      '.ll-nav-actions{display:flex;gap:0.5rem;margin-left:auto;align-items:center}',
      '.ll-nav-btn{background:var(--bg-tertiary);color:var(--text-secondary);border:none;padding:0.45rem 0.85rem;border-radius:10px;cursor:pointer;font-size:0.85rem;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);display:inline-flex;align-items:center;gap:0.3rem;font-family:inherit;box-shadow:var(--shadow-sm)}',
      '.ll-nav-btn:hover{color:var(--text-primary);background:var(--accent-blue-dim);transform:translateY(-1px);box-shadow:var(--shadow-md)}',
      '.ll-nav-btn:active{transform:scale(0.97)}',
      '.ll-nav-btn-primary{background:var(--accent-green);color:#fff;box-shadow:0 2px 8px rgba(34,197,94,0.25)}',
      '.ll-nav-btn-primary:hover{background:var(--accent-green-hover);box-shadow:0 4px 16px rgba(34,197,94,0.3)}',
      '.ll-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);animation:ll-overlayin 0.2s ease}',
      '@keyframes ll-overlayin{from{opacity:0}to{opacity:1}}',
      '.ll-modal{background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:16px;width:90%;max-width:720px;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-xl);animation:ll-modalin 0.25s cubic-bezier(0.4,0,0.2,1)}',
      '@keyframes ll-modalin{from{transform:scale(0.95) translateY(10px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}',
      '.ll-modal-header{padding:1.25rem 1.5rem;border-bottom:1px solid var(--border-primary);display:flex;justify-content:space-between;align-items:center}',
      '.ll-modal-header h2{color:var(--text-primary);font-size:1.1rem;margin:0;font-weight:600;letter-spacing:-0.02em}',
      '.ll-modal-close{background:var(--bg-tertiary);border:none;color:var(--text-muted);width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:1.2rem;display:flex;align-items:center;justify-content:center;transition:all 0.15s}',
      '.ll-modal-close:hover{color:var(--text-primary);background:var(--accent-red);color:#fff}',
      '.ll-modal-body{padding:1.5rem}',
      '.ll-tabs{display:flex;gap:0.25rem;border-bottom:1px solid var(--border-primary);padding:0 1.25rem;overflow-x:auto}',
      '.ll-tab{padding:0.65rem 0.9rem;color:var(--text-muted);cursor:pointer;font-size:0.85rem;font-weight:500;border-bottom:2px solid transparent;transition:all 0.2s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}',
      '.ll-tab:hover{color:var(--text-secondary)}',
      '.ll-tab.active{color:var(--text-primary);border-bottom-color:var(--accent-blue)}',
      '.ll-form-group{margin-bottom:1.15rem}',
      '.ll-form-group label{display:block;font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.4rem;font-weight:500}',
      '.ll-hint{font-size:0.75rem;color:var(--text-muted);margin-bottom:0.4rem}',
      '.ll-input,.ll-textarea,.ll-select{width:100%;background:var(--bg-input);color:var(--text-secondary);border:1px solid var(--border-primary);border-radius:10px;padding:0.6rem 0.85rem;font-size:0.9rem;font-family:inherit;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);box-sizing:border-box}',
      '.ll-input:focus,.ll-textarea:focus,.ll-select:focus{border-color:var(--accent-blue);outline:none;box-shadow:0 0 0 3px var(--accent-blue-dim)}',
      '.ll-textarea{min-height:120px;resize:vertical;line-height:1.6}',
      '.ll-select{cursor:pointer}',
      '.ll-btn{padding:0.55rem 1.1rem;border-radius:10px;font-size:0.9rem;font-weight:500;cursor:pointer;border:none;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);font-family:inherit}',
      '.ll-btn:active{transform:scale(0.97)}',
      '.ll-btn-submit{background:var(--accent-green);color:#fff;box-shadow:0 2px 8px rgba(34,197,94,0.2)}',
      '.ll-btn-submit:hover{background:var(--accent-green-hover);box-shadow:0 4px 16px rgba(34,197,94,0.3)}',
      '.ll-btn-submit:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none}',
      '.ll-btn-cancel{background:var(--bg-tertiary);color:var(--text-secondary);box-shadow:var(--shadow-sm)}',
      '.ll-btn-cancel:hover{background:var(--border-primary);color:var(--text-primary)}',
      '.ll-btn-danger{background:rgba(239,68,68,0.1);color:var(--accent-red);box-shadow:none}',
      '.ll-btn-danger:hover{background:var(--accent-red);color:#fff}',
      '.ll-form-actions{display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border-secondary)}',
      '.ll-toast{position:fixed;bottom:1.5rem;right:1.5rem;padding:0.85rem 1.25rem;border-radius:12px;font-size:0.9rem;z-index:2000;max-width:420px;animation:ll-fadein 0.3s cubic-bezier(0.4,0,0.2,1);border:none}',
      '.ll-toast-success{background:var(--accent-green);color:#fff;box-shadow:0 8px 24px rgba(34,197,94,0.3)}',
      '.ll-toast-error{background:var(--accent-red);color:#fff;box-shadow:0 8px 24px rgba(239,68,68,0.3)}',
      '.ll-toast-info{background:var(--accent-blue-bg);color:#fff;box-shadow:0 8px 24px rgba(59,130,246,0.3)}',
      '.ll-toast a{color:#fff;text-decoration:underline}',
      '@keyframes ll-fadein{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '.ll-token-toggle{background:var(--bg-tertiary);border:none;color:var(--text-muted);border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem;margin-left:0.5rem;transition:all 0.15s}',
      '.ll-token-toggle:hover{color:var(--text-secondary);background:var(--border-primary)}',
      // Inline action buttons on cards
      '.ll-card-actions{display:flex;gap:0.35rem;margin-top:0.65rem;padding-top:0.65rem;border-top:1px solid var(--border-secondary);flex-wrap:wrap}',
      '.ll-card-btn{background:var(--bg-tertiary);color:var(--text-muted);border:none;padding:0.3rem 0.65rem;border-radius:8px;cursor:pointer;font-size:0.75rem;font-weight:500;transition:all 0.15s cubic-bezier(0.4,0,0.2,1);font-family:inherit;display:inline-flex;align-items:center;gap:0.3rem;white-space:nowrap}',
      '.ll-card-btn:hover{background:var(--accent-blue-dim);color:var(--accent-blue);transform:translateY(-1px)}',
      '.ll-card-btn:active{transform:scale(0.92)}',
      '.ll-card-btn.btn-done{color:var(--accent-green-text)}',
      '.ll-card-btn.btn-done:hover{background:rgba(34,197,94,0.15);color:var(--accent-green)}',
      '.ll-card-btn.btn-check{background:var(--accent-green);color:#fff;box-shadow:0 1px 4px rgba(34,197,94,0.2)}',
      '.ll-card-btn.btn-check:hover{box-shadow:0 2px 8px rgba(34,197,94,0.3);background:var(--accent-green-hover)}',
      '.ll-card-btn.btn-check.checked{background:var(--bg-tertiary);color:var(--text-muted)}',
      '.ll-quick-row{display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap}',
      '.ll-quick-select{background:var(--bg-tertiary);color:var(--text-secondary);border:1px solid var(--border-primary);border-radius:8px;padding:0.3rem 0.5rem;font-size:0.75rem;font-family:inherit;cursor:pointer}',
      // Relative time badge
      '.ll-relative-time{font-size:0.78rem;color:var(--text-muted)}',
      '@media(max-width:768px){.ll-nav-actions{margin-left:0;margin-top:0.5rem}.ll-modal{width:95%;max-height:90vh;border-radius:12px}.ll-tabs{padding:0 0.75rem}.ll-tab{padding:0.5rem 0.6rem;font-size:0.8rem}.ll-card-actions{gap:0.25rem}.ll-card-btn{font-size:0.7rem;padding:0.25rem 0.5rem}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  var toastTimer = null;
  function showToast(message, type) {
    type = type || 'info';
    var existing = document.querySelector('.ll-toast');
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);
    var toast = document.createElement('div');
    toast.className = 'll-toast ll-toast-' + type;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    toastTimer = setTimeout(function() { toast.remove(); }, 6000);
  }

  function closeModal() {
    var overlay = document.querySelector('.ll-overlay');
    if (overlay) overlay.remove();
  }

  function createModal(title) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.className = 'll-overlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    var modal = document.createElement('div');
    modal.className = 'll-modal';
    var header = document.createElement('div');
    header.className = 'll-modal-header';
    header.innerHTML = '<h2>' + title + '</h2>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'll-modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeModal);
    header.appendChild(closeBtn);
    modal.appendChild(header);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    return modal;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showSettingsModal() {
    var cfg = getConfig();
    var info = getRepoInfo();
    var modal = createModal('Settings');
    var body = document.createElement('div');
    body.className = 'll-modal-body';
    body.innerHTML =
      '<div class="ll-form-group"><label>GitHub Personal Access Token</label><div class="ll-hint">Create at GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens. Needs "repo" scope.</div><div style="display:flex;align-items:center"><input type="password" class="ll-input" id="ll-cfg-token" value="' + escapeHtml(cfg.token || '') + '" placeholder="ghp_xxxxxxxxxxxx" style="flex:1"><button class="ll-token-toggle" id="ll-toggle-vis">show</button></div></div>' +
      '<div class="ll-form-group"><label>Repository Owner</label><input class="ll-input" id="ll-cfg-owner" value="' + escapeHtml(info.owner) + '" placeholder="e.g. shashanksaxena-tz"></div>' +
      '<div class="ll-form-group"><label>Repository Name</label><input class="ll-input" id="ll-cfg-repo" value="' + escapeHtml(info.repo) + '" placeholder="e.g. life-long"></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-cfg-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-cfg-save">Save</button></div>';
    modal.appendChild(body);
    body.querySelector('#ll-toggle-vis').addEventListener('click', function() {
      var inp = body.querySelector('#ll-cfg-token');
      if (inp.type === 'password') { inp.type = 'text'; this.textContent = 'hide'; } else { inp.type = 'password'; this.textContent = 'show'; }
    });
    body.querySelector('#ll-cfg-cancel').addEventListener('click', closeModal);
    body.querySelector('#ll-cfg-save').addEventListener('click', function() {
      saveConfig({ token: body.querySelector('#ll-cfg-token').value.trim(), owner: body.querySelector('#ll-cfg-owner').value.trim(), repo: body.querySelector('#ll-cfg-repo').value.trim() });
      closeModal();
      showToast('Settings saved.', 'success');
    });
  }

  async function submitForm(btn, originalText, title, bodyText, entityName) {
    btn.disabled = true; btn.textContent = 'Submitting...';
    try {
      var issue = await createGitHubIssue(title, bodyText);
      closeModal(); invalidateCache();
      showToast(entityName + ' submitted! <a href="' + issue.html_url + '" target="_blank">Issue #' + issue.number + '</a> &mdash; site updates in ~2 min.', 'success');
      triggerPageRefresh();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.textContent = originalText; }
  }

  // --- Quick inline action (no modal, just creates issue directly) ---
  async function quickAction(btnEl, title, bodyText, entityName) {
    var origText = btnEl.textContent;
    btnEl.disabled = true; btnEl.textContent = '...';
    try {
      var issue = await createGitHubIssue(title, bodyText);
      invalidateCache();
      btnEl.textContent = '\u2713';
      btnEl.style.color = 'var(--accent-green)';
      showToast(entityName + ' <a href="' + issue.html_url + '" target="_blank">#' + issue.number + '</a>', 'success');
      setTimeout(function() { btnEl.textContent = origText; btnEl.disabled = false; btnEl.style.color = ''; }, 2000);
      triggerPageRefresh();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); btnEl.disabled = false; btnEl.textContent = origText; }
  }

  // =========================================
  // LIVE PREVIEW HELPER
  // =========================================

  function attachLivePreview(container) {
    var textareas = container.querySelectorAll('.ll-textarea[data-preview]');
    textareas.forEach(function(ta) {
      var previewId = ta.getAttribute('data-preview');
      var previewPane = container.querySelector('#' + previewId);
      if (!previewPane) return;
      function updatePreview() {
        var val = ta.value.trim();
        if (val && typeof LL !== 'undefined' && LL.renderMarkdown) {
          previewPane.innerHTML = LL.renderMarkdown(val);
        } else {
          previewPane.innerHTML = '';
        }
      }
      ta.addEventListener('input', updatePreview);
      updatePreview();
    });
  }

  // =========================================
  // CREATE FORMS (new entities)
  // =========================================

  function renderProjectForm(c) {
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Create a Project</strong> &mdash; Projects group related tasks together. Give it a name, add tags to categorize, and write a description that will show on the project card.</div>' +
      '<div class="ll-form-group"><label>Project Name *</label><input class="ll-input" id="ll-f-name" placeholder="e.g. Analytics Engine"><div class="ll-field-help">This is the main title shown on the Projects page.</div></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. frontend, data"><div class="ll-field-help">Tags appear as colored chips for quick filtering.</div></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" placeholder="What is this project about?\n\n## Goals\n- Goal 1\n- Goal 2"></textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane" id="ll-p-desc"></div></div>' +
        '</div>' +
        '<div class="ll-field-help">Supports Markdown: **bold**, *italic*, `code`, lists, headings, and more.</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Project</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var name = c.querySelector('#ll-f-name').value.trim(); if (!name) { showToast('Project name is required.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim(), desc = c.querySelector('#ll-f-desc').value.trim();
      var title = 'Create Project: ' + name, body = '### Project Name\n\n' + name;
      if (tags) body += '\n\n### Tags\n\n' + tags; if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Create Project', title, body, 'Project');
    });
    attachLivePreview(c);
    c.querySelector('#ll-f-name').focus();
  }

  function renderTaskForm(c, data) {
    var opts = '<option value="">Select a project...</option>';
    if (data && data.projects) data.projects.forEach(function(p) { opts += '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</option>'; });
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Create a Task</strong> &mdash; Tasks are the work items that belong to a project. Set priority and due dates to see them highlighted on the Tasks page. Use Markdown in the description for checklists.</div>' +
      '<div class="ll-form-group"><label>Task Title *</label><input class="ll-input" id="ll-f-title" placeholder="e.g. Fix OAuth redirect bug"><div class="ll-field-help">Shown as the task card heading on the Tasks page.</div></div>' +
      '<div class="ll-form-group"><label>Project *</label><select class="ll-select" id="ll-f-project">' + opts + '</select><div class="ll-field-help">Tasks are grouped under projects on the Dashboard.</div></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Priority</label><select class="ll-select" id="ll-f-priority"><option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select><div class="ll-field-help">Displayed as a colored badge on the card.</div></div><div class="ll-form-group" style="flex:1"><label>Due Date</label><input type="date" class="ll-input" id="ll-f-due"><div class="ll-field-help">Overdue tasks show a red indicator.</div></div></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Blocked By</label><div class="ll-hint">Task ID that blocks this</div><input class="ll-input" id="ll-f-blocked" placeholder="e.g. task-2026-003"><div class="ll-field-help">Creates a dependency link in the graph.</div></div><div class="ll-form-group" style="flex:1"><label>Time Spent</label><input class="ll-input" id="ll-f-time" placeholder="e.g. 2h, 30m"><div class="ll-field-help">Tracked per-project on the Projects page.</div></div></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. bug, backend"></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" placeholder="## What needs to be done?\n\n- [ ] Step 1\n- [ ] Step 2"></textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane" id="ll-p-desc"></div></div>' +
        '</div>' +
        '<div class="ll-field-help">Use - [ ] for checklists, **bold** for emphasis, ` ` for code.</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Task</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskTitle = c.querySelector('#ll-f-title').value.trim(), project = c.querySelector('#ll-f-project').value;
      if (!taskTitle) { showToast('Task title is required.', 'error'); return; } if (!project) { showToast('Please select a project.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim(), desc = c.querySelector('#ll-f-desc').value.trim(), priority = c.querySelector('#ll-f-priority').value, due = c.querySelector('#ll-f-due').value;
      var blocked = c.querySelector('#ll-f-blocked').value.trim(), time = c.querySelector('#ll-f-time').value.trim();
      var title = 'Create Task: ' + taskTitle, body = '### Task Title\n\n' + taskTitle + '\n\n### Project\n\n' + project;
      if (priority) body += '\n\n### Priority\n\n' + priority; if (due) body += '\n\n### Due Date\n\n' + due;
      if (blocked) body += '\n\n### Blocked By\n\n' + blocked; if (time) body += '\n\n### Time Spent\n\n' + time;
      if (tags) body += '\n\n### Tags\n\n' + tags; if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Create Task', title, body, 'Task');
    });
    attachLivePreview(c);
    c.querySelector('#ll-f-title').focus();
  }

  function renderLogForm(c) {
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Add a Log Entry</strong> &mdash; Daily logs are shown chronologically on the Logs page. Use Markdown headings to structure your day, lists for accomplishments, and blockquotes for insights.</div>' +
      '<div class="ll-form-group"><label>Log Entry (Markdown) *</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-body" data-preview="ll-p-body" style="min-height:180px" placeholder="## Daily Log\n\n### What I did today\n- Worked on...\n- Fixed...\n\n### Blockers\n- None\n\n### Notes\n> Some insight"></textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane log-body" id="ll-p-body"></div></div>' +
        '</div>' +
        '<div class="ll-field-help">This content renders as the log card body on the Logs page.</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Log Entry</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var body = c.querySelector('#ll-f-body').value.trim(); if (!body) { showToast('Log body is required.', 'error'); return; }
      var summary = body.split('\n').find(function(l) { return l.trim(); }) || 'Log entry';
      summary = summary.replace(/^#+\s*/, '').substring(0, 60);
      submitForm(this, 'Add Log Entry', 'Add Log: ' + summary, '### Summary\n\n' + body, 'Log entry');
    });
    attachLivePreview(c);
    c.querySelector('#ll-f-body').focus();
  }

  function renderIdeaForm(c) {
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Capture an Idea</strong> &mdash; Ideas appear as cards in a grid on the Ideas page. Use Markdown to flesh out the concept. Add tags to categorize and filter later.</div>' +
      '<div class="ll-form-group"><label>Idea (Markdown) *</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-idea" data-preview="ll-p-idea" style="min-height:150px" placeholder="## My Idea\n\nDescribe your idea in detail...\n\n### Technical Approach\n- Step 1\n- Step 2"></textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane idea-body" id="ll-p-idea"></div></div>' +
        '</div>' +
        '<div class="ll-field-help">The first line becomes the card title. Rich Markdown renders on the idea card.</div>' +
      '</div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. product, automation"><div class="ll-field-help">Filterable tags displayed in the card footer.</div></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Idea</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var idea = c.querySelector('#ll-f-idea').value.trim(); if (!idea) { showToast('Idea text is required.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var shortTitle = idea.split('\n').find(function(l) { return l.trim(); }) || idea;
      shortTitle = shortTitle.replace(/^#+\s*/, '').substring(0, 60);
      var body = '### Idea\n\n' + idea; if (tags) body += '\n\n### Tags\n\n' + tags;
      submitForm(this, 'Add Idea', 'Add Idea: ' + shortTitle, body, 'Idea');
    });
    attachLivePreview(c);
    c.querySelector('#ll-f-idea').focus();
  }

  function renderGoalForm(c) {
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Set a Goal</strong> &mdash; Goals track your high-level objectives. Link tasks to see progress automatically. Set target dates to get countdown reminders on the Goals page.</div>' +
      '<div class="ll-form-group"><label>Goal Title *</label><input class="ll-input" id="ll-f-title" placeholder="e.g. Ship Auth Service by March"><div class="ll-field-help">Shown as the goal card heading.</div></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Target Date</label><input type="date" class="ll-input" id="ll-f-target"><div class="ll-field-help">Countdown shown on the goal card.</div></div></div>' +
      '<div class="ll-form-group"><label>Linked Tasks</label><div class="ll-hint">Comma-separated task IDs (e.g. task-2026-001, task-2026-002)</div><input class="ll-input" id="ll-f-tasks" placeholder="e.g. task-2026-001, task-2026-002"><div class="ll-field-help">Progress bar auto-updates as linked tasks are completed.</div></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. backend, Q1"></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" placeholder="## Objective\nWhat does this goal entail?\n\n## Key Results\n1. Result 1\n2. Result 2"></textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane goal-body" id="ll-p-desc" style="display:block"></div></div>' +
        '</div>' +
        '<div class="ll-field-help">Click the goal card to expand and see this description.</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Goal</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var title = c.querySelector('#ll-f-title').value.trim(); if (!title) { showToast('Goal title is required.', 'error'); return; }
      var target = c.querySelector('#ll-f-target').value, tasks = c.querySelector('#ll-f-tasks').value.trim(), tags = c.querySelector('#ll-f-tags').value.trim(), desc = c.querySelector('#ll-f-desc').value.trim();
      var issueTitle = 'Create Goal: ' + title, body = '### Goal Title\n\n' + title;
      if (target) body += '\n\n### Target Date\n\n' + target;
      if (tasks) body += '\n\n### Linked Tasks\n\n' + tasks;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Create Goal', issueTitle, body, 'Goal');
    });
    attachLivePreview(c);
    c.querySelector('#ll-f-title').focus();
  }

  function renderHabitForm(c) {
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Track a Habit</strong> &mdash; Habits show a 30-day check-in grid and streak counter on the Habits page. Use the "Check In Today" button on each habit card to log daily completion.</div>' +
      '<div class="ll-form-group"><label>Habit Name *</label><input class="ll-input" id="ll-f-name" placeholder="e.g. Daily standup notes"><div class="ll-field-help">Displayed as the habit card title.</div></div>' +
      '<div class="ll-form-group"><label>Frequency</label><select class="ll-select" id="ll-f-freq"><option value="daily">Daily</option><option value="weekly">Weekly</option></select><div class="ll-field-help">Daily habits track day-by-day streaks; weekly tracks per-week.</div></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. productivity, health"><div class="ll-field-help">Filter habits by tags on the Habits page.</div></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Habit</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var name = c.querySelector('#ll-f-name').value.trim(); if (!name) { showToast('Habit name is required.', 'error'); return; }
      var freq = c.querySelector('#ll-f-freq').value, tags = c.querySelector('#ll-f-tags').value.trim();
      var issueTitle = 'Create Habit: ' + name, body = '### Name\n\n' + name + '\n\n### Frequency\n\n' + freq;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      submitForm(this, 'Create Habit', issueTitle, body, 'Habit');
    });
    c.querySelector('#ll-f-name').focus();
  }

  function renderUpdateForm(c, data) {
    var opts = '<option value="">Select a task...</option>';
    if (data && data.tasks) data.tasks.forEach(function(t) { opts += '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.id + ': ' + (t.title || '') + ' [' + (t.status || 'todo') + ']') + '</option>'; });
    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Quick Update</strong> &mdash; Change a task\'s status, log time, or add a comment. Tip: You can also use the inline buttons on task cards for one-click status changes.</div>' +
      '<div class="ll-form-group"><label>Task *</label><select class="ll-select" id="ll-f-taskid">' + opts + '</select><div class="ll-field-help">Select the task you want to update.</div></div>' +
      '<div class="ll-form-group"><label>New Status *</label><select class="ll-select" id="ll-f-status"><option value="">Select status...</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Time Spent</label><input class="ll-input" id="ll-f-time" placeholder="e.g. 2h"><div class="ll-field-help">Adds to project time total.</div></div><div class="ll-form-group" style="flex:1"><label>Blocked By</label><input class="ll-input" id="ll-f-blocked" placeholder="e.g. task-2026-003"></div></div>' +
      '<div class="ll-form-group"><label>Comment</label><textarea class="ll-textarea" id="ll-f-comment" placeholder="Any notes about this update..."></textarea></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Update Task</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskId = c.querySelector('#ll-f-taskid').value, status = c.querySelector('#ll-f-status').value;
      if (!taskId) { showToast('Please select a task.', 'error'); return; } if (!status) { showToast('Please select a status.', 'error'); return; }
      var time = c.querySelector('#ll-f-time').value.trim(), blocked = c.querySelector('#ll-f-blocked').value.trim(), comment = c.querySelector('#ll-f-comment').value.trim();
      var body = '### Task ID\n\n' + taskId + '\n\n### New Status\n\n' + status;
      if (time) body += '\n\n### Time Spent\n\n' + time;
      if (blocked) body += '\n\n### Blocked By\n\n' + blocked;
      if (comment) body += '\n\n### Comment\n\n' + comment;
      submitForm(this, 'Update Task', 'Update Task: ' + taskId, body, 'Task update');
    });
  }

  // =========================================
  // EDIT FORMS (pre-filled for existing entities)
  // =========================================

  function showEditTaskModal(task) {
    var modal = createModal('Edit Task');
    var c = document.createElement('div');
    c.className = 'll-modal-body';
    modal.appendChild(c);

    var statusOptions = ['todo', 'in-progress', 'done'].map(function(s) {
      return '<option value="' + s + '"' + (task.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    var priorityOptions = ['', 'low', 'medium', 'high', 'critical'].map(function(p) {
      return '<option value="' + p + '"' + ((task.priority || '') === p ? ' selected' : '') + '>' + (p || 'None') + '</option>';
    }).join('');

    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Editing:</strong> ' + escapeHtml(task.title || task.id) + ' &mdash; Changes create a GitHub issue that updates the data on next deploy.</div>' +
      '<div class="ll-form-group"><label>Task: ' + escapeHtml(task.title || task.id) + '</label><div class="ll-hint">ID: ' + escapeHtml(task.id) + '</div></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Status *</label><select class="ll-select" id="ll-f-status">' + statusOptions + '</select><div class="ll-field-help">Changes the status badge on the card.</div></div><div class="ll-form-group" style="flex:1"><label>Priority</label><select class="ll-select" id="ll-f-priority">' + priorityOptions + '</select></div></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Due Date</label><input type="date" class="ll-input" id="ll-f-due" value="' + escapeHtml(task.due || '') + '"></div><div class="ll-form-group" style="flex:1"><label>Time Spent</label><input class="ll-input" id="ll-f-time" value="' + escapeHtml(task.time_spent || '') + '" placeholder="e.g. 4h"></div></div>' +
      '<div class="ll-form-group"><label>Blocked By</label><div class="ll-hint">Task ID that blocks this task</div><input class="ll-input" id="ll-f-blocked" value="' + escapeHtml(task.blocked_by || '') + '" placeholder="e.g. task-2026-003"></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" style="min-height:150px">' + escapeHtml(task.body || '') + '</textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane task-body" id="ll-p-desc" style="display:block"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Save Changes</button></div>';

    attachLivePreview(c);
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var status = c.querySelector('#ll-f-status').value;
      var priority = c.querySelector('#ll-f-priority').value;
      var due = c.querySelector('#ll-f-due').value;
      var time = c.querySelector('#ll-f-time').value.trim();
      var blocked = c.querySelector('#ll-f-blocked').value.trim();
      var desc = c.querySelector('#ll-f-desc').value.trim();

      var body = '### Task ID\n\n' + task.id + '\n\n### New Status\n\n' + status;
      if (priority) body += '\n\n### Priority\n\n' + priority;
      if (due) body += '\n\n### Due Date\n\n' + due;
      if (time) body += '\n\n### Time Spent\n\n' + time;
      if (blocked) body += '\n\n### Blocked By\n\n' + blocked;
      if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Save Changes', 'Update Task: ' + task.id, body, 'Task update');
    });
  }

  function showEditProjectModal(project) {
    var modal = createModal('Edit Project');
    var c = document.createElement('div');
    c.className = 'll-modal-body';
    modal.appendChild(c);

    var statusOptions = ['active', 'planning', 'done', 'archived'].map(function(s) {
      return '<option value="' + s + '"' + (project.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Editing:</strong> ' + escapeHtml(project.name || project.id) + '</div>' +
      '<div class="ll-form-group"><label>Project: ' + escapeHtml(project.name || project.id) + '</label></div>' +
      '<div class="ll-form-group"><label>Status</label><select class="ll-select" id="ll-f-status">' + statusOptions + '</select></div>' +
      '<div class="ll-form-group"><label>Tags</label><input class="ll-input" id="ll-f-tags" value="' + escapeHtml((project.tags || []).join(', ')) + '"></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" style="min-height:180px">' + escapeHtml(project.body || '') + '</textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane project-body-content" id="ll-p-desc"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Save Changes</button></div>';

    attachLivePreview(c);
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var status = c.querySelector('#ll-f-status').value;
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var desc = c.querySelector('#ll-f-desc').value.trim();
      var body = '### Project Name\n\n' + (project.name || project.id) + '\n\n### Status\n\n' + status;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Save Changes', 'Update Project: ' + (project.name || project.id), body, 'Project update');
    });
  }

  function showEditIdeaModal(idea) {
    var modal = createModal('Edit Idea');
    var c = document.createElement('div');
    c.className = 'll-modal-body';
    modal.appendChild(c);

    var statusOptions = ['raw', 'exploring', 'planning', 'archived'].map(function(s) {
      return '<option value="' + s + '"' + ((idea.status || 'raw') === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Edit Idea</strong> &mdash; Update the status as you refine this idea from raw to planning.</div>' +
      '<div class="ll-form-group"><label>Status</label><select class="ll-select" id="ll-f-status">' + statusOptions + '</select></div>' +
      '<div class="ll-form-group"><label>Tags</label><input class="ll-input" id="ll-f-tags" value="' + escapeHtml((idea.tags || []).join(', ')) + '"></div>' +
      '<div class="ll-form-group"><label>Idea Body (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-body" data-preview="ll-p-body" style="min-height:200px">' + escapeHtml(idea.body || '') + '</textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane idea-body" id="ll-p-body"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Save Changes</button></div>';

    attachLivePreview(c);
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var status = c.querySelector('#ll-f-status').value;
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var bodyText = c.querySelector('#ll-f-body').value.trim();
      var shortTitle = bodyText.split('\n').find(function(l) { return l.trim(); }) || 'idea';
      shortTitle = shortTitle.replace(/^#+\s*/, '').substring(0, 60);
      var issueBody = '### Idea\n\n' + bodyText + '\n\n### Status\n\n' + status;
      if (tags) issueBody += '\n\n### Tags\n\n' + tags;
      submitForm(this, 'Save Changes', 'Update Idea: ' + shortTitle, issueBody, 'Idea update');
    });
  }

  function showEditGoalModal(goal) {
    var modal = createModal('Edit Goal');
    var c = document.createElement('div');
    c.className = 'll-modal-body';
    modal.appendChild(c);

    var statusOptions = ['active', 'planning', 'completed', 'archived'].map(function(s) {
      return '<option value="' + s + '"' + ((goal.status || 'active') === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Editing:</strong> ' + escapeHtml(goal.title || goal.id) + '</div>' +
      '<div class="ll-form-group"><label>Goal: ' + escapeHtml(goal.title || goal.id) + '</label></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Status</label><select class="ll-select" id="ll-f-status">' + statusOptions + '</select></div><div class="ll-form-group" style="flex:1"><label>Target Date</label><input type="date" class="ll-input" id="ll-f-target" value="' + escapeHtml(goal.target_date || '') + '"></div></div>' +
      '<div class="ll-form-group"><label>Linked Tasks</label><input class="ll-input" id="ll-f-tasks" value="' + escapeHtml((goal.linked_tasks || []).join(', ')) + '"><div class="ll-field-help">Progress bar auto-calculates from linked task completion.</div></div>' +
      '<div class="ll-form-group"><label>Tags</label><input class="ll-input" id="ll-f-tags" value="' + escapeHtml((goal.tags || []).join(', ')) + '"></div>' +
      '<div class="ll-form-group"><label>Description (Markdown)</label>' +
        '<div class="ll-preview-container">' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Write</div><textarea class="ll-textarea" id="ll-f-desc" data-preview="ll-p-desc" style="min-height:150px">' + escapeHtml(goal.body || '') + '</textarea></div>' +
          '<div style="flex:1;display:flex;flex-direction:column"><div class="ll-preview-label">Preview</div><div class="ll-preview-pane goal-body" id="ll-p-desc" style="display:block"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Save Changes</button></div>';

    attachLivePreview(c);
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var status = c.querySelector('#ll-f-status').value;
      var target = c.querySelector('#ll-f-target').value;
      var tasks = c.querySelector('#ll-f-tasks').value.trim();
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var desc = c.querySelector('#ll-f-desc').value.trim();
      var body = '### Goal Title\n\n' + (goal.title || goal.id) + '\n\n### Status\n\n' + status;
      if (target) body += '\n\n### Target Date\n\n' + target;
      if (tasks) body += '\n\n### Linked Tasks\n\n' + tasks;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Save Changes', 'Update Goal: ' + (goal.title || goal.id), body, 'Goal update');
    });
  }

  function showEditHabitModal(habit) {
    var modal = createModal('Edit Habit');
    var c = document.createElement('div');
    c.className = 'll-modal-body';
    modal.appendChild(c);

    var freqOptions = ['daily', 'weekly'].map(function(f) {
      return '<option value="' + f + '"' + ((habit.frequency || 'daily') === f ? ' selected' : '') + '>' + f + '</option>';
    }).join('');
    var statusOptions = ['active', 'paused', 'archived'].map(function(s) {
      return '<option value="' + s + '"' + ((habit.status || 'active') === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');

    c.innerHTML =
      '<div class="ll-guide-banner"><strong>Editing:</strong> ' + escapeHtml(habit.name || habit.id) + ' &mdash; Set to "paused" to temporarily stop tracking streaks.</div>' +
      '<div class="ll-form-group"><label>Habit: ' + escapeHtml(habit.name || habit.id) + '</label></div>' +
      '<div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Frequency</label><select class="ll-select" id="ll-f-freq">' + freqOptions + '</select><div class="ll-field-help">Affects how streaks are calculated.</div></div><div class="ll-form-group" style="flex:1"><label>Status</label><select class="ll-select" id="ll-f-status">' + statusOptions + '</select></div></div>' +
      '<div class="ll-form-group"><label>Tags</label><input class="ll-input" id="ll-f-tags" value="' + escapeHtml((habit.tags || []).join(', ')) + '"></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Save Changes</button></div>';

    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var freq = c.querySelector('#ll-f-freq').value;
      var status = c.querySelector('#ll-f-status').value;
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var body = '### Name\n\n' + (habit.name || habit.id) + '\n\n### Frequency\n\n' + freq + '\n\n### Status\n\n' + status;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      submitForm(this, 'Save Changes', 'Update Habit: ' + (habit.name || habit.id), body, 'Habit update');
    });
  }

  // =========================================
  // INLINE CARD ACTION HTML BUILDERS
  // These return HTML strings to inject into cards
  // =========================================

  function taskActionsHTML(taskId) {
    return '<div class="ll-card-actions">' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llEditTask(\'' + taskId + '\')">&#9998; Edit</button>' +
      '<button class="ll-card-btn btn-done" onclick="event.stopPropagation();window.llQuickStatus(\'' + taskId + '\',\'done\',this)">&#10003; Done</button>' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llQuickStatus(\'' + taskId + '\',\'in-progress\',this)">&#9654; In Progress</button>' +
      '</div>';
  }

  function projectActionsHTML(projectId) {
    return '<div class="ll-card-actions">' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llEditProject(\'' + projectId + '\')">&#9998; Edit</button>' +
      '</div>';
  }

  function ideaActionsHTML(ideaId) {
    return '<div class="ll-card-actions">' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llEditIdea(\'' + ideaId + '\')">&#9998; Edit</button>' +
      '</div>';
  }

  function goalActionsHTML(goalId) {
    return '<div class="ll-card-actions">' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llEditGoal(\'' + goalId + '\')">&#9998; Edit</button>' +
      '</div>';
  }

  function habitActionsHTML(habitId, habitName) {
    return '<div class="ll-card-actions">' +
      '<button class="ll-card-btn btn-check" onclick="event.stopPropagation();window.llCheckHabit(\'' + escapeHtml(habitId) + '\',\'' + escapeHtml(habitName) + '\',this)">&#10003; Check In Today</button>' +
      '<button class="ll-card-btn" onclick="event.stopPropagation();window.llEditHabit(\'' + escapeHtml(habitId) + '\')">&#9998; Edit</button>' +
      '</div>';
  }

  // =========================================
  // GLOBAL FUNCTIONS (called from inline HTML)
  // =========================================

  window.llEditTask = async function(taskId) {
    var data = await loadSiteData();
    if (!data) return;
    var task = (data.tasks || []).find(function(t) { return t.id === taskId; });
    if (task) showEditTaskModal(task);
  };

  window.llEditProject = async function(projectId) {
    var data = await loadSiteData();
    if (!data) return;
    var project = (data.projects || []).find(function(p) { return p.id === projectId; });
    if (project) showEditProjectModal(project);
  };

  window.llEditIdea = async function(ideaId) {
    var data = await loadSiteData();
    if (!data) return;
    var idea = (data.ideas || []).find(function(i) { return i.id === ideaId; });
    if (idea) showEditIdeaModal(idea);
  };

  window.llEditGoal = async function(goalId) {
    var data = await loadSiteData();
    if (!data) return;
    var goal = (data.goals || []).find(function(g) { return g.id === goalId; });
    if (goal) showEditGoalModal(goal);
  };

  window.llEditHabit = async function(habitId) {
    var data = await loadSiteData();
    if (!data) return;
    var habit = (data.habits || []).find(function(h) { return h.id === habitId; });
    if (habit) showEditHabitModal(habit);
  };

  window.llQuickStatus = function(taskId, newStatus, btnEl) {
    quickAction(btnEl,
      'Update Task: ' + taskId,
      '### Task ID\n\n' + taskId + '\n\n### New Status\n\n' + newStatus,
      'Task \u2192 ' + newStatus
    );
  };

  window.llCheckHabit = function(habitId, habitName, btnEl) {
    var today = LL.toLocalDateStr(new Date());
    quickAction(btnEl,
      'Check Habit: ' + (habitName || habitId),
      '### Habit ID\n\n' + habitId + '\n\n### Check Date\n\n' + today,
      'Habit checked in'
    );
  };

  // Auto-complete a goal when all linked tasks are done
  window.llQuickGoalComplete = function(goal) {
    var body = '### Goal Title\n\n' + (goal.title || goal.id) + '\n\n### Status\n\n' + 'completed';
    if (goal.target_date) body += '\n\n### Target Date\n\n' + goal.target_date;
    if (goal.linked_tasks && goal.linked_tasks.length) body += '\n\n### Linked Tasks\n\n' + goal.linked_tasks.join(', ');
    if (goal.tags && goal.tags.length) body += '\n\n### Tags\n\n' + goal.tags.join(', ');
    if (goal.body) body += '\n\n### Description\n\n' + goal.body;

    var info = getRepoInfo();
    if (!info.token) return; // Can't auto-complete without token

    createGitHubIssue('Update Goal: ' + (goal.title || goal.id), body)
      .then(function(issue) {
        invalidateCache();
        showToast('Goal "' + (goal.title || goal.id) + '" auto-completed! All linked tasks are done. <a href="' + issue.html_url + '" target="_blank">#' + issue.number + '</a>', 'success');
      })
      .catch(function() {
        // Silently fail — user can manually complete
      });
  };

  // Expose action HTML builders so pages can use them
  window.llTaskActions = taskActionsHTML;
  window.llProjectActions = projectActionsHTML;
  window.llIdeaActions = ideaActionsHTML;
  window.llGoalActions = goalActionsHTML;
  window.llHabitActions = habitActionsHTML;

  // =========================================
  // SCROLL-TRIGGERED ANIMATIONS
  // =========================================

  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('ll-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    // Observe all animatable elements
    var selectors = '.task-card,.project-card,.idea-card,.goal-card,.habit-card,.log-entry,.dep-graph-row,.stat-card,.chart-container,.section,.streak-card';
    document.querySelectorAll(selectors).forEach(function(el) {
      el.classList.add('ll-scroll-animate');
      observer.observe(el);
    });
  }

  // Re-observe after dynamic content loads
  window.llInitScrollAnimations = initScrollAnimations;

  // =========================================
  // RELATIVE TIMESTAMPS (auto-updating)
  // =========================================

  function getRelativeTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    var now = new Date();
    var diff = now - d;
    var secs = Math.floor(diff / 1000);
    var mins = Math.floor(secs / 60);
    var hours = Math.floor(mins / 60);
    var days = Math.floor(hours / 24);

    if (secs < 60) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days === 1) return 'yesterday';
    if (days < 7) return days + 'd ago';
    if (days < 30) return Math.floor(days / 7) + 'w ago';
    if (days < 365) return Math.floor(days / 30) + 'mo ago';
    return Math.floor(days / 365) + 'y ago';
  }

  function updateRelativeTimestamps() {
    document.querySelectorAll('[data-relative-time]').forEach(function(el) {
      el.textContent = getRelativeTime(el.getAttribute('data-relative-time'));
    });
  }

  // Update every 60 seconds
  setInterval(updateRelativeTimestamps, 60000);

  // Expose for use in pages
  window.llRelativeTime = getRelativeTime;

  // =========================================
  // ADD MODAL (tabbed create form)
  // =========================================

  async function showAddModal(defaultTab) {
    var data = await loadSiteData();
    var tabs = [{ id: 'project', label: 'Project' }, { id: 'task', label: 'Task' }, { id: 'log', label: 'Log' }, { id: 'idea', label: 'Idea' }, { id: 'goal', label: 'Goal' }, { id: 'habit', label: 'Habit' }, { id: 'update', label: 'Update Task' }];
    defaultTab = defaultTab || 'project';
    var modal = createModal('Add New');
    var tabBar = document.createElement('div'); tabBar.className = 'll-tabs';
    tabs.forEach(function(t) { var btn = document.createElement('button'); btn.className = 'll-tab' + (t.id === defaultTab ? ' active' : ''); btn.dataset.tab = t.id; btn.textContent = t.label; tabBar.appendChild(btn); });
    modal.appendChild(tabBar);
    var contentDiv = document.createElement('div'); contentDiv.className = 'll-modal-body'; modal.appendChild(contentDiv);
    function renderTab(tabId) {
      tabBar.querySelectorAll('.ll-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tabId); });
      switch (tabId) { case 'project': renderProjectForm(contentDiv); break; case 'task': renderTaskForm(contentDiv, data); break; case 'log': renderLogForm(contentDiv); break; case 'idea': renderIdeaForm(contentDiv); break; case 'goal': renderGoalForm(contentDiv); break; case 'habit': renderHabitForm(contentDiv); break; case 'update': renderUpdateForm(contentDiv, data); break; }
    }
    tabBar.querySelectorAll('.ll-tab').forEach(function(tab) { tab.addEventListener('click', function() { renderTab(this.dataset.tab); }); });
    renderTab(defaultTab);
  }

  function injectNavButtons() {
    var nav = document.querySelector('nav'); if (!nav) return;
    var actions = document.createElement('div'); actions.className = 'll-nav-actions';

    var themeBtn = document.createElement('button'); themeBtn.className = 'theme-toggle';
    var ct = (typeof LL !== 'undefined' && LL.getTheme) ? LL.getTheme() : 'dark';
    themeBtn.textContent = ct === 'dark' ? '\u2600' : '\u263E';
    themeBtn.title = 'Toggle theme (t)';
    themeBtn.addEventListener('click', function() { var nt = LL.toggleTheme(); themeBtn.textContent = nt === 'dark' ? '\u2600' : '\u263E'; });

    var searchBtn = document.createElement('button'); searchBtn.className = 'll-nav-btn'; searchBtn.innerHTML = '&#128269;'; searchBtn.title = 'Global search (Ctrl+K)';
    searchBtn.addEventListener('click', async function() { var data = await loadSiteData(); if (data && LL.openGlobalSearch) LL.openGlobalSearch(data); });

    var addBtn = document.createElement('button'); addBtn.className = 'll-nav-btn ll-nav-btn-primary'; addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', function() {
      var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      var tab = 'project'; if (page.indexOf('task') !== -1) tab = 'task'; else if (page.indexOf('log') !== -1) tab = 'log'; else if (page.indexOf('idea') !== -1) tab = 'idea'; else if (page.indexOf('goal') !== -1) tab = 'goal'; else if (page.indexOf('habit') !== -1) tab = 'habit';
      showAddModal(tab);
    });

    var settingsBtn = document.createElement('button'); settingsBtn.className = 'll-nav-btn'; settingsBtn.innerHTML = '&#9881;'; settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', showSettingsModal);

    actions.appendChild(themeBtn); actions.appendChild(searchBtn); actions.appendChild(addBtn); actions.appendChild(settingsBtn);
    nav.appendChild(actions);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { if (typeof LL !== 'undefined' && LL.closeGlobalSearch) LL.closeGlobalSearch(); closeModal(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); loadSiteData().then(function(data) { if (data && LL.openGlobalSearch) LL.openGlobalSearch(data); }); }
  });

  window.llShowAddModal = showAddModal;
  window.llShowSettings = showSettingsModal;

  function registerServiceWorker() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function() {}); }

  function injectScrollAnimationStyles() {
    var s = document.createElement('style');
    s.id = 'll-scroll-styles';
    s.textContent = [
      '.ll-scroll-animate{opacity:0;transform:translateY(20px);transition:opacity 0.5s cubic-bezier(0.4,0,0.2,1),transform 0.5s cubic-bezier(0.4,0,0.2,1)}',
      '.ll-scroll-animate.ll-visible{opacity:1;transform:translateY(0)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function init() {
    injectStyles();
    injectScrollAnimationStyles();
    injectNavButtons();
    registerServiceWorker();
    // Delay scroll animation init so page content loads first
    setTimeout(initScrollAnimations, 500);
    // Initial relative timestamp update
    setTimeout(updateRelativeTimestamps, 100);
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
