.PHONY: setup dev check test lint version-check

setup:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

check: version-check lint test
	uv run python -m compileall app
	node --check app/web/core.js app/web/render.js app/web/api.js app/web/interactions.js app/web/bootstrap.js app/web/mobile.js app/web/sw.js

test:
	uv run pytest

lint:
	uv run ruff check app tests scripts

version-check:
	uv run python scripts/check_versions.py
