import os
import re
import sys
import subprocess
import httpx
from pathlib import Path

# Configuration
# Configuration
# In CI, we expect the script to run from repo root, so task.md is at root or specific path
# Adjust this path to match where task.md lives in the repo
TASK_FILE = Path(os.getenv("TASK_FILE_PATH", "task.md"))
GITHUB_API = "https://api.github.com"
TOKEN = os.getenv("GITHUB_TOKEN")

def get_repo_nwo():
    """Get 'owner/repo' from git remote."""
    try:
        url = subprocess.check_output(["git", "config", "--get", "remote.origin.url"]).decode().strip()
        # Handle SSH and HTTPS URLs
        if "github.com" in url:
            if url.startswith("git@"):
                return url.split(":")[1].replace(".git", "")
            elif url.startswith("https://"):
                return url.split("github.com/")[1].replace(".git", "")
    except Exception:
        pass
    return os.getenv("GITHUB_REPOSITORY") # Fallback to env var

def parse_tasks(content):
    """Parse tasks from markdown content."""
    tasks = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Match - [ ] or - [/] or - [x]
        match = re.match(r'^\s*-\s*\[([ x/])\]\s*(.*?)(\s*<!--\s*id:\s*(\d+)\s*-->)?$', line)
        if match:
            status_char = match.group(1)
            text = match.group(2).strip()
            existing_id = match.group(4)
            
            # Check if already synced (look for #123 pattern or similar, but simplified for now)
            # We'll use the <!-- id: X --> as a local ID, but we want to map it to a GH issue.
            # For now, let's just create issues for tasks that don't look like they have a GH link.
            
            tasks.append({
                "line_index": i,
                "status": status_char,
                "text": text,
                "local_id": existing_id,
                "raw": line
            })
    return tasks

def create_issue(repo, title, body=""):
    if not TOKEN:
        print("Error: GITHUB_TOKEN not set.")
        return None
        
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }
    url = f"{GITHUB_API}/repos/{repo}/issues"
    data = {
        "title": title,
        "body": body,
        "labels": ["task"]
    }
    
    try:
        resp = httpx.post(url, json=data, headers=headers)
        if resp.status_code == 201:
            return resp.json()
        else:
            print(f"Failed to create issue: {resp.status_code} {resp.text}")
            return None
    except Exception as e:
        print(f"Error connecting to GitHub: {e}")
        return None

def main():
    if not TASK_FILE.exists():
        print(f"Task file not found: {TASK_FILE}")
        return

    repo = get_repo_nwo()
    if not repo:
        print("Could not determine GitHub repository (owner/repo). Set GITHUB_REPOSITORY or configure git remote.")
        return

    print(f"Syncing to {repo}...")
    
    content = TASK_FILE.read_text()
    tasks = parse_tasks(content)
    
    updated_lines = content.split('\n')
    changes_made = False
    
    for task in tasks:
        # Simple logic: If it doesn't have a GH link (e.g. #123), create one.
        # But wait, we don't want to duplicate.
        # Let's assume if it has <!-- gh: 123 --> it's synced.
        
        if "<!-- gh:" in task["raw"]:
            continue
            
        # Create issue
        print(f"Creating issue for: {task['text']}")
        # In a real scenario, we might want to prompt or be careful.
        # For this tool, we'll do dry run by default unless --run is passed
        if "--run" not in sys.argv:
            print("  [Dry Run] Would create issue.")
            continue
            
        issue = create_issue(repo, task["text"], f"Imported from local task list.\n\nStatus: {task['status']}")
        if issue:
            issue_number = issue["number"]
            print(f"  Created issue #{issue_number}")
            
            # Update line with GH ID
            new_line = f"{task['raw']} <!-- gh: {issue_number} -->"
            updated_lines[task["line_index"]] = new_line
            changes_made = True
            
    if changes_made:
        TASK_FILE.write_text('\n'.join(updated_lines))
        print("Updated task.md with issue links.")
    else:
        print("No changes made to task.md.")

if __name__ == "__main__":
    main()
