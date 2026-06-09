"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export type Role = {
  id: number
  name: string
}

interface ColumnsProps {
  onEdit: (role: Role) => void
  onDelete: (id: number) => void
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Role>[] => [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="text-xs text-zinc-400 font-mono">#{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Rol Adı",
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      const nameLower = name.toLowerCase()

      return (
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            nameLower === 'admin'
              ? 'bg-rose-50 border border-rose-200'
              : nameLower === 'moderator'
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <Shield className={`h-3.5 w-3.5 ${
              nameLower === 'admin' ? 'text-rose-600' : nameLower === 'moderator' ? 'text-amber-600' : 'text-blue-600'
            }`} />
          </div>
          <Badge
            variant="outline"
            className={`font-bold text-xs ${
              nameLower === 'admin'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : nameLower === 'moderator'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {name}
          </Badge>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const role = row.original

      return (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600 hover:text-zinc-900" onClick={() => onEdit(role)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(role.id)}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
          </Button>
        </div>
      )
    },
  },
]
