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
      var res = await fetch('data/index.json');
      cachedData = await res.json();
      return cachedData;
    } catch(e) { return null; }
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
      '.ll-modal{background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:16px;width:90%;max-width:560px;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-xl);animation:ll-modalin 0.25s cubic-bezier(0.4,0,0.2,1)}',
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
      '.ll-input,.ll-textarea,.ll-select{width:100%;background:var(--bg-input);color:var(--text-secondary);border:1px solid var(--border-primary);border-radius:10px;padding:0.6rem 0.85rem;font-size:0.9rem;font-family:inherit;transition:all 0.2s cubic-bezier(0.4,0,0.2,1)}',
      '.ll-input:focus,.ll-textarea:focus,.ll-select:focus{border-color:var(--accent-blue);outline:none;box-shadow:0 0 0 3px var(--accent-blue-dim)}',
      '.ll-textarea{min-height:80px;resize:vertical}',
      '.ll-select{cursor:pointer}',
      '.ll-btn{padding:0.55rem 1.1rem;border-radius:10px;font-size:0.9rem;font-weight:500;cursor:pointer;border:none;transition:all 0.2s cubic-bezier(0.4,0,0.2,1);font-family:inherit}',
      '.ll-btn:active{transform:scale(0.97)}',
      '.ll-btn-submit{background:var(--accent-green);color:#fff;box-shadow:0 2px 8px rgba(34,197,94,0.2)}',
      '.ll-btn-submit:hover{background:var(--accent-green-hover);box-shadow:0 4px 16px rgba(34,197,94,0.3)}',
      '.ll-btn-submit:disabled{opacity:0.5;cursor:not-allowed;box-shadow:none}',
      '.ll-btn-cancel{background:var(--bg-tertiary);color:var(--text-secondary);box-shadow:var(--shadow-sm)}',
      '.ll-btn-cancel:hover{background:var(--border-primary);color:var(--text-primary)}',
      '.ll-form-actions{display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--border-secondary)}',
      '.ll-toast{position:fixed;bottom:1.5rem;right:1.5rem;padding:0.85rem 1.25rem;border-radius:12px;font-size:0.9rem;z-index:2000;max-width:420px;animation:ll-fadein 0.3s cubic-bezier(0.4,0,0.2,1);border:none}',
      '.ll-toast-success{background:var(--accent-green);color:#fff;box-shadow:0 8px 24px rgba(34,197,94,0.3)}',
      '.ll-toast-error{background:var(--accent-red);color:#fff;box-shadow:0 8px 24px rgba(239,68,68,0.3)}',
      '.ll-toast-info{background:var(--accent-blue-bg);color:#fff;box-shadow:0 8px 24px rgba(59,130,246,0.3)}',
      '.ll-toast a{color:#fff;text-decoration:underline}',
      '@keyframes ll-fadein{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '.ll-token-toggle{background:var(--bg-tertiary);border:none;color:var(--text-muted);border-radius:6px;padding:0.2rem 0.5rem;cursor:pointer;font-size:0.75rem;margin-left:0.5rem;transition:all 0.15s}',
      '.ll-token-toggle:hover{color:var(--text-secondary);background:var(--border-primary)}',
      '@media(max-width:768px){.ll-nav-actions{margin-left:0;margin-top:0.5rem}.ll-modal{width:95%;max-height:90vh;border-radius:12px}.ll-tabs{padding:0 0.75rem}.ll-tab{padding:0.5rem 0.6rem;font-size:0.8rem}}'
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
      closeModal(); cachedData = null;
      showToast(entityName + ' submitted! <a href="' + issue.html_url + '" target="_blank">Issue #' + issue.number + '</a> &mdash; site updates in ~2 min.', 'success');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); btn.disabled = false; btn.textContent = originalText; }
  }

  function renderProjectForm(c) {
    c.innerHTML = '<div class="ll-form-group"><label>Project Name *</label><input class="ll-input" id="ll-f-name" placeholder="e.g. Analytics Engine"></div><div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. frontend, data"></div><div class="ll-form-group"><label>Description</label><textarea class="ll-textarea" id="ll-f-desc" placeholder="What is this project about?"></textarea></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Project</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var name = c.querySelector('#ll-f-name').value.trim(); if (!name) { showToast('Project name is required.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim(), desc = c.querySelector('#ll-f-desc').value.trim();
      var title = 'Create Project: ' + name, body = '### Project Name\n\n' + name;
      if (tags) body += '\n\n### Tags\n\n' + tags; if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Create Project', title, body, 'Project');
    });
    c.querySelector('#ll-f-name').focus();
  }

  function renderTaskForm(c, data) {
    var opts = '<option value="">Select a project...</option>';
    if (data && data.projects) data.projects.forEach(function(p) { opts += '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</option>'; });
    c.innerHTML = '<div class="ll-form-group"><label>Task Title *</label><input class="ll-input" id="ll-f-title" placeholder="e.g. Fix OAuth redirect bug"></div><div class="ll-form-group"><label>Project *</label><select class="ll-select" id="ll-f-project">' + opts + '</select></div><div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Priority</label><select class="ll-select" id="ll-f-priority"><option value="">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div class="ll-form-group" style="flex:1"><label>Due Date</label><input type="date" class="ll-input" id="ll-f-due"></div></div><div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. bug, backend"></div><div class="ll-form-group"><label>Description</label><textarea class="ll-textarea" id="ll-f-desc" placeholder="What needs to be done?"></textarea></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Task</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskTitle = c.querySelector('#ll-f-title').value.trim(), project = c.querySelector('#ll-f-project').value;
      if (!taskTitle) { showToast('Task title is required.', 'error'); return; } if (!project) { showToast('Please select a project.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim(), desc = c.querySelector('#ll-f-desc').value.trim(), priority = c.querySelector('#ll-f-priority').value, due = c.querySelector('#ll-f-due').value;
      var title = 'Create Task: ' + taskTitle, body = '### Task Title\n\n' + taskTitle + '\n\n### Project\n\n' + project;
      if (priority) body += '\n\n### Priority\n\n' + priority; if (due) body += '\n\n### Due Date\n\n' + due;
      if (tags) body += '\n\n### Tags\n\n' + tags; if (desc) body += '\n\n### Description\n\n' + desc;
      submitForm(this, 'Create Task', title, body, 'Task');
    });
    c.querySelector('#ll-f-title').focus();
  }

  function renderLogForm(c) {
    c.innerHTML = '<div class="ll-form-group"><label>Summary *</label><input class="ll-input" id="ll-f-summary" placeholder="e.g. Worked on auth fixes and dashboard UI"></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Log Entry</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var summary = c.querySelector('#ll-f-summary').value.trim(); if (!summary) { showToast('Summary is required.', 'error'); return; }
      submitForm(this, 'Add Log Entry', 'Add Log: ' + summary, '### Summary\n\n' + summary, 'Log entry');
    });
    c.querySelector('#ll-f-summary').focus();
  }

  function renderIdeaForm(c) {
    c.innerHTML = '<div class="ll-form-group"><label>Idea *</label><textarea class="ll-textarea" id="ll-f-idea" placeholder="Describe your idea..."></textarea></div><div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. product, automation"></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Idea</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var idea = c.querySelector('#ll-f-idea').value.trim(); if (!idea) { showToast('Idea text is required.', 'error'); return; }
      var tags = c.querySelector('#ll-f-tags').value.trim();
      var shortTitle = idea.length > 60 ? idea.substring(0, 60) + '...' : idea;
      var body = '### Idea\n\n' + idea; if (tags) body += '\n\n### Tags\n\n' + tags;
      submitForm(this, 'Add Idea', 'Add Idea: ' + shortTitle, body, 'Idea');
    });
    c.querySelector('#ll-f-idea').focus();
  }

  function renderGoalForm(c) {
    c.innerHTML = '<div class="ll-form-group"><label>Goal Title *</label><input class="ll-input" id="ll-f-title" placeholder="e.g. Ship Auth Service by March"></div><div style="display:flex;gap:0.75rem"><div class="ll-form-group" style="flex:1"><label>Target Date</label><input type="date" class="ll-input" id="ll-f-target"></div></div><div class="ll-form-group"><label>Linked Tasks</label><div class="ll-hint">Comma-separated task IDs (e.g. task-2026-001, task-2026-002)</div><input class="ll-input" id="ll-f-tasks" placeholder="e.g. task-2026-001, task-2026-002"></div><div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. backend, Q1"></div><div class="ll-form-group"><label>Description</label><textarea class="ll-textarea" id="ll-f-desc" placeholder="What does this goal entail?"></textarea></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Goal</button></div>';
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
    c.querySelector('#ll-f-title').focus();
  }

  function renderHabitForm(c) {
    c.innerHTML = '<div class="ll-form-group"><label>Habit Name *</label><input class="ll-input" id="ll-f-name" placeholder="e.g. Daily standup notes"></div><div class="ll-form-group"><label>Frequency</label><select class="ll-select" id="ll-f-freq"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div><div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. productivity, health"></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Habit</button></div>';
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
    c.innerHTML = '<div class="ll-form-group"><label>Task *</label><select class="ll-select" id="ll-f-taskid">' + opts + '</select></div><div class="ll-form-group"><label>New Status *</label><select class="ll-select" id="ll-f-status"><option value="">Select status...</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div><div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Update Task</button></div>';
    c.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    c.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskId = c.querySelector('#ll-f-taskid').value, status = c.querySelector('#ll-f-status').value;
      if (!taskId) { showToast('Please select a task.', 'error'); return; } if (!status) { showToast('Please select a status.', 'error'); return; }
      submitForm(this, 'Update Task', 'Update Task: ' + taskId, '### Task ID\n\n' + taskId + '\n\n### New Status\n\n' + status, 'Task update');
    });
  }

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

  function init() { injectStyles(); injectNavButtons(); registerServiceWorker(); }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
