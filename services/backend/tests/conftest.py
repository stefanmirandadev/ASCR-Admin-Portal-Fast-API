"""
Pytest configuration for backend tests.
Adds the backend directory to the Python path.
"""
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Also add project root for data_dictionaries imports
project_root = backend_dir.parent.parent
sys.path.insert(0, str(project_root))

import pytest
import json
import tempfile
import shutil
import os