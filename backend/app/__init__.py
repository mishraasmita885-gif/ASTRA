# ASTRA Backend Application Package
import sys
from pathlib import Path

# Ensure root workspace is on sys.path so 'backend.app...' is always importable
_ROOT_DIR = str(Path(__file__).resolve().parents[2])
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)
