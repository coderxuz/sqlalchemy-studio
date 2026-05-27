from sqlalchemy import create_engine, inspect, Engine, Table, select
from sqlalchemy.engine.interfaces import ReflectedColumn
from sqlalchemy.orm import DeclarativeBase
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.main import create_tables_router

from typing import Self, TypedDict, Any, cast

engine = create_engine("sqlite:///test.db")


class TablesType(TypedDict):
    table: str
    columns: list[dict]


class ColumnDetails(TypedDict):
    name: str
    type: str
    nullable: bool
    default: Any
    primary_key: bool


class SingleTableType(TypedDict):
    table: str
    primary_keys: list[str]
    columns: list[ColumnDetails]


class Studio:
    def __init__(self: Self, engine: Engine, base: DeclarativeBase) -> None:
        self.engine = engine
        self.inspector = inspect(self.engine)
        self.app = FastAPI()
        self._register_routes()
        self._set_cors()
        self.base = base

    def _set_cors(self):
        origins = [
            "http://localhost:5500",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:3000",
        ]
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _register_routes(self):
        self.app.include_router(create_tables_router(self))

    def run(self, port: int = 8000):
        uvicorn.run(self.app, host="0.0.0.0", port=port)

    def show_tables(self: Self) -> list[TablesType]:

        tables_list: list[TablesType] = []
        tables = self.inspector.get_table_names()
        for table in tables:
            tables_list.append(
                {
                    "table": table,
                    "columns": [
                        {
                            **c,
                            "type": str(c["type"]),
                        }
                        for c in self.inspector.get_columns(table)
                    ],
                }
            )
        return tables_list

    def show_table(self: Self, table_name: str) -> SingleTableType:
        """
        Returns the structural data (columns, types, primary keys)
        for a single specified table with strict typing for MyPy.
        """
        # 1. Check if the table exists
        if not self.inspector.has_table(table_name):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Table '{table_name}' not found.",
            )

        # 2. Reflect the table (keeps metadata clean/extended)
        Table(
            table_name,
            self.base.metadata,
            autoload_with=self.engine,
            extend_existing=True,
        )

        # 3. Extract primary key details safely
        pk_constraint = self.inspector.get_pk_constraint(table_name) or {}
        # MyPy needs to know this evaluates cleanly to a list of strings
        primary_keys = cast(list[str], pk_constraint.get("constrained_columns", []))

        # 4. Extract and type-cast column information
        columns_data: list[ColumnDetails] = []

        # self.inspector.get_columns returns a list of dictionaries
        raw_columns = self.inspector.get_columns(table_name)

        for col in raw_columns:
            columns_data.append(
                {
                    "name": cast(str, col["name"]),
                    "type": str(col["type"]),  # Stringify the type object for JSON
                    "nullable": bool(col["nullable"]),
                    "default": col.get("default"),
                    "primary_key": col.get("primary_key", 0) > 0,
                }
            )

        # 5. Construct the final strictly typed response
        response_data: SingleTableType = {
            "table": table_name,
            "primary_keys": primary_keys,
            "columns": columns_data,
        }

        return response_data

    def get_rows(self, table_name: str, limit: int = 10):
        """
        Checks if a table exists, fetches its rows up to the limit using
        SQLAlchemy Core expressions, and returns them as a list of dictionaries.
        """
        # 1. Check if the table exists
        if not self.inspector.has_table(table_name):
            raise HTTPException(
                status_code=404, detail=f"Table '{table_name}' not found."
            )

        # 2. Reflect the table dynamically from the database
        # 'autoload_with' reads the columns and types automatically from the DB
        table = Table(
            table_name,
            self.base.metadata,
            autoload_with=self.engine,
            extend_existing=True,
        )

        # 3. Construct the query purely in SQLAlchemy
        # This translates to: SELECT * FROM table_name LIMIT :limit
        query = select(table).limit(limit)

        # 4. Execute the query
        with self.engine.connect() as connection:
            result = connection.execute(query)
            rows = [dict(row) for row in result.mappings()]

        return rows
