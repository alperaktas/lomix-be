"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type Endpoint = {
  id: string
  method: string
  path: string
  category: string
  description: string
}

const getMethodBadge = (method: string) => {
  const m = method.toUpperCase()
  switch (m) {
    case 'GET':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">GET</Badge>
    case 'POST':
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">POST</Badge>
    case 'PUT':
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">PUT</Badge>
    case 'DELETE':
      return <Badge variant="destructive">DELETE</Badge>
    default:
      return <Badge variant="secondary">{m}</Badge>
  }
}

export const columns: ColumnDef<Endpoint>[] = [
  {
    accessorKey: "method",
    header: "Metot",
    cell: ({ row }) => getMethodBadge(row.getValue("method")),
  },
  {
    accessorKey: "path",
    header: "Yol (Path)",
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-zinc-600">
        {row.getValue("path")}
      </code>
    ),
  },
  {
    accessorKey: "category",
    header: "Kategori",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-zinc-500">
        {row.getValue("category")}
      </span>
    ),
  },
  {
    accessorKey: "description",
    header: "Açıklama",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground italic">
        {row.getValue("description")}
      </span>
    ),
  },
]
