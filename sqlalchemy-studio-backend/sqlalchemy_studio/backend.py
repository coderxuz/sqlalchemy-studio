from fastapi import APIRouter, HTTPException, status

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from studio.Studio import Studio

from typing import Any, Literal, Self, TypedDict
from pydantic import BaseModel, Field

# Define acceptable operators matching your UI
OperatorType = Literal[
    "equals",
    "not_equals",
    "contains",
    "starts_with",
    "ends_with",
    "greater_than",
    "less_than",
    "greater_than_or_equals",
    "less_than_or_equals",
]
LinkType = Literal["and", "or"]


class FilterCondition(BaseModel):
    column: str
    operator: OperatorType
    value: Any
    link: LinkType = "and"  # Connects this condition to the previous one


class FilterRequest(BaseModel):
    limit: int = Field(default=10, ge=1)
    offset: int = Field(default=0, ge=0)
    filters: list[FilterCondition] = Field(default_factory=list)


def create_tables_router(studio: "Studio"):
    router = APIRouter()

    @router.get("/api/tables")
    def get_tables():
        return studio.show_tables()

    @router.get("/api/tables/{name}")
    def get_tables(name: str):
        return studio.show_table(name)

    @router.post("/api/{table_name}/query")
    async def query_table_rows(
        table_name: str,
        payload: FilterRequest
    ) -> Any:
        """
        Exposes advanced database table operations to handle compound UI filters.
        """
        try:
            # Assuming `studio` is accessible in your router scope
            return studio.get_rows_advanced(table_name, payload)
        except HTTPException as e:
            raise e
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Query builder failed: {str(e)}"
            )
    return router
