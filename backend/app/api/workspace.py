"""Workspace file management API."""

import os
import shutil

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


class FileRequest(BaseModel):
    path: str


class CreateRequest(BaseModel):
    path: str
    type: str  # "file" or "folder"


class RenameRequest(BaseModel):
    path: str
    newName: str


class WriteFileRequest(BaseModel):
    path: str
    content: str


def scan_directory(path: str) -> list:
    """Recursively scan a directory and return file tree."""
    items = []
    try:
        for entry in os.scandir(path):
            item = {
                "name": entry.name,
                "path": entry.path.replace("\\", "/"),
                "type": "folder" if entry.is_dir() else "file",
            }
            if entry.is_dir():
                item["children"] = scan_directory(entry.path)
            items.append(item)
    except PermissionError:
        pass
    except OSError:
        pass
    items.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
    return items


@router.post("/pick-folder")
async def pick_folder():
    """Open a native folder picker dialog."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder = filedialog.askdirectory(title="Select Project Folder")
        root.destroy()
        if folder:
            return {"path": folder.replace("\\", "/")}
        return {"path": None}
    except Exception:
        return {"path": None}


@router.post("/scan")
async def scan_folder(req: FileRequest):
    """Scan a folder and return its file tree."""
    if not os.path.isdir(req.path):
        raise HTTPException(status_code=400, detail="Path is not a directory")
    files = scan_directory(req.path)
    return {"files": files}


@router.post("/read-file")
async def read_file(req: FileRequest):
    """Read file contents."""
    if not os.path.isfile(req.path):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(req.path, encoding="utf-8", errors="replace") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write-file")
async def write_file(req: WriteFileRequest):
    """Write content to a file."""
    try:
        os.makedirs(os.path.dirname(req.path), exist_ok=True)
        with open(req.path, "w", encoding="utf-8") as f:
            f.write(req.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create")
async def create_item(req: CreateRequest):
    """Create a file or folder."""
    try:
        if req.type == "folder":
            os.makedirs(req.path, exist_ok=True)
        else:
            os.makedirs(os.path.dirname(req.path), exist_ok=True)
            if not os.path.exists(req.path):
                with open(req.path, "w", encoding="utf-8") as f:
                    f.write("")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_item(req: FileRequest):
    """Delete a file or folder."""
    try:
        if os.path.isdir(req.path):
            shutil.rmtree(req.path)
        elif os.path.isfile(req.path):
            os.remove(req.path)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_item(req: RenameRequest):
    """Rename a file or folder."""
    try:
        parent = os.path.dirname(req.path)
        new_path = os.path.join(parent, req.newName)
        os.rename(req.path, new_path)
        return {"status": "success", "new_path": new_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
