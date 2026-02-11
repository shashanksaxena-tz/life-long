#!/usr/bin/env python3
"""
Aggregation script: reads all Markdown files in /projects, /tasks, /logs, /ideas
and generates /data/index.json for the static site to consume.
"""

import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

DIRS = {
    "projects": REPO_ROOT / "projects",
    "tasks": REPO_ROOT / "tasks",
    "logs": REPO_ROOT / "logs",
    "ideas": REPO_ROOT / "ideas",
}

OUTPUT = REPO_ROOT / "data" / "index.json"


def parse_frontmatter(filepath: Path) -> dict:
    """Parse YAML frontmatter from a markdown file (simple parser, no deps)."""
    text = filepath.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {"_body": text}

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {"_body": text}

    frontmatter_str = parts[1].strip()
    body = parts[2].strip()
    meta = {}

    for line in frontmatter_str.splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip()
        value = value.strip()

        # Handle YAML arrays like [backend, security]
        if value.startswith("[") and value.endswith("]"):
            items = value[1:-1]
            meta[key] = [item.strip() for item in items.split(",") if item.strip()]
        else:
            meta[key] = value

    meta["_body"] = body
    return meta


def collect_files(directory: Path) -> list[dict]:
    """Read all .md files in a directory and return parsed data."""
    if not directory.exists():
        return []

    results = []
    for f in sorted(directory.glob("*.md")):
        data = parse_frontmatter(f)
        data["_file"] = f.name
        results.append(data)
    return results


def compute_stats(projects: list, tasks: list, logs: list, ideas: list) -> dict:
    """Compute aggregate statistics."""
    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t.get("status") == "done")
    in_progress_tasks = sum(1 for t in tasks if t.get("status") == "in-progress")
    todo_tasks = sum(1 for t in tasks if t.get("status") == "todo")

    active_projects = sum(1 for p in projects if p.get("status") == "active")

    # Count logs in last 7 days
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    recent_logs = 0
    for log in logs:
        date_str = log.get("date", "")
        try:
            log_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if log_date >= week_ago:
                recent_logs += 1
        except (ValueError, TypeError):
            pass

    # Collect all tags
    all_tags = set()
    for item in tasks + projects + ideas:
        tags = item.get("tags", [])
        if isinstance(tags, list):
            all_tags.update(tags)

    # Count overdue and due-soon tasks
    overdue_tasks = 0
    due_soon_tasks = 0
    for t in tasks:
        if t.get("status") == "done":
            continue
        due = t.get("due", "")
        if due:
            try:
                due_date = datetime.strptime(due, "%Y-%m-%d").date()
                diff = (due_date - today).days
                if diff < 0:
                    overdue_tasks += 1
                elif diff <= 3:
                    due_soon_tasks += 1
            except (ValueError, TypeError):
                pass

    # Count tasks by priority
    priority_counts = {}
    for t in tasks:
        p = t.get("priority", "")
        if p:
            priority_counts[p] = priority_counts.get(p, 0) + 1

    return {
        "total_projects": len(projects),
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "done_tasks": done_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "overdue_tasks": overdue_tasks,
        "due_soon_tasks": due_soon_tasks,
        "priority_counts": priority_counts,
        "total_ideas": len(ideas),
        "total_logs": len(logs),
        "logs_this_week": recent_logs,
        "all_tags": sorted(all_tags),
    }


def clean_for_json(items: list) -> list:
    """Remove internal keys and prepare for JSON output."""
    cleaned = []
    for item in items:
        entry = {k: v for k, v in item.items() if not k.startswith("_")}
        entry["body"] = item.get("_body", "")
        cleaned.append(entry)
    return cleaned


def main():
    projects = collect_files(DIRS["projects"])
    tasks = collect_files(DIRS["tasks"])
    logs = collect_files(DIRS["logs"])
    ideas = collect_files(DIRS["ideas"])

    stats = compute_stats(projects, tasks, logs, ideas)

    output = {
        "generated_at": datetime.now().isoformat(),
        "stats": stats,
        "projects": clean_for_json(projects),
        "tasks": clean_for_json(tasks),
        "logs": clean_for_json(logs),
        "ideas": clean_for_json(ideas),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {OUTPUT} with {stats['total_projects']} projects, "
          f"{stats['total_tasks']} tasks, {stats['total_logs']} logs, "
          f"{stats['total_ideas']} ideas.")


if __name__ == "__main__":
    main()
