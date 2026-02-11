#!/usr/bin/env python3
"""
RSS feed generator for Life Long.
Reads data/index.json and generates a valid RSS 2.0 XML feed (feed.xml)
in the repository root. Includes recent tasks, logs, and ideas as feed items.
"""

import json
import xml.etree.ElementTree as ET
from datetime import datetime
from email.utils import format_datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = REPO_ROOT / "data" / "index.json"
OUTPUT_FILE = REPO_ROOT / "feed.xml"

# Base URL for the GitHub Pages site.
# Adjust this if the repo name or owner changes.
SITE_URL = "https://life-long.github.io"

MAX_ITEMS = 50


def parse_date(date_str: str) -> datetime:
    """Parse a date string in YYYY-MM-DD format into a datetime object."""
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        return datetime.min


def snippet(body: str, max_length: int = 200) -> str:
    """Extract a plain-text snippet from a body string."""
    if not body:
        return ""
    # Strip markdown headers and collapse whitespace
    lines = []
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            stripped = stripped.lstrip("#").strip()
        if stripped:
            lines.append(stripped)
    text = " ".join(lines)
    if len(text) > max_length:
        text = text[:max_length].rsplit(" ", 1)[0] + "..."
    return text


def build_feed_items(data: dict) -> list[dict]:
    """Build a flat list of feed items from tasks, logs, and ideas."""
    items = []

    # Tasks
    for task in data.get("tasks", []):
        date_str = task.get("updated") or task.get("created") or ""
        dt = parse_date(date_str)
        status = task.get("status", "unknown")
        title = task.get("title", task.get("id", "Untitled Task"))
        items.append({
            "title": f"[Task/{status}] {title}",
            "description": snippet(task.get("body", "")),
            "date": dt,
            "link": f"{SITE_URL}/tasks.html",
            "guid": f"task-{task.get('id', date_str)}",
        })

    # Logs
    for log in data.get("logs", []):
        date_str = log.get("date", "")
        dt = parse_date(date_str)
        items.append({
            "title": f"[Log] {date_str}",
            "description": snippet(log.get("body", "")),
            "date": dt,
            "link": f"{SITE_URL}/logs.html",
            "guid": f"log-{date_str}",
        })

    # Ideas
    for idea in data.get("ideas", []):
        date_str = idea.get("created", "")
        dt = parse_date(date_str)
        body_snippet = snippet(idea.get("body", ""))
        # Use the first meaningful words as a short title
        short = body_snippet[:60].rstrip(".")
        items.append({
            "title": f"[Idea] {short}",
            "description": body_snippet,
            "date": dt,
            "link": f"{SITE_URL}/ideas.html",
            "guid": f"idea-{idea.get('id', date_str)}",
        })

    # Sort by date descending
    items.sort(key=lambda i: i["date"], reverse=True)

    # Limit to MAX_ITEMS
    return items[:MAX_ITEMS]


def generate_rss(items: list[dict]) -> str:
    """Generate RSS 2.0 XML string from a list of feed items."""
    rss = ET.Element("rss", version="2.0")
    channel = ET.SubElement(rss, "channel")

    # Channel metadata
    ET.SubElement(channel, "title").text = "Life Long - Activity Feed"
    ET.SubElement(channel, "description").text = (
        "Activity feed for the Life Long project tracking system. "
        "Includes tasks, logs, and ideas."
    )
    ET.SubElement(channel, "link").text = SITE_URL
    ET.SubElement(channel, "language").text = "en-us"
    ET.SubElement(channel, "lastBuildDate").text = format_datetime(datetime.now().astimezone())
    ET.SubElement(channel, "generator").text = "Life Long RSS Generator"

    for item_data in items:
        item = ET.SubElement(channel, "item")
        ET.SubElement(item, "title").text = item_data["title"]
        ET.SubElement(item, "description").text = item_data["description"]
        ET.SubElement(item, "link").text = item_data["link"]
        ET.SubElement(item, "guid", isPermaLink="false").text = item_data["guid"]
        if item_data["date"] != datetime.min:
            ET.SubElement(item, "pubDate").text = format_datetime(
                item_data["date"].astimezone() if item_data["date"].tzinfo else
                item_data["date"].replace(
                    hour=12  # noon default for date-only entries
                ).astimezone()
            )

    # Build the XML string with declaration
    tree = ET.ElementTree(rss)
    ET.indent(tree, space="  ")

    # Write to a string
    import io
    buf = io.BytesIO()
    tree.write(buf, encoding="utf-8", xml_declaration=True)
    return buf.getvalue().decode("utf-8")


def main():
    if not DATA_FILE.exists():
        print("No data/index.json found. Run aggregate.py first.")
        return

    data = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    items = build_feed_items(data)

    if not items:
        print("No items to include in the feed.")
        return

    xml_content = generate_rss(items)
    OUTPUT_FILE.write_text(xml_content, encoding="utf-8")
    print(f"Generated {OUTPUT_FILE} with {len(items)} items.")


if __name__ == "__main__":
    main()
