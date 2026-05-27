# sqlalchemy-studio

Full-stack tools for exploring SQLAlchemy databases.

This repository contains two main parts:

- `sqlalchemy-studio-backend`: a small FastAPI-based server (`Studio`) that inspects
	databases and exposes a simple API under `/api`.
- `sqlalchemy-studio-front`: a Vite + React single-page app used to browse tables and
	interact with the backend API.

Quickstart (development)

1. Backend (start the Studio on a port):

```py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from db.main import Studio

Base = declarative_base()
engine = create_engine("sqlite:///test.db")

studio = Studio(engine, Base)
studio.run(port=9000)
```

2. Frontend (dev server with proxy - recommended while developing):

```bash
cd sqlalchemy-studio-front
npm install
# configure proxy in vite.config.ts to target backend port (example: 9000)
npm run dev
```

Build & serve (production-like)

1. Build the frontend:

```bash
npm --prefix sqlalchemy-studio-front install
npm --prefix sqlalchemy-studio-front run build
```

2. Copy the `dist` output into the backend `static` folder and run the backend:

```bash
rm -rf sqlalchemy-studio-backend/static
mkdir -p sqlalchemy-studio-backend/static
cp -r sqlalchemy-studio-front/dist/* sqlalchemy-studio-backend/static/
python -m test-db.main  # or use your application's entrypoint
```

Notes

- API paths are mounted under `/api` to avoid SPA routing conflicts. When the backend
	serves the built SPA the frontend can use relative paths like `/api/tables`.
- To build the frontend pointing at a different backend port, set `VITE_API_URL` at build
	time: `VITE_API_URL=http://localhost:9000 npm run build`.
- See `sqlalchemy-studio-backend/README.md` for package publishing and packaging notes.

Contributing

PRs welcome. Please add tests and update README where applicable.

License

MIT — update as appropriate.
