#!/usr/bin/env python
"""
Uvicorn Server Startup Script
Uses Python API instead of command line to avoid Windows path parsing issues.
"""

import asyncio
import os
from pathlib import Path
import sys

# Windows: uvicorn defaults to SelectorEventLoop which does not support
# asyncio.create_subprocess_exec.  Switch to ProactorEventLoop so that
# child-process APIs (used by Math Animator renderer, etc.) work correctly.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn

# Force unbuffered output
os.environ["PYTHONUNBUFFERED"] = "1"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True, errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(line_buffering=True, errors="replace")


def main() -> None:
    # Get project root directory
    project_root = Path(__file__).parent.parent.parent

    # Change to project root to ensure correct module imports
    os.chdir(str(project_root))

    # Ensure project root is in Python path
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    # Get port from configuration
    from deeptutor.services.setup import get_backend_port

    backend_port = get_backend_port(project_root)

    # Use relative paths — uvicorn 0.46 + Python 3.12 raise NotImplementedError
    # on Path.glob() with absolute patterns. os.chdir(project_root) above means
    # relative names resolve against the right tree.
    reload_excludes = [
        "venv",
        ".venv",
        "data",
        "node_modules",
        "web/node_modules",
        "web/.next",
        ".git",
        "scripts",
    ]
    reload_excludes = [d for d in reload_excludes if (project_root / d).exists()]

    # Start uvicorn server with reload enabled
    uvicorn.run(
        "deeptutor.api.main:app",
        host="0.0.0.0",
        port=backend_port,
        reload=True,
        reload_excludes=reload_excludes,
        log_level="info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
