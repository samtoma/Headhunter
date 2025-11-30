import os
import re
import sys
import subprocess
import httpx
from pathlib import Path

# Try to load .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
# Configuration
# In CI, we expect the script to run from repo root, so task.md is at root or specific path
# Adjust this path to match where task.md lives in the repo
TASK_FILE = Path(os.getenv("TASK_FILE_PATH", "task.md"))
GITHUB_API = "https://api.github.com"
TOKEN = os.getenv("GITHUB_TOKEN")

def clean_repo_name(repo):
    """Clean repository name to ensure it's just 'owner/repo'."""
    if not repo:
        return None
    repo = repo.strip()
    # Remove https://github.com/ or http://github.com/
    repo = re.sub(r'^https?://github\.com/', '', repo)
    # Remove git@github.com:
    repo = re.sub(r'^git@github\.com:', '', repo)
    # Remove .git suffix
    if repo.endswith('.git'):
        repo = repo[:-4]
    return repo

def get_repo_nwo():
    """Get 'owner/repo' from git remote."""
    repo = None
    try:
        url = subprocess.check_output(["git", "config", "--get", "remote.origin.url"]).decode().strip()
        repo = clean_repo_name(url)
    except Exception:
        pass
        
    if not repo:
        repo = clean_repo_name(os.getenv("GITHUB_REPOSITORY"))
        
    return repo

def parse_tasks(content):
    """Parse tasks from markdown content."""
    tasks = []
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Match - [ ] or - [/] or - [x]
        match = re.match(r'^\s*-\s*\[([ x/])\]\s*(.*?)(?:\s*<!--.*-->)?$', line)
        if match:
            status_char = match.group(1)
            text = match.group(2).strip()
            
            # Extract GH ID if present
            gh_match = re.search(r'<!--\s*gh:\s*(\d+)\s*-->', line)
            gh_id = gh_match.group(1) if gh_match else None
            
            tasks.append({
                "line_index": i,
                "status": status_char,
                "text": text,
                "gh_id": gh_id,
                "raw": line
            })
    return tasks

def get_headers():
    if not TOKEN:
        return None
    return {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json"
    }

def create_issue(repo, title, body=""):
    headers = get_headers()
    if not headers:
        print("Error: GITHUB_TOKEN not set.")
        return None
        
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

def update_issue_status(repo, issue_number, state):
    """Update the state of an issue (open/closed)."""
    headers = get_headers()
    if not headers:
        return False
        
    url = f"{GITHUB_API}/repos/{repo}/issues/{issue_number}"
    data = {"state": state}
    
    try:
        resp = httpx.patch(url, json=data, headers=headers)
        if resp.status_code == 200:
            return True
        else:
            print(f"Failed to update issue #{issue_number}: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        print(f"Error updating issue #{issue_number}: {e}")
        return False

def get_issue_state(repo, issue_number):
    """Get the current state of an issue."""
    headers = get_headers()
    if not headers:
        return None
        
    url = f"{GITHUB_API}/repos/{repo}/issues/{issue_number}"
    try:
        resp = httpx.get(url, headers=headers)
        if resp.status_code == 200:
            return resp.json().get("state")
        return None
    except Exception:
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
    
    is_dry_run = "--run" not in sys.argv
    
    for task in tasks:
        # 1. Create if missing
        if not task["gh_id"]:
            print(f"Creating issue for: {task['text']}")
            if is_dry_run:
                print("  [Dry Run] Would create issue.")
                continue
                
            issue = create_issue(repo, task["text"], f"Imported from local task list.\n\nStatus: {task['status']}")
            if issue:
                issue_number = issue["number"]
                print(f"  Created issue #{issue_number}")
                
                # Update line with GH ID
                # Append to existing comments or add new one
                if "<!--" in task["raw"]:
                    # Insert before the last -->
                    # This is a bit hacky, better to just append if not strictly parsing structure
                    # But let's just append for safety to avoid breaking existing IDs
                    new_line = f"{task['raw']} <!-- gh: {issue_number} -->"
                else:
                    new_line = f"{task['raw']} <!-- gh: {issue_number} -->"
                
                updated_lines[task["line_index"]] = new_line
                changes_made = True
        
        # 2. Update status if exists
        else:
            gh_id = task["gh_id"]
            local_done = task["status"] == "x"
            
            # We need to know current GH state to avoid unnecessary API calls
            # For dry run, we can't really know unless we query, but let's assume we want to sync state.
            # To save API calls, we could only update if we suspect a mismatch, but simpler is to just enforce local state.
            
            target_state = "closed" if local_done else "open"
            
            if is_dry_run:
                # In dry run, we don't query GH state to avoid spamming if we aren't going to fix it.
                # But to show intent:
                print(f"Checking task '{task['text']}' (GH #{gh_id}) -> Local: {task['status']}, Target: {target_state}")
                continue

            # Check current state to avoid redundant updates (optional but good)
            current_state = get_issue_state(repo, gh_id)
            if current_state and current_state != target_state:
                print(f"Updating issue #{gh_id} state to {target_state}")
                if update_issue_status(repo, gh_id, target_state):
                    print(f"  Updated #{gh_id}")
            
    if changes_made:
        TASK_FILE.write_text('\n'.join(updated_lines))
        print("Updated task.md with issue links.")
    else:
        print("No changes made to task.md.")

if __name__ == "__main__":
    main()
