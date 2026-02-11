#!/usr/bin/env python3
"""
AI-powered weekly summary generator for Life Long.
Reads data/index.json, sends a prompt to the OpenRouter API, and saves
the resulting AI-generated summary as a markdown file in digests/.

Requires OPENROUTER_API_KEY environment variable to be set.
Uses only stdlib (urllib.request) -- no pip dependencies.
"""

import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data" / "index.json"
DIGESTS_DIR = REPO_ROOT / "digests"

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "openai/gpt-4o-mini"


def gather_weekly_context(data: dict) -> dict:
    """Collect activity from the past 7 days for the AI prompt."""
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)

    tasks = data.get("tasks", [])
    logs = data.get("logs", [])
    ideas = data.get("ideas", [])

    def in_range(date_str: str) -> bool:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date() >= week_ago
        except (ValueError, TypeError):
            return False

    completed_tasks = [
        t for t in tasks
        if t.get("status") == "done"
        and in_range(t.get("updated") or t.get("created", ""))
    ]

    in_progress_tasks = [
        t for t in tasks
        if t.get("status") == "in-progress"
    ]

    new_ideas = [
        i for i in ideas
        if in_range(i.get("created", ""))
    ]

    recent_logs = [
        log for log in logs
        if in_range(log.get("date", ""))
    ]

    return {
        "week_range": f"{week_ago.isoformat()} to {today.isoformat()}",
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "new_ideas": new_ideas,
        "recent_logs": recent_logs,
        "stats": data.get("stats", {}),
    }


def build_prompt(context: dict) -> str:
    """Build the prompt to send to the AI model."""
    parts = [
        "You are an assistant helping summarize a developer's weekly activity.",
        f"Week: {context['week_range']}",
        "",
        "## Completed Tasks",
    ]

    if context["completed_tasks"]:
        for t in context["completed_tasks"]:
            title = t.get("title", t.get("id", "Untitled"))
            project = t.get("project", "no project")
            parts.append(f"- {title} (project: {project})")
    else:
        parts.append("- None")

    parts.append("")
    parts.append("## In-Progress Tasks")

    if context["in_progress_tasks"]:
        for t in context["in_progress_tasks"]:
            title = t.get("title", t.get("id", "Untitled"))
            project = t.get("project", "no project")
            parts.append(f"- {title} (project: {project})")
    else:
        parts.append("- None")

    parts.append("")
    parts.append("## New Ideas")

    if context["new_ideas"]:
        for idea in context["new_ideas"]:
            body_line = idea.get("body", "").split("\n")[0].replace("## Idea", "").strip()
            tags = ", ".join(idea.get("tags", []))
            parts.append(f"- {body_line} (tags: {tags})")
    else:
        parts.append("- None")

    parts.append("")
    parts.append("## Log Entries")

    if context["recent_logs"]:
        for log in context["recent_logs"]:
            date = log.get("date", "?")
            body_preview = log.get("body", "").replace("\n", " ")[:150]
            parts.append(f"- {date}: {body_preview}")
    else:
        parts.append("- None")

    parts.append("")
    parts.append("## Stats")
    stats = context["stats"]
    parts.append(f"- Total projects: {stats.get('total_projects', 0)}")
    parts.append(f"- Total tasks: {stats.get('total_tasks', 0)}")
    parts.append(f"- Done: {stats.get('done_tasks', 0)}")
    parts.append(f"- In progress: {stats.get('in_progress_tasks', 0)}")
    parts.append(f"- Ideas: {stats.get('total_ideas', 0)}")

    parts.append("")
    parts.append(
        "Please write a concise weekly summary in Markdown format. Include:\n"
        "1. A brief overview paragraph of the week's progress\n"
        "2. Key accomplishments\n"
        "3. Current focus areas\n"
        "4. Notable ideas or themes\n"
        "5. Suggestions for the upcoming week\n"
        "\n"
        "Keep it professional and actionable. Use bullet points where appropriate. "
        "Format the output as a complete Markdown document with headers."
    )

    return "\n".join(parts)


def call_openrouter(api_key: str, prompt: str) -> str:
    """Call the OpenRouter API and return the assistant's response text."""
    payload = json.dumps({
        "model": MODEL,
        "messages": [
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 1500,
        "temperature": 0.7,
    }).encode("utf-8")

    req = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://github.com/life-long",
            "X-Title": "Life Long AI Summary",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"OpenRouter API error (HTTP {e.code}): {body}")
        raise SystemExit(1)
    except urllib.error.URLError as e:
        print(f"Network error calling OpenRouter: {e.reason}")
        raise SystemExit(1)

    choices = result.get("choices", [])
    if not choices:
        print("No choices returned from OpenRouter API.")
        raise SystemExit(1)

    return choices[0].get("message", {}).get("content", "")


def main():
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        print("OPENROUTER_API_KEY not set. Skipping AI summary generation.")
        return

    if not DATA_FILE.exists():
        print("No data/index.json found. Run aggregate.py first.")
        return

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    context = gather_weekly_context(data)

    prompt = build_prompt(context)
    print(f"Requesting AI summary for week: {context['week_range']}...")

    summary_text = call_openrouter(api_key, prompt)

    if not summary_text.strip():
        print("AI returned an empty summary. Skipping file creation.")
        return

    # Prepend metadata header
    today = datetime.now().date().isoformat()
    header = (
        f"---\n"
        f"type: ai-summary\n"
        f"date: {today}\n"
        f"week: {context['week_range']}\n"
        f"model: {MODEL}\n"
        f"---\n\n"
    )

    DIGESTS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = DIGESTS_DIR / f"ai-summary-{today}.md"
    output_file.write_text(header + summary_text, encoding="utf-8")
    print(f"AI summary saved to {output_file}")


if __name__ == "__main__":
    main()
