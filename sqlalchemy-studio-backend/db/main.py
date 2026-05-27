from sqlalchemy import and_, create_engine, func, inspect, Engine, or_, select, Table
from sqlalchemy.engine.interfaces import ReflectedColumn
from sqlalchemy.orm import DeclarativeBase
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn


from backend.main import create_tables_router

from typing import Self, TypedDict, Any, cast, TYPE_CHECKING

if TYPE_CHECKING:
    from backend.main import FilterRequest

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


class GetRowsResponse(TypedDict):
    rows: list[dict[str, Any]]
    total_count: int


class Studio:
    def __init__(self: Self, engine: Engine, base: DeclarativeBase) -> None:
        self.engine = engine
        self.inspector = inspect(self.engine)
        self.app = FastAPI()
        self._register_routes()
        # Serve built frontend from the `static` directory at the project root.
        # Keep this catch-all mount after API routes so `/api/*` resolves first.
        
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
        self.app.mount("/", StaticFiles(directory="static", html=True), name="static")

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

    def get_rows_advanced(
        self: Self, table_name: str, payload: "FilterRequest"
    ) -> GetRowsResponse:
        """
        Advanced filtering using logical operator trees matching custom UI filters.
        """
        if not self.inspector.has_table(table_name):
            raise HTTPException(
                status_code=404, detail=f"Table '{table_name}' not found."
            )

        table = Table(
            table_name,
            self.base.metadata,
            autoload_with=self.engine,
            extend_existing=True,
        )

        rows_query = select(table)
        count_query = select(func.count()).select_from(table)

        # Build dynamic expressions clauses
        if payload.filters:
            conditions = []

            for cond in payload.filters:
                if cond.column not in table.c:
                    continue  # Guard against non-existent columns safely

                col = table.c[cond.column]
                val = cond.value

                # Map string operators to SQLAlchemy expressions
                if cond.operator == "equals":
                    expr = col == val
                elif cond.operator == "not_equals":
                    expr = col != val
                elif cond.operator == "contains":
                    expr = col.ilike(f"%{val}%")
                elif cond.operator == "starts_with":
                    expr = col.ilike(f"{val}%")
                elif cond.operator == "ends_with":
                    expr = col.ilike(f"%{val}")
                elif cond.operator == "greater_than":
                    expr = col > val
                elif cond.operator == "less_than":
                    expr = col < val
                elif cond.operator == "greater_than_or_equals":
                    expr = col >= val
                elif cond.operator == "less_than_or_equals":
                    expr = col <= val
                else:
                    continue

                # Combine them based on the link field ('and' / 'or')
                if not conditions:
                    conditions.append(expr)
                else:
                    if cond.link == "or":
                        # Merge last expression with current one via OR
                        prev_expr = conditions.pop()
                        conditions.append(or_(prev_expr, expr))
                    else:
                        # Default to AND chaining
                        prev_expr = conditions.pop()
                        conditions.append(and_(prev_expr, expr))

            if conditions:
                rows_query = rows_query.where(*conditions)
                count_query = count_query.where(*conditions)

        # Apply Pagination
        rows_query = rows_query.limit(payload.limit).offset(payload.offset)

        # Execute
        with self.engine.connect() as connection:
            total = int(connection.execute(count_query).scalar_one())
            result = connection.execute(rows_query)
            rows = [dict(row) for row in result.mappings()]

        return {"rows": rows, "total_count": total}
