.PHONY: setup dev check test lint version-check deploy-check

setup:
	uv sync

dev:
	uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

deploy-check:
	uv run python scripts/verify_deploy.py

check: version-check lint test deploy-check
	uv run python -m compileall app
	@for file in app/web/*.js; do node --check "$$file"; done
	node --test "tests/js/*.test.js"

test:
	uv run pytest

lint:
	uv run ruff check app tests scripts

version-check:
	uv run python scripts/check_versions.py
