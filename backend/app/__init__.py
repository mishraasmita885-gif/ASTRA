# ASTRA Backend Application Package
import sys
from pathlib import Path

# Ensure backend and root workspace are on sys.path
_BACKEND_DIR = str(Path(__file__).resolve().parents[1])
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

_ROOT_DIR = str(Path(__file__).resolve().parents[2])
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)
