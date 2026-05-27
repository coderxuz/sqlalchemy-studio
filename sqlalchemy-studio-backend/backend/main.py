from fastapi import APIRouter

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from db.main import Studio


def create_tables_router(studio: "Studio"):
    router = APIRouter()

    @router.get("/tables")
    def get_tables():
        return studio.show_tables()

    @router.get("/tables/{name}")
    def get_tables(name: str):
        return studio.show_table(name)

    @router.get("/tables/{name}/rows")
    def get_tables(name: str, limit: int = 10):
        return studio.get_rows(table_name=name, limit=limit)

    return router
