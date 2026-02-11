# Life Long

A personal productivity system built entirely on free GitHub infrastructure. Zero cost. Zero backend. Zero dependencies.

**Git as database. Markdown as source of truth. GitHub Pages as UI. GitHub Actions as backend.**

## Live Site

`https://<your-username>.github.io/life-long/`

## How It Works

```
You (static site forms / GitHub issues / Telegram bot / natural language)
  |
  v
GitHub Issues API (with "input" label)
  |
  v
GitHub Actions (process-issue.yml)
  +-- Parses issue title + body (template or AI-powered)
  +-- Creates/updates markdown files
  +-- Runs aggregation -> data/index.json
  +-- Pushes to branch -> triggers deploy
        |
        v
  GitHub Pages (static HTML site)
  +-- Reads data/index.json client-side
```

No server. No database. No build step. Just markdown files, Python scripts, and vanilla HTML/JS.

## Features

### Static Dashboard Site
- **Dashboard** -- Stats cards, task status doughnut chart, project bar chart, recent activity feed, logging streak tracker, weekly productivity score, overdue/due-soon task alerts
- **Projects** -- Filterable card view with status badges, expandable descriptions, live task completion counts
- **Tasks** -- Filter by status/project/tag/priority, sort by updated/created/title/priority/due date, expandable details, overdue highlighting
- **Logs** -- Daily log entries with inline markdown rendering, searchable
- **Ideas** -- Card grid with status and tag filtering, searchable

### Search & Filter
Every listing page has a **search bar** that filters items in real-time across titles, tags, bodies, and metadata. Press `/` to focus the search bar from anywhere.

### Priority & Due Dates
Tasks support **priority levels** (low, medium, high, critical) and **due dates** with:
- Color-coded priority badges
- Overdue and due-soon visual indicators (red/yellow left border)
- "Upcoming & Overdue" section on the dashboard
- Sort by priority or due date on the tasks page

### Inline Forms (No GitHub Required)
Every page has a **"+ Add"** button in the nav that opens a modal with forms for:
- Create Project (name, tags, description)
- Create Task (title, project, priority, due date, tags, description)
- Add Log Entry (summary)
- Add Idea (text, tags)
- Update Task Status (task dropdown, status dropdown)

Forms call the GitHub Issues API directly from the browser. Configure your GitHub token once via the **gear icon** in the nav.

### Data Export
Every listing page has **JSON** and **CSV** export buttons. The dashboard can export the complete dataset as JSON or all tasks as CSV.

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `g d` | Go to Dashboard |
| `g p` | Go to Projects |
| `g t` | Go to Tasks |
| `g l` | Go to Logs |
| `g i` | Go to Ideas |
| `n` | Open "Add New" modal |
| `/` | Focus search bar |
| `?` | Toggle shortcut help panel |
| `Esc` | Close modal |

### Streak Tracker & Productivity Score
The dashboard shows:
- **Current logging streak** -- consecutive days with log entries
- **Longest streak** -- your personal best
- **30-day activity heatmap** -- visual calendar of active days
- **Weekly productivity score** -- based on tasks completed, created, and log entries

### PWA Support
The site works as a **Progressive Web App** -- add it to your home screen for an app-like experience with offline support via service worker caching.

### Automated Pipeline
- **Issue processing** -- Issues with the `input` label are parsed and converted to markdown files
- **Aggregation** -- `scripts/aggregate.py` collects all markdown into `data/index.json` (includes overdue/due-soon counts, priority stats)
- **Deployment** -- GitHub Pages deploys automatically on every push

### AI-Powered Parsing (Optional)
Set the `OPENROUTER_API_KEY` secret to enable **natural language issue parsing**. Instead of structured prefixes like "Create Task:", you can write free-form text and the AI will determine intent. Falls back to template parsing if the API key is not set or the request fails. **Completely non-blocking.**

### Telegram Bot (Optional)
Send messages to a Telegram bot to create issues from your phone:
- `task: Fix the login bug` -> Creates a task
- `log: Worked on dashboard` -> Creates a log entry
- `idea: Build mobile app` -> Creates an idea
- Free text -> Treated as a log entry

Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets. **Completely non-blocking.**

### Issue Templates
Pre-built GitHub issue forms for structured input:
- Create Project, Create Task (with priority + due date), Add Log Entry, Add Idea, Update Task

## Repo Structure

```
life-long/
+-- index.html              Dashboard (streak, productivity, charts, due tasks)
+-- projects.html           Projects listing (with task counts)
+-- tasks.html              Tasks listing (priority, due dates, search)
+-- logs.html               Daily logs (searchable)
+-- ideas.html              Ideas board (searchable)
+-- style.css               Shared styles (single source of truth)
+-- utils.js                Shared utilities (formatDate, badgeClass, search, export, streak)
+-- app.js                  Inline forms, settings, GitHub API integration, service worker
+-- sw.js                   Service worker for offline/PWA support
+-- manifest.json           PWA manifest
+-- data/
|   +-- index.json          Auto-generated aggregate data (consumed by HTML)
+-- projects/               Project markdown files
+-- tasks/                  Task markdown files (with priority + due fields)
+-- logs/                   Daily log markdown files
+-- ideas/                  Idea markdown files
+-- scripts/
|   +-- process_issue.py    Parses GitHub issues into markdown (with AI support)
|   +-- aggregate.py        Aggregates markdown into data/index.json
|   +-- telegram_webhook.py Telegram bot message handler
+-- .github/
    +-- ISSUE_TEMPLATE/     Issue form templates (5 types)
    +-- workflows/
        +-- deploy.yml      GitHub Pages deployment
        +-- aggregate.yml   Data aggregation on content changes
        +-- process-issue.yml  Issue processing pipeline (with AI)
        +-- telegram-bot.yml   Telegram bot webhook handler
```

## Setup

### 1. Set Default Branch
Go to **Settings > General > Default branch** and set it to your working branch.

### 2. Enable GitHub Pages
Go to **Settings > Pages > Source** and select **"GitHub Actions"** (not "Deploy from a branch").

### 3. Create the `input` Label
Go to **Issues > Labels > New label** -- name it `input`.

### 4. Create a GitHub Personal Access Token
Go to **GitHub > Settings > Developer settings > Personal access tokens > Generate**.
Needs `repo` scope (or fine-grained with Issues read/write for public repos).

### 5. Configure the Site
Open the deployed site, click the **gear icon** in the nav, enter your token and repo details.

### 6. Start Using
Click **"+ Add"** on any page to create projects, tasks, logs, and ideas directly from the site.

### Optional: AI-Powered Parsing
Add the `OPENROUTER_API_KEY` secret to your repository to enable natural language parsing of issues.

### Optional: Telegram Bot
1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` secrets
3. Trigger the `telegram-bot.yml` workflow via dispatch with your message

## File Schemas

### Project (`/projects/<slug>.md`)
```yaml
---
id: auth-service
name: Auth Service
status: active          # active | planning | done | archived
created: 2026-02-01
tags: [backend, security]
---
```

### Task (`/tasks/<task-id>.md`)
```yaml
---
id: task-2026-001
project: auth-service
title: Fix JWT refresh expiry bug
status: done            # todo | in-progress | done
created: 2026-02-11
updated: 2026-02-11
tags: [bug, backend]
priority: high          # low | medium | high | critical (optional)
due: 2026-02-15         # YYYY-MM-DD (optional)
---
```

### Daily Log (`/logs/<date>.md`)
```yaml
---
date: 2026-02-11
---
```

### Idea (`/ideas/<idea-id>.md`)
```yaml
---
id: idea-2026-003
status: raw             # raw | planning | in-progress | done
created: 2026-02-11
tags: [product]
---
```

## Workflow Triggers

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `deploy.yml` | Any push to branch | Deploys entire repo to GitHub Pages |
| `aggregate.yml` | Push changing `projects/`, `tasks/`, `logs/`, `ideas/` | Regenerates `data/index.json` |
| `process-issue.yml` | Issue opened with `input` label | Parses issue (template or AI), creates files, pushes, closes issue |
| `telegram-bot.yml` | Workflow dispatch | Processes Telegram message into GitHub issue |

## Cost

| Component | Cost |
|-----------|------|
| GitHub Repo | Free |
| GitHub Pages | Free |
| GitHub Actions | Free (2,000 mins/month) |
| Static site (no framework) | Free |
| AI parsing (optional) | Pay-per-use via OpenRouter |
| Telegram bot (optional) | Free |
| **Total** | **$0** (core features) |
