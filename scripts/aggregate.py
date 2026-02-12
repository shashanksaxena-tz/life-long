#!/usr/bin/env python3
"""
Aggregation script: reads all Markdown files in /projects, /tasks, /logs, /ideas,
/goals, /habits and generates /data/index.json for the static site to consume.
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
    "goals": REPO_ROOT / "goals",
    "habits": REPO_ROOT / "habits",
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

    lines = frontmatter_str.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if not stripped:
            i += 1
            continue

        # Skip lines that start with "- " (list items handled by their parent key)
        if stripped.startswith("- ") and ":" not in stripped.split("-", 1)[0]:
            i += 1
            continue

        if ":" not in stripped:
            i += 1
            continue

        key, _, value = stripped.partition(":")
        key = key.strip()
        value = value.strip()

        # Handle YAML inline arrays like [backend, security]
        if value.startswith("[") and value.endswith("]"):
            items = value[1:-1]
            meta[key] = [item.strip() for item in items.split(",") if item.strip()]
        elif value == "" or value == "[]":
            # Check if next lines are multi-line YAML array items (  - item)
            items = []
            while i + 1 < len(lines):
                next_line = lines[i + 1]
                next_stripped = next_line.strip()
                if next_stripped.startswith("- "):
                    items.append(next_stripped[2:].strip())
                    i += 1
                elif next_stripped == "[]":
                    i += 1
                    break
                else:
                    break
            meta[key] = items if items else ([] if value == "[]" else "")
        else:
            meta[key] = value

        i += 1

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


def parse_time_spent(time_str: str) -> int:
    """Parse a time_spent string like '2h', '30m', or '1h30m' into total minutes."""
    if not time_str or not isinstance(time_str, str):
        return 0
    total = 0
    h_match = re.search(r"(\d+)h", time_str)
    m_match = re.search(r"(\d+)m", time_str)
    if h_match:
        total += int(h_match.group(1)) * 60
    if m_match:
        total += int(m_match.group(1))
    return total


def compute_stats(projects: list, tasks: list, logs: list, ideas: list,
                  goals: list, habits: list) -> dict:
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
    for item in tasks + projects + ideas + goals + habits:
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

    # Goals stats
    total_goals = len(goals)
    active_goals = sum(1 for g in goals if g.get("status") == "active")

    # Habits stats
    total_habits = len(habits)
    active_habits = sum(1 for h in habits if h.get("status") == "active")

    # Time tracking: sum all tasks' time_spent fields
    total_minutes = sum(parse_time_spent(t.get("time_spent", "")) for t in tasks)
    hours, mins = divmod(total_minutes, 60)
    if hours and mins:
        total_time_spent = f"{hours}h{mins}m"
    elif hours:
        total_time_spent = f"{hours}h"
    elif mins:
        total_time_spent = f"{mins}m"
    else:
        total_time_spent = "0m"

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
        "total_goals": total_goals,
        "active_goals": active_goals,
        "total_habits": total_habits,
        "active_habits": active_habits,
        "total_time_spent": total_time_spent,
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
    goals = collect_files(DIRS["goals"])
    habits = collect_files(DIRS["habits"])

    stats = compute_stats(projects, tasks, logs, ideas, goals, habits)

    output = {
        "generated_at": datetime.now().isoformat(),
        "stats": stats,
        "projects": clean_for_json(projects),
        "tasks": clean_for_json(tasks),
        "logs": clean_for_json(logs),
        "ideas": clean_for_json(ideas),
        "goals": clean_for_json(goals),
        "habits": clean_for_json(habits),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {OUTPUT} with {stats['total_projects']} projects, "
          f"{stats['total_tasks']} tasks, {stats['total_logs']} logs, "
          f"{stats['total_ideas']} ideas, {stats['total_goals']} goals, "
          f"{stats['total_habits']} habits.")


if __name__ == "__main__":
    main()
