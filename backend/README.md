# ASTRA Mission Control Backend

High-performance real-time telemetry streaming, NASA P-3 change detection, and Gemini-assisted reasoning engine.

## Quick Start with `uv`

### 1. Install dependencies and sync virtual environment:
```bash
uv sync
```

### 2. Run the FastAPI backend server:
```bash
uv run uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Or use the direct console script:
```bash
uv run astra-server
```

### 3. Run all test suites:
```bash
uv run pytest tests -v
```
