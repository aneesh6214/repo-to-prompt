# Filename: my-github-explorer/backend/main.py

import os
import urllib.parse
import os.path
import requests
import tiktoken

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Tuple

from dotenv import load_dotenv

load_dotenv()

#############################
#  1) FastAPI Initialization
#############################
app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # or specify your frontend URL, e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#############################
#  2) Pydantic Models
#############################
class FetchRepoRequest(BaseModel):
    repoUrl: str
    filterMode: Optional[str] = "whitelist"  # "whitelist" or "blacklist"
    filterExtensions: Optional[str] = ""


#############################
#  3) Recursive Fetch Logic
#############################
def fetch_repo_contents(api_url: str, headers: dict) -> List[Tuple[str, str]]:
    """
    Recursively fetch the GitHub repo contents via the GitHub API.
    Returns a list of (file_path, file_content).
    """
    response = requests.get(api_url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch from GitHub API.")

    data = response.json()
    if not isinstance(data, list):
        # If it's not a list, it's often a single file or an error
        raise HTTPException(status_code=500, detail="Unexpected API response format. Expected a list.")

    all_files = []
    for item in data:
        if item.get("type") == "file":
            file_url = item.get("download_url")
            file_path = item.get("path", "")
            file_resp = requests.get(file_url, headers=headers)
            if file_resp.status_code != 200:
                raise HTTPException(status_code=file_resp.status_code, detail=f"Failed to fetch file: {file_path}")
            content = file_resp.text
            all_files.append((file_path, content))

        elif item.get("type") == "dir":
            sub_files = fetch_repo_contents(item["url"], headers)
            all_files.extend(sub_files)
    return all_files


#############################
#  4) Directory Structure
#############################
def generate_directory_structure(files: List[Tuple[str, str]]) -> str:
    """
    Build a hierarchical text representation of the directory structure,
    similar to the Node.js version using path separators.
    """
    # Step A: Build a nested dict (tree)
    tree = {}

    for file_path, _ in files:
        # GitHub returns forward slashes in paths; let's split on "/"
        parts = file_path.split("/")
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {}
            current = current[part]

    # Step B: Recursively format the tree as lines
    def format_tree(structure: dict, prefix: str = "") -> List[str]:
        lines = []
        entries = sorted(structure.keys())
        for index, key in enumerate(entries):
            is_last = (index == len(entries) - 1)
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{key}")
            extension = "    " if is_last else "│   "
            if structure[key]:
                lines.extend(format_tree(structure[key], prefix + extension))
        return lines

    lines = format_tree(tree)
    return "\n".join(lines)


#############################
#  5) Main Endpoint (POST)
#############################
@app.post("/fetchRepo")
def fetch_repo(data: FetchRepoRequest):
    """
    POST /fetchRepo
    Body: { repoUrl, filterMode, filterExtensions }
    1) Validate & parse the GitHub URL
    2) Recursively fetch all files
    3) Filter them by extension (whitelist or blacklist) if needed
    4) Generate the combined repoContents and directoryStructure strings
    5) Estimate tokens using tiktoken
    6) Return JSON
    """
    repo_url = data.repoUrl
    filter_mode = data.filterMode.lower().strip() if data.filterMode else "whitelist"
    filter_extensions = data.filterExtensions.strip()

    if not repo_url:
        raise HTTPException(status_code=400, detail="Repository URL is required.")

    # Parse the GitHub URL for owner & repo
    parsed = urllib.parse.urlparse(repo_url)
    path_parts = parsed.path.strip("/").split("/")
    if len(path_parts) < 2: 
        raise HTTPException(status_code=400, detail="Invalid GitHub repository URL.")

    owner = path_parts[0]
    repo = path_parts[1]
    api_url = f"https://api.github.com/repos/{owner}/{repo}/contents"

    # Prepare headers (uses environment variable 'GITHUB_TOKEN')
    github_token = os.environ.get("GITHUB_TOKEN", "")
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    try:
        # 1) Fetch all files
        all_files = fetch_repo_contents(api_url, headers)

        # 2) Filter by extension if needed
        if filter_extensions:
            exts = [e.strip().lower() for e in filter_extensions.split(",") if e.strip()]
            if filter_mode == "whitelist":
                filtered = []
                for (fpath, fcontent) in all_files:
                    ext = os.path.splitext(fpath)[1].lstrip(".").lower()
                    if ext in exts:
                        filtered.append((fpath, fcontent))
                all_files = filtered

            elif filter_mode == "blacklist":
                filtered = []
                for (fpath, fcontent) in all_files:
                    ext = os.path.splitext(fpath)[1].lstrip(".").lower()
                    if ext not in exts:
                        filtered.append((fpath, fcontent))
                all_files = filtered

        if not all_files:
            raise HTTPException(status_code=404, detail="No files found or unable to fetch repository contents.")

        # 3) Generate repository contents string
        repo_contents = ""
        for (file_path, file_content) in all_files:
            repo_contents += f"====== File: {file_path} ======\n{file_content}\n\n"

        # 4) Generate directory structure string
        directory_structure = generate_directory_structure(all_files)

        # 5) Token Estimation via tiktoken (using the 'cl100k_base' encoder, typical for GPT-3.5 & GPT-4)
        encoding = tiktoken.get_encoding("cl100k_base")
        dir_tokens_count = len(encoding.encode(directory_structure))
        contents_tokens_count = len(encoding.encode(repo_contents))
        token_estimates = {
            "directoryTokens": dir_tokens_count,
            "contentTokens": contents_tokens_count,
        }

        # 6) Return JSON
        return {
            "directoryStructure": directory_structure,
            "repoContents": repo_contents,
            "tokenEstimates": token_estimates
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
