# sqlalchemy-studio-backend

Backend utilities for inspecting and serving database tables via a FastAPI `Studio`.

## Install

After publishing to PyPI, users can install with:

```
pip install sqlalchemy-studio-backend
```

Or install directly from GitHub (for testing):

```
pip install git+https://github.com/yourusername/sqlalchemy-studio.git@main#subdirectory=sqlalchemy-studio-backend
```

## Quickstart

```py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from db.main import Studio

Base = declarative_base()
engine = create_engine("sqlite:///test.db")

studio = Studio(engine, Base)
studio.run(port=9000)
```

## Usage on GitHub and PyPI

- Put a clear `README.md` (this file) at the package root — PyPI will show it on the project page.
- Use semantic version tags (e.g. `v0.1.0`) when creating releases on GitHub.
- Configure a GitHub Actions workflow to build and publish the package when a tag is pushed.

## Publishing

1. Build the distribution:

```bash
python -m pip install --upgrade build twine
python -m build
```

2. Upload to PyPI (preferred) or TestPyPI for testing:

```bash
# set PYPI_API_TOKEN in CI or locally
python -m twine upload dist/*
```

See the GitHub Actions workflow in `.github/workflows/publish.yml` for an automated example.

## License
MIT — update as appropriate.
