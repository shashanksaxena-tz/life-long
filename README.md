# life-long

A personal productivity system built entirely on free GitHub infrastructure.

**Git as database. Markdown as source of truth. GitHub Pages as UI.**

## Architecture

```
Telegram → Bot → Cloudflare Worker (Free)
              ↓
           AI (OpenRouter / Gemini / etc.)
              ↓
        GitHub API commit
              ↓
     GitHub Actions builds site
              ↓
        GitHub Pages static site
```

## Repo Structure

```
/projects/       Project markdown files
/tasks/          Task markdown files
/logs/           Daily log markdown files
/ideas/          Idea markdown files
/data/           Auto-generated index.json
/scripts/        Aggregation and processing scripts
/.github/        GitHub Actions workflows
*.html           Static site pages (GitHub Pages)
```

## How It Works

1. **Input** — Create GitHub issues with the `input` label, or use Telegram (future)
2. **Processing** — GitHub Actions parses the issue and creates markdown files via PR
3. **Aggregation** — On push to `main`, Actions runs `scripts/aggregate.py` to generate `data/index.json`
4. **Display** — GitHub Pages serves the static HTML site, which reads `data/index.json` client-side

## Issue Commands

Create an issue with the `input` label using these title formats:

| Command | Example |
|---------|---------|
| `Create Project: <name>` | `Create Project: Analytics Engine` |
| `Create Task: <title>` | `Create Task: Fix OAuth redirect bug` |
| `Add Log: <summary>` | `Add Log: Worked on auth fixes` |
| `Add Idea: <text>` | `Add Idea: Weekly auto performance reviews` |
| `Update Task: <id> status <status>` | `Update Task: task-2026-001 status done` |

For Create Task, include `project: <project-id>` and optionally `tags: tag1, tag2` in the issue body.

## File Schemas

### Project (`/projects/<slug>.md`)

```yaml
---
id: auth-service
name: Auth Service
status: active
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
status: done
created: 2026-02-11
updated: 2026-02-11
tags: [bug, backend]
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
status: raw
created: 2026-02-11
tags: [product]
---
```

## Cost

| Component | Cost |
|-----------|------|
| GitHub Repo | Free |
| GitHub Pages | Free |
| GitHub Actions | Free |
| Telegram Bot | Free (future) |
| Cloudflare Worker | Free (future) |
| OpenRouter API | Free tier (future) |

**Total: $0**
