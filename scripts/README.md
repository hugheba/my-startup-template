# scripts/

UV-managed Python project for ad-hoc scripts and custom MCP servers.

## Setup

```bash
cd scripts
uv sync
```

## Run a module

```bash
uv run python -m <module>
```

## Lint + test

```bash
uv run ruff check .
uv run pytest
```
