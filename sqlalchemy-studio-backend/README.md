# sqlalchemy-studio-backend

Backend utilities for inspecting and serving database tables via a FastAPI `Studio`.

This package exposes a small FastAPI app that can be embedded in your application or run
standalone to inspect a SQLAlchemy-accessible database.

Quick summary
- API endpoints (when using the packaged server):
	- `GET /api/tables` — list tables and columns
	- `GET /api/tables/{name}` — describe a single table
	- `POST /api/{table_name}/query` — run the UI's advanced query payload

Install

```
pip install sqlalchemy-studio-backend
```

Or install from the repository for development/testing:

```
pip install --upgrade git+https://github.com/yourusername/sqlalchemy-studio.git@main#subdirectory=sqlalchemy-studio-backend
```

Quickstart

```py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from db.main import Studio

Base = declarative_base()
engine = create_engine("sqlite:///test.db")

studio = Studio(engine, Base)
# Starts uvicorn and serves API under /api
studio.run(port=9000)
# API available at http://localhost:9000/api
```

Serving a built frontend (optional)

If you build the Vite frontend, copy its `dist` output into the backend `static` folder
and the backend will serve the SPA from `/` while keeping the API under `/api`.

Example:

```bash
# from repository root
npm --prefix sqlalchemy-studio-front install
npm --prefix sqlalchemy-studio-front run build
rm -rf sqlalchemy-studio-backend/static
mkdir -p sqlalchemy-studio-backend/static
cp -r sqlalchemy-studio-front/dist/* sqlalchemy-studio-backend/static/
```

Configuration notes
- By default the package mounts static files at `/` and prefixes API routes with `/api` to
	avoid SPA route collisions. Adjust `db/main.py` if you need a different layout.
- CORS: `Studio` registers a small set of development origins. When serving the SPA
	from the same server you won't need CORS; keep/update `Studio._set_cors` for other setups.

Publishing

1. Build the distribution locally:

```bash
python -m pip install --upgrade build twine
python -m build
```

2. Upload to PyPI (CI should set `PYPI_API_TOKEN`):

```bash
python -m twine upload dist/*
```

License
MIT — update as appropriate.
