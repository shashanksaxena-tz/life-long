#!/usr/bin/env python3
"""
Process a GitHub issue labeled 'input' and create the appropriate markdown files.

Supports these commands in the issue title:
  - "Create Project: <name>"
  - "Create Task: <title>" (body should contain "project: <id>")
  - "Add Log: <summary>"
  - "Add Idea: <idea text>"
  - "Update Task: <task-id> status <new-status>"
  - "Create Goal: <title>"
  - "Create Habit: <name>"

Also supports optional AI-powered natural language parsing via OpenRouter API.
Set OPENROUTER_API_KEY secret to enable. Falls back to template parsing if unavailable.
"""

import json
import os
import re
import urllib.request
import urllib.error
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

title = os.environ.get("ISSUE_TITLE", "").strip()
body = os.environ.get("ISSUE_BODY", "").strip()
issue_number = os.environ.get("ISSUE_NUMBER", "0")
openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

today = date.today().isoformat()


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def next_task_id() -> str:
    """Generate the next task ID based on existing files."""
    tasks_dir = REPO_ROOT / "tasks"
    existing = sorted(tasks_dir.glob("task-*.md"))
    if not existing:
        return f"task-{today[:4]}-001"
    last = existing[-1].stem  # e.g. task-2026-003
    parts = last.split("-")
    num = int(parts[-1]) + 1
    return f"task-{today[:4]}-{num:03d}"


def next_idea_id() -> str:
    """Generate the next idea ID based on existing files."""
    ideas_dir = REPO_ROOT / "ideas"
    existing = sorted(ideas_dir.glob("idea-*.md"))
    if not existing:
        return f"idea-{today[:4]}-001"
    last = existing[-1].stem
    parts = last.split("-")
    num = int(parts[-1]) + 1
    return f"idea-{today[:4]}-{num:03d}"


def next_goal_id() -> str:
    """Generate the next goal ID based on existing files."""
    goals_dir = REPO_ROOT / "goals"
    goals_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(goals_dir.glob("goal-*.md"))
    if not existing:
        return f"goal-{today[:4]}-001"
    last = existing[-1].stem
    parts = last.split("-")
    num = int(parts[-1]) + 1
    return f"goal-{today[:4]}-{num:03d}"


def next_habit_id() -> str:
    """Generate the next habit ID based on existing files."""
    habits_dir = REPO_ROOT / "habits"
    habits_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(habits_dir.glob("habit-*.md"))
    if not existing:
        return "habit-001"
    last = existing[-1].stem
    parts = last.split("-")
    num = int(parts[-1]) + 1
    return f"habit-{num:03d}"


def parse_body_fields(body_text: str) -> dict:
    """Extract fields from issue body.

    Supports two formats:
    1. Plain key: value lines
    2. GitHub issue form format: ### Label\\n\\nValue
    """
    fields = {}
    lines = body_text.splitlines()

    # Try GitHub issue form format first (### Label\n\nValue)
    i = 0
    found_form_fields = False
    while i < len(lines):
        line = lines[i].strip()
        if line.startswith("### "):
            key = line[4:].strip().lower()
            # Collect value lines until next ### or end
            i += 1
            # Skip blank lines after header
            while i < len(lines) and lines[i].strip() == "":
                i += 1
            value_lines = []
            while i < len(lines) and not lines[i].strip().startswith("### "):
                value_lines.append(lines[i])
                i += 1
            value = "\n".join(value_lines).strip()
            if value and value != "_No response_":
                fields[key] = value
                found_form_fields = True
        else:
            i += 1

    # Fall back to plain key: value format
    if not found_form_fields:
        for line in lines:
            line = line.strip()
            if ":" in line and not line.startswith("#"):
                key, _, value = line.partition(":")
                fields[key.strip().lower()] = value.strip()

    return fields


def try_ai_parse(issue_title: str, issue_body: str) -> dict | None:
    """Attempt to parse the issue using AI via OpenRouter API.

    Returns a dict with parsed intent and fields, or None if AI is unavailable.
    This is non-blocking - failures silently fall back to template parsing.
    """
    if not openrouter_key:
        return None

    prompt = f"""Parse this GitHub issue into a structured command for a productivity system.

Issue Title: {issue_title}
Issue Body: {issue_body}

Return ONLY a JSON object with these fields:
- "action": one of "create_project", "create_task", "add_log", "add_idea", "update_task", "create_goal", "create_habit"
- "name" or "title": the name/title of the item
- "project": project ID if applicable
- "tags": comma-separated tags if mentioned
- "description": description if provided
- "priority": one of "low", "medium", "high", "critical" if mentioned
- "due": due date in YYYY-MM-DD format if mentioned
- "task_id": task ID if updating
- "new_status": new status if updating (todo, in-progress, done)

If you cannot determine the action, return {{"action": "unknown"}}."""

    try:
        req_data = json.dumps({
            "model": "openai/gpt-3.5-turbo",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500,
            "temperature": 0,
        }).encode()

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {openrouter_key}",
                "Content-Type": "application/json",
            },
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            content = result["choices"][0]["message"]["content"]
            # Extract JSON from response
            json_match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"AI parsing failed (non-blocking): {e}")

    return None


def create_project(name: str):
    fields = parse_body_fields(body)
    # Issue form may provide the name in the body instead of the title
    name = name or fields.get("project name", "untitled")
    slug = slugify(name)
    filepath = REPO_ROOT / "projects" / f"{slug}.md"
    tags = fields.get("tags", "")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"

    content = f"""---
id: {slug}
name: {name}
status: active
created: {today}
tags: {tag_str}
---

## Description
{fields.get('description', name)}

## Stats
- Total tasks: 0
- Completed: 0
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Created project: {filepath}")


def create_task(task_title: str, ai_fields: dict | None = None):
    fields = parse_body_fields(body)
    # Issue form may provide the title in the body
    task_title = task_title or fields.get("task title", "untitled")
    project = fields.get("project", "unassigned")
    tags = fields.get("tags", "")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"
    description = fields.get("description", task_title)

    # Priority and due date support
    priority = fields.get("priority", "")
    due = fields.get("due date", fields.get("due", ""))

    # AI can override/fill in missing fields
    if ai_fields:
        if not priority and ai_fields.get("priority"):
            priority = ai_fields["priority"]
        if not due and ai_fields.get("due"):
            due = ai_fields["due"]
        if project == "unassigned" and ai_fields.get("project"):
            project = ai_fields["project"]

    task_id = next_task_id()
    filepath = REPO_ROOT / "tasks" / f"{task_id}.md"

    # Build frontmatter
    fm_lines = [
        f"id: {task_id}",
        f"project: {project}",
        f"title: {task_title}",
        "status: todo",
        f"created: {today}",
        f"updated: {today}",
        f"tags: {tag_str}",
    ]
    if priority:
        fm_lines.append(f"priority: {priority}")
    if due:
        fm_lines.append(f"due: {due}")

    frontmatter = "\n".join(fm_lines)

    content = f"""---
{frontmatter}
---

## Description
{description}

## Logs
- {today}: Created from issue #{issue_number}.
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Created task: {filepath}")


def add_log(summary: str):
    filepath = REPO_ROOT / "logs" / f"{today}.md"

    if filepath.exists():
        # Append entry to existing log
        existing = filepath.read_text(encoding="utf-8")
        entry_line = f"- {summary} (via issue #{issue_number})"
        if "## Entries" in existing:
            existing = existing.rstrip() + f"\n{entry_line}\n"
        else:
            existing = existing.rstrip() + f"\n\n## Entries\n{entry_line}\n"
        filepath.write_text(existing, encoding="utf-8")
    else:
        content = f"""---
date: {today}
---

## Summary
{summary}

## Entries
- {summary} (via issue #{issue_number})
"""
        filepath.write_text(content, encoding="utf-8")
    print(f"Updated log: {filepath}")


def add_idea(idea_text: str):
    fields = parse_body_fields(body)
    tags = fields.get("tags", "")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"

    idea_id = next_idea_id()
    filepath = REPO_ROOT / "ideas" / f"{idea_id}.md"

    content = f"""---
id: {idea_id}
status: raw
created: {today}
tags: {tag_str}
---

## Idea
{idea_text}
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Created idea: {filepath}")


def update_task(task_id: str, new_status: str):
    filepath = REPO_ROOT / "tasks" / f"{task_id}.md"
    if not filepath.exists():
        print(f"Task not found: {task_id}")
        return

    text = filepath.read_text(encoding="utf-8")
    text = re.sub(r"^status:\s*.*$", f"status: {new_status}", text, flags=re.MULTILINE)
    text = re.sub(r"^updated:\s*.*$", f"updated: {today}", text, flags=re.MULTILINE)

    # Add log entry
    log_line = f"- {today}: Status changed to {new_status} (via issue #{issue_number})."
    if "## Logs" in text:
        text = text.rstrip() + f"\n{log_line}\n"
    else:
        text = text.rstrip() + f"\n\n## Logs\n{log_line}\n"

    filepath.write_text(text, encoding="utf-8")
    print(f"Updated task: {filepath}")


def create_goal(goal_title: str):
    fields = parse_body_fields(body)
    goal_title = goal_title or fields.get("title", "untitled")
    target_date = fields.get("target date", fields.get("target_date", ""))
    linked_tasks = fields.get("linked tasks", fields.get("linked_tasks", ""))
    tags = fields.get("tags", "")
    description = fields.get("description", goal_title)

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"

    linked_list = [t.strip() for t in linked_tasks.split(",") if t.strip()] if linked_tasks else []
    linked_yaml = "\n".join(f"  - {t}" for t in linked_list) if linked_list else "  []"

    goal_id = next_goal_id()
    goals_dir = REPO_ROOT / "goals"
    goals_dir.mkdir(parents=True, exist_ok=True)
    filepath = goals_dir / f"{goal_id}.md"

    content = f"""---
id: {goal_id}
title: {goal_title}
status: active
target_date: {target_date}
linked_tasks:
{linked_yaml}
tags: {tag_str}
created: {today}
---

## Description
{description}
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Created goal: {filepath}")


def create_habit(habit_name: str):
    fields = parse_body_fields(body)
    habit_name = habit_name or fields.get("name", "untitled")
    frequency = fields.get("frequency", "daily")
    tags = fields.get("tags", "")

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"

    habit_id = next_habit_id()
    habits_dir = REPO_ROOT / "habits"
    habits_dir.mkdir(parents=True, exist_ok=True)
    filepath = habits_dir / f"{habit_id}.md"

    content = f"""---
id: {habit_id}
name: {habit_name}
frequency: {frequency}
status: active
check_dates: []
tags: {tag_str}
created: {today}
---

## Habit
{habit_name}
"""
    filepath.write_text(content, encoding="utf-8")
    print(f"Created habit: {filepath}")


# --- Intent matching ---

# Try AI parsing first (non-blocking)
ai_result = try_ai_parse(title, body)
if ai_result and ai_result.get("action") != "unknown":
    print(f"AI parsed intent: {ai_result['action']}")

title_lower = title.lower()

if title_lower.startswith("create project:"):
    name = title.split(":", 1)[1].strip()
    create_project(name)

elif title_lower.startswith("create task:"):
    task_title = title.split(":", 1)[1].strip()
    create_task(task_title, ai_fields=ai_result)

elif title_lower.startswith("add log:"):
    summary = title.split(":", 1)[1].strip()
    add_log(summary)

elif title_lower.startswith("add idea:"):
    idea_text = title.split(":", 1)[1].strip()
    fields = parse_body_fields(body)
    # Prefer the "idea" field from issue form, then full body, then title
    idea_text = fields.get("idea", idea_text or body)
    add_idea(idea_text)

elif title_lower.startswith("update task:"):
    rest = title.split(":", 1)[1].strip()
    # Try inline format: "Update Task: task-2026-001 status done"
    match = re.match(r"(task-\S+)\s+status\s+(\S+)", rest, re.IGNORECASE)
    if match:
        update_task(match.group(1), match.group(2))
    else:
        # Try issue form fields from body
        fields = parse_body_fields(body)
        task_id = fields.get("task id", rest.strip()) if rest.strip() else fields.get("task id", "")
        new_status = fields.get("new status", "")
        if task_id and new_status:
            update_task(task_id, new_status)
        else:
            print(f"Could not parse update command: {rest}")

elif title_lower.startswith("create goal:"):
    goal_title = title.split(":", 1)[1].strip()
    create_goal(goal_title)

elif title_lower.startswith("create habit:"):
    habit_name = title.split(":", 1)[1].strip()
    create_habit(habit_name)

elif ai_result and ai_result.get("action") != "unknown":
    # AI understood the intent even without a standard prefix
    action = ai_result["action"]
    print(f"Using AI-parsed action: {action}")
    if action == "create_project":
        create_project(ai_result.get("name", ""))
    elif action == "create_task":
        create_task(ai_result.get("title", ""), ai_fields=ai_result)
    elif action == "add_log":
        add_log(ai_result.get("title", title))
    elif action == "add_idea":
        add_idea(ai_result.get("title", body or title))
    elif action == "update_task":
        tid = ai_result.get("task_id", "")
        ns = ai_result.get("new_status", "")
        if tid and ns:
            update_task(tid, ns)
        else:
            print(f"AI parsed update_task but missing task_id or new_status")
    elif action == "create_goal":
        create_goal(ai_result.get("title", ""))
    elif action == "create_habit":
        create_habit(ai_result.get("name", ""))
    else:
        print(f"AI returned unknown action: {action}")

else:
    print(f"Unknown command in issue title: {title}")
    print("Supported prefixes: Create Project:, Create Task:, Add Log:, Add Idea:, Update Task:, Create Goal:, Create Habit:")
    if openrouter_key:
        print("AI parsing was attempted but could not determine intent.")
    else:
        print("Tip: Set OPENROUTER_API_KEY secret to enable AI-powered natural language parsing.")
