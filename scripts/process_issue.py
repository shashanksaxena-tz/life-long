#!/usr/bin/env python3
"""
Process a GitHub issue labeled 'input' and create the appropriate markdown files.

Supports these commands in the issue title:
  - "Create Project: <name>"
  - "Create Task: <title>" (body should contain "project: <id>")
  - "Add Log: <summary>"
  - "Add Idea: <idea text>"
  - "Update Task: <task-id> status <new-status>"

This is a simple template-based parser. Replace with AI parsing later
(e.g., via OpenRouter API call) for natural language support.
"""

import os
import re
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

title = os.environ.get("ISSUE_TITLE", "").strip()
body = os.environ.get("ISSUE_BODY", "").strip()
issue_number = os.environ.get("ISSUE_NUMBER", "0")

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


def create_task(task_title: str):
    fields = parse_body_fields(body)
    # Issue form may provide the title in the body
    task_title = task_title or fields.get("task title", "untitled")
    project = fields.get("project", "unassigned")
    tags = fields.get("tags", "")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    tag_str = f"[{', '.join(tag_list)}]" if tag_list else "[]"
    description = fields.get("description", task_title)

    task_id = next_task_id()
    filepath = REPO_ROOT / "tasks" / f"{task_id}.md"

    content = f"""---
id: {task_id}
project: {project}
title: {task_title}
status: todo
created: {today}
updated: {today}
tags: {tag_str}
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


# --- Intent matching ---
title_lower = title.lower()

if title_lower.startswith("create project:"):
    name = title.split(":", 1)[1].strip()
    create_project(name)

elif title_lower.startswith("create task:"):
    task_title = title.split(":", 1)[1].strip()
    create_task(task_title)

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

else:
    print(f"Unknown command in issue title: {title}")
    print("Supported prefixes: Create Project:, Create Task:, Add Log:, Add Idea:, Update Task:")
