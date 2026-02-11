#!/usr/bin/env python3
"""
Telegram Bot Webhook Handler for Life Long.

Receives Telegram messages and creates GitHub issues via the GitHub API.
This allows you to add tasks, logs, ideas, etc. from Telegram.

Usage:
  Send a message to your Telegram bot like:
    "task: Fix the login bug for auth-service"
    "log: Worked on dashboard improvements"
    "idea: Build mobile app for life-long"
    "project: Mobile App"

The bot parses the message and creates a GitHub issue with the 'input' label,
which triggers the process-issue workflow.

Setup:
  1. Create a Telegram bot via @BotFather
  2. Set these GitHub secrets:
     - TELEGRAM_BOT_TOKEN: Your bot token from BotFather
     - TELEGRAM_CHAT_ID: Your chat ID (get from @userinfobot)
     - GH_PAT: A GitHub PAT with repo scope
  3. Set up a webhook pointing to your GitHub Actions workflow dispatch URL
     (or use the scheduled polling approach in the workflow)
"""

import json
import os
import re
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GH_PAT", "").strip()
GITHUB_REPO = os.environ.get("GITHUB_REPOSITORY", "").strip()
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
MESSAGE_TEXT = os.environ.get("TELEGRAM_MESSAGE", "").strip()


def parse_telegram_message(text: str) -> tuple[str, str]:
    """Parse a Telegram message into issue title and body.

    Supports formats:
      "task: Fix the login bug"
      "log: Worked on auth"
      "idea: Build mobile app"
      "project: New Project Name"
      Or just free text (treated as a log entry)
    """
    text = text.strip()

    # Check for command prefix
    prefixes = {
        "task": "Create Task",
        "log": "Add Log",
        "idea": "Add Idea",
        "project": "Create Project",
        "update": "Update Task",
    }

    for prefix, action in prefixes.items():
        pattern = rf"^{prefix}[:\s]+(.+)"
        match = re.match(pattern, text, re.IGNORECASE)
        if match:
            content = match.group(1).strip()
            return f"{action}: {content}", ""

    # Default: treat as log entry
    return f"Add Log: {text}", ""


def create_github_issue(title: str, body: str) -> dict:
    """Create a GitHub issue with the 'input' label."""
    if not GITHUB_TOKEN or not GITHUB_REPO:
        print("Missing GITHUB_TOKEN or GITHUB_REPOSITORY")
        return {}

    url = f"https://api.github.com/repos/{GITHUB_REPO}/issues"
    data = json.dumps({
        "title": title,
        "body": body or f"Created via Telegram bot.",
        "labels": ["input"],
    }).encode()

    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read().decode())
            print(f"Created issue #{result['number']}: {result['html_url']}")
            return result
    except urllib.error.URLError as e:
        print(f"Failed to create issue: {e}")
        return {}


def send_telegram_reply(text: str):
    """Send a reply message back to the Telegram chat."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = json.dumps({
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown",
    }).encode()

    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
    })

    try:
        urllib.request.urlopen(req, timeout=10)
    except urllib.error.URLError as e:
        print(f"Failed to send Telegram reply: {e}")


if __name__ == "__main__":
    if not MESSAGE_TEXT:
        print("No message to process")
        exit(0)

    title, body = parse_telegram_message(MESSAGE_TEXT)
    print(f"Parsed: {title}")

    issue = create_github_issue(title, body)
    if issue:
        send_telegram_reply(
            f"Created [issue #{issue['number']}]({issue['html_url']})\n"
            f"*{title}*\nSite updates in ~2 min."
        )
    else:
        send_telegram_reply("Failed to create issue. Check bot configuration.")
