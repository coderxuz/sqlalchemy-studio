// src/routes/tables.$tableName.tsx
import { Tables } from '#/components/Tables'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tables/$tableName')({
    component: TablePage,
})

function TablePage() {
    const { tableName } = Route.useParams()

    return (
        <Tables tableName={tableName} />
    )
}