(function() {
  'use strict';

  var STORAGE_KEY = 'lifelong_config';
  var cachedData = null;

  // --- Config ---
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

  // --- Data ---
  async function loadSiteData() {
    if (cachedData) return cachedData;
    try {
      var res = await fetch('data/index.json');
      cachedData = await res.json();
      return cachedData;
    } catch(e) { return null; }
  }

  // --- GitHub API ---
  async function createGitHubIssue(title, body) {
    var info = getRepoInfo();
    if (!info.token) {
      showToast('Set your GitHub token in Settings first.', 'error');
      showSettingsModal();
      throw new Error('No token configured');
    }
    if (!info.owner || !info.repo) {
      showToast('Set repository owner/name in Settings first.', 'error');
      showSettingsModal();
      throw new Error('No repo configured');
    }

    var res = await fetch('https://api.github.com/repos/' + info.owner + '/' + info.repo + '/issues', {
      method: 'POST',
      headers: {
        'Authorization': 'token ' + info.token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
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

  // --- Inject CSS ---
  function injectStyles() {
    if (document.getElementById('ll-app-styles')) return;
    var style = document.createElement('style');
    style.id = 'll-app-styles';
    style.textContent = [
      '.ll-nav-actions{display:flex;gap:0.5rem;margin-left:auto}',
      '.ll-nav-btn{background:#21262d;color:#c9d1d9;border:1px solid #30363d;padding:0.3rem 0.7rem;border-radius:6px;cursor:pointer;font-size:0.85rem;transition:all 0.15s;display:inline-flex;align-items:center;gap:0.3rem;font-family:inherit}',
      '.ll-nav-btn:hover{border-color:#58a6ff;color:#f0f6fc;background:#1f6feb20}',
      '.ll-nav-btn-primary{background:#238636;border-color:#238636;color:#fff}',
      '.ll-nav-btn-primary:hover{background:#2ea043;border-color:#2ea043}',

      '.ll-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)}',
      '.ll-modal{background:#161b22;border:1px solid #30363d;border-radius:12px;width:90%;max-width:560px;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.4)}',
      '.ll-modal-header{padding:1rem 1.25rem;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center}',
      '.ll-modal-header h2{color:#f0f6fc;font-size:1.1rem;margin:0}',
      '.ll-modal-close{background:none;border:none;color:#8b949e;font-size:1.5rem;cursor:pointer;padding:0.25rem;line-height:1}',
      '.ll-modal-close:hover{color:#f0f6fc}',
      '.ll-modal-body{padding:1.25rem}',

      '.ll-tabs{display:flex;gap:0;border-bottom:1px solid #30363d;padding:0 1.25rem;overflow-x:auto}',
      '.ll-tab{padding:0.6rem 0.85rem;color:#8b949e;cursor:pointer;font-size:0.85rem;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:inherit}',
      '.ll-tab:hover{color:#c9d1d9}',
      '.ll-tab.active{color:#f0f6fc;border-bottom-color:#f78166}',

      '.ll-form-group{margin-bottom:1rem}',
      '.ll-form-group label{display:block;font-size:0.85rem;color:#c9d1d9;margin-bottom:0.35rem;font-weight:500}',
      '.ll-hint{font-size:0.75rem;color:#8b949e;margin-bottom:0.35rem}',
      '.ll-input,.ll-textarea,.ll-select{width:100%;background:#0d1117;color:#c9d1d9;border:1px solid #30363d;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.9rem;font-family:inherit;transition:border-color 0.15s}',
      '.ll-input:focus,.ll-textarea:focus,.ll-select:focus{border-color:#58a6ff;outline:none;box-shadow:0 0 0 3px #1f6feb30}',
      '.ll-textarea{min-height:80px;resize:vertical}',
      '.ll-select{cursor:pointer}',

      '.ll-btn{padding:0.5rem 1rem;border-radius:6px;font-size:0.9rem;cursor:pointer;border:1px solid transparent;transition:all 0.15s;font-family:inherit}',
      '.ll-btn-submit{background:#238636;color:#fff;border-color:#238636}',
      '.ll-btn-submit:hover{background:#2ea043}',
      '.ll-btn-submit:disabled{opacity:0.5;cursor:not-allowed}',
      '.ll-btn-cancel{background:#21262d;color:#c9d1d9;border-color:#30363d}',
      '.ll-btn-cancel:hover{border-color:#8b949e}',
      '.ll-form-actions{display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.25rem;padding-top:1rem;border-top:1px solid #21262d}',

      '.ll-toast{position:fixed;bottom:1.5rem;right:1.5rem;padding:0.75rem 1.25rem;border-radius:8px;font-size:0.9rem;z-index:2000;max-width:420px;animation:ll-fadein 0.3s ease;box-shadow:0 4px 12px rgba(0,0,0,0.3)}',
      '.ll-toast-success{background:#238636;color:#fff;border:1px solid #2ea043}',
      '.ll-toast-error{background:#da3633;color:#fff;border:1px solid #f85149}',
      '.ll-toast-info{background:#1f6feb;color:#fff;border:1px solid #388bfd}',
      '.ll-toast a{color:#fff;text-decoration:underline}',
      '@keyframes ll-fadein{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}',

      '.ll-token-toggle{background:none;border:1px solid #30363d;color:#8b949e;border-radius:4px;padding:0.15rem 0.4rem;cursor:pointer;font-size:0.75rem;margin-left:0.5rem}',
      '.ll-token-toggle:hover{color:#c9d1d9;border-color:#8b949e}',

      '@media(max-width:768px){.ll-nav-actions{margin-left:0;margin-top:0.5rem}.ll-modal{width:95%;max-height:90vh}.ll-tabs{padding:0 0.75rem}.ll-tab{padding:0.5rem 0.6rem;font-size:0.8rem}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // --- Toast ---
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

  // --- Modal ---
  function closeModal() {
    var overlay = document.querySelector('.ll-overlay');
    if (overlay) overlay.remove();
  }

  function createModal(title) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.className = 'll-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

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

  // --- Settings Modal ---
  function showSettingsModal() {
    var cfg = getConfig();
    var info = getRepoInfo();
    var modal = createModal('Settings');

    var body = document.createElement('div');
    body.className = 'll-modal-body';
    body.innerHTML =
      '<div class="ll-form-group">' +
        '<label>GitHub Personal Access Token</label>' +
        '<div class="ll-hint">Create at GitHub &rarr; Settings &rarr; Developer settings &rarr; Personal access tokens. Needs "repo" scope (or fine-grained with Issues read/write).</div>' +
        '<div style="display:flex;align-items:center"><input type="password" class="ll-input" id="ll-cfg-token" value="' + escapeHtml(cfg.token || '') + '" placeholder="ghp_xxxxxxxxxxxx" style="flex:1"><button class="ll-token-toggle" id="ll-toggle-vis">show</button></div>' +
      '</div>' +
      '<div class="ll-form-group">' +
        '<label>Repository Owner</label>' +
        '<input class="ll-input" id="ll-cfg-owner" value="' + escapeHtml(info.owner) + '" placeholder="e.g. shashanksaxena-tz">' +
      '</div>' +
      '<div class="ll-form-group">' +
        '<label>Repository Name</label>' +
        '<input class="ll-input" id="ll-cfg-repo" value="' + escapeHtml(info.repo) + '" placeholder="e.g. life-long">' +
      '</div>' +
      '<div class="ll-form-actions">' +
        '<button class="ll-btn ll-btn-cancel" id="ll-cfg-cancel">Cancel</button>' +
        '<button class="ll-btn ll-btn-submit" id="ll-cfg-save">Save</button>' +
      '</div>';

    modal.appendChild(body);

    body.querySelector('#ll-toggle-vis').addEventListener('click', function() {
      var inp = body.querySelector('#ll-cfg-token');
      if (inp.type === 'password') { inp.type = 'text'; this.textContent = 'hide'; }
      else { inp.type = 'password'; this.textContent = 'show'; }
    });
    body.querySelector('#ll-cfg-cancel').addEventListener('click', closeModal);
    body.querySelector('#ll-cfg-save').addEventListener('click', function() {
      saveConfig({
        token: body.querySelector('#ll-cfg-token').value.trim(),
        owner: body.querySelector('#ll-cfg-owner').value.trim(),
        repo: body.querySelector('#ll-cfg-repo').value.trim()
      });
      closeModal();
      showToast('Settings saved.', 'success');
    });
  }

  // --- Submit helper ---
  async function submitForm(btn, originalText, title, bodyText, entityName) {
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    try {
      var issue = await createGitHubIssue(title, bodyText);
      closeModal();
      cachedData = null;
      showToast(entityName + ' submitted! <a href="' + issue.html_url + '" target="_blank">Issue #' + issue.number + '</a> &mdash; site updates in ~2 min.', 'success');
    } catch(e) {
      showToast('Failed: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // --- Form: Project ---
  function renderProjectForm(container) {
    container.innerHTML =
      '<div class="ll-form-group"><label>Project Name *</label><input class="ll-input" id="ll-f-name" placeholder="e.g. Analytics Engine"></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. frontend, data"></div>' +
      '<div class="ll-form-group"><label>Description</label><textarea class="ll-textarea" id="ll-f-desc" placeholder="What is this project about?"></textarea></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Project</button></div>';

    container.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    container.querySelector('#ll-f-submit').addEventListener('click', function() {
      var name = container.querySelector('#ll-f-name').value.trim();
      if (!name) { showToast('Project name is required.', 'error'); return; }
      var tags = container.querySelector('#ll-f-tags').value.trim();
      var desc = container.querySelector('#ll-f-desc').value.trim();

      var title = 'Create Project: ' + name;
      var body = '### Project Name\n\n' + name;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      if (desc) body += '\n\n### Description\n\n' + desc;

      submitForm(this, 'Create Project', title, body, 'Project');
    });

    container.querySelector('#ll-f-name').focus();
  }

  // --- Form: Task ---
  function renderTaskForm(container, data) {
    var opts = '<option value="">Select a project...</option>';
    if (data && data.projects) {
      data.projects.forEach(function(p) {
        opts += '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.name || p.id) + '</option>';
      });
    }

    container.innerHTML =
      '<div class="ll-form-group"><label>Task Title *</label><input class="ll-input" id="ll-f-title" placeholder="e.g. Fix OAuth redirect bug"></div>' +
      '<div class="ll-form-group"><label>Project *</label><select class="ll-select" id="ll-f-project">' + opts + '</select></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. bug, backend"></div>' +
      '<div class="ll-form-group"><label>Description</label><textarea class="ll-textarea" id="ll-f-desc" placeholder="What needs to be done?"></textarea></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Create Task</button></div>';

    container.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    container.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskTitle = container.querySelector('#ll-f-title').value.trim();
      var project = container.querySelector('#ll-f-project').value;
      if (!taskTitle) { showToast('Task title is required.', 'error'); return; }
      if (!project) { showToast('Please select a project.', 'error'); return; }
      var tags = container.querySelector('#ll-f-tags').value.trim();
      var desc = container.querySelector('#ll-f-desc').value.trim();

      var title = 'Create Task: ' + taskTitle;
      var body = '### Task Title\n\n' + taskTitle + '\n\n### Project\n\n' + project;
      if (tags) body += '\n\n### Tags\n\n' + tags;
      if (desc) body += '\n\n### Description\n\n' + desc;

      submitForm(this, 'Create Task', title, body, 'Task');
    });

    container.querySelector('#ll-f-title').focus();
  }

  // --- Form: Log ---
  function renderLogForm(container) {
    container.innerHTML =
      '<div class="ll-form-group"><label>Summary *</label><input class="ll-input" id="ll-f-summary" placeholder="e.g. Worked on auth fixes and dashboard UI"></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Log Entry</button></div>';

    container.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    container.querySelector('#ll-f-submit').addEventListener('click', function() {
      var summary = container.querySelector('#ll-f-summary').value.trim();
      if (!summary) { showToast('Summary is required.', 'error'); return; }

      var title = 'Add Log: ' + summary;
      var body = '### Summary\n\n' + summary;

      submitForm(this, 'Add Log Entry', title, body, 'Log entry');
    });

    container.querySelector('#ll-f-summary').focus();
  }

  // --- Form: Idea ---
  function renderIdeaForm(container) {
    container.innerHTML =
      '<div class="ll-form-group"><label>Idea *</label><textarea class="ll-textarea" id="ll-f-idea" placeholder="Describe your idea..."></textarea></div>' +
      '<div class="ll-form-group"><label>Tags</label><div class="ll-hint">Comma-separated</div><input class="ll-input" id="ll-f-tags" placeholder="e.g. product, automation"></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Add Idea</button></div>';

    container.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    container.querySelector('#ll-f-submit').addEventListener('click', function() {
      var idea = container.querySelector('#ll-f-idea').value.trim();
      if (!idea) { showToast('Idea text is required.', 'error'); return; }
      var tags = container.querySelector('#ll-f-tags').value.trim();

      var shortTitle = idea.length > 60 ? idea.substring(0, 60) + '...' : idea;
      var title = 'Add Idea: ' + shortTitle;
      var body = '### Idea\n\n' + idea;
      if (tags) body += '\n\n### Tags\n\n' + tags;

      submitForm(this, 'Add Idea', title, body, 'Idea');
    });

    container.querySelector('#ll-f-idea').focus();
  }

  // --- Form: Update Task ---
  function renderUpdateForm(container, data) {
    var opts = '<option value="">Select a task...</option>';
    if (data && data.tasks) {
      data.tasks.forEach(function(t) {
        opts += '<option value="' + escapeHtml(t.id) + '">' + escapeHtml(t.id + ': ' + (t.title || '') + ' [' + (t.status || 'todo') + ']') + '</option>';
      });
    }

    container.innerHTML =
      '<div class="ll-form-group"><label>Task *</label><select class="ll-select" id="ll-f-taskid">' + opts + '</select></div>' +
      '<div class="ll-form-group"><label>New Status *</label><select class="ll-select" id="ll-f-status"><option value="">Select status...</option><option value="todo">Todo</option><option value="in-progress">In Progress</option><option value="done">Done</option></select></div>' +
      '<div class="ll-form-actions"><button class="ll-btn ll-btn-cancel" id="ll-f-cancel">Cancel</button><button class="ll-btn ll-btn-submit" id="ll-f-submit">Update Task</button></div>';

    container.querySelector('#ll-f-cancel').addEventListener('click', closeModal);
    container.querySelector('#ll-f-submit').addEventListener('click', function() {
      var taskId = container.querySelector('#ll-f-taskid').value;
      var status = container.querySelector('#ll-f-status').value;
      if (!taskId) { showToast('Please select a task.', 'error'); return; }
      if (!status) { showToast('Please select a status.', 'error'); return; }

      var title = 'Update Task: ' + taskId;
      var body = '### Task ID\n\n' + taskId + '\n\n### New Status\n\n' + status;

      submitForm(this, 'Update Task', title, body, 'Task update');
    });
  }

  // --- Add Item Modal ---
  async function showAddModal(defaultTab) {
    var data = await loadSiteData();
    var tabs = [
      { id: 'project', label: 'Project' },
      { id: 'task', label: 'Task' },
      { id: 'log', label: 'Log' },
      { id: 'idea', label: 'Idea' },
      { id: 'update', label: 'Update Task' }
    ];
    defaultTab = defaultTab || 'project';

    var modal = createModal('Add New');

    var tabBar = document.createElement('div');
    tabBar.className = 'll-tabs';
    tabs.forEach(function(t) {
      var btn = document.createElement('button');
      btn.className = 'll-tab' + (t.id === defaultTab ? ' active' : '');
      btn.dataset.tab = t.id;
      btn.textContent = t.label;
      tabBar.appendChild(btn);
    });
    modal.appendChild(tabBar);

    var contentDiv = document.createElement('div');
    contentDiv.className = 'll-modal-body';
    modal.appendChild(contentDiv);

    function renderTab(tabId) {
      tabBar.querySelectorAll('.ll-tab').forEach(function(t) {
        t.classList.toggle('active', t.dataset.tab === tabId);
      });
      switch (tabId) {
        case 'project': renderProjectForm(contentDiv); break;
        case 'task': renderTaskForm(contentDiv, data); break;
        case 'log': renderLogForm(contentDiv); break;
        case 'idea': renderIdeaForm(contentDiv); break;
        case 'update': renderUpdateForm(contentDiv, data); break;
      }
    }

    tabBar.querySelectorAll('.ll-tab').forEach(function(tab) {
      tab.addEventListener('click', function() { renderTab(this.dataset.tab); });
    });

    renderTab(defaultTab);
  }

  // --- Nav buttons ---
  function injectNavButtons() {
    var nav = document.querySelector('nav');
    if (!nav) return;

    var actions = document.createElement('div');
    actions.className = 'll-nav-actions';

    var addBtn = document.createElement('button');
    addBtn.className = 'll-nav-btn ll-nav-btn-primary';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', function() {
      var page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
      var tab = 'project';
      if (page.indexOf('task') !== -1) tab = 'task';
      else if (page.indexOf('log') !== -1) tab = 'log';
      else if (page.indexOf('idea') !== -1) tab = 'idea';
      showAddModal(tab);
    });

    var settingsBtn = document.createElement('button');
    settingsBtn.className = 'll-nav-btn';
    settingsBtn.innerHTML = '&#9881;';
    settingsBtn.title = 'Settings';
    settingsBtn.addEventListener('click', showSettingsModal);

    actions.appendChild(addBtn);
    actions.appendChild(settingsBtn);
    nav.appendChild(actions);
  }

  // --- Keyboard shortcuts ---
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // --- Expose for inline use ---
  window.llShowAddModal = showAddModal;
  window.llShowSettings = showSettingsModal;

  // --- Init ---
  function init() {
    injectStyles();
    injectNavButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
