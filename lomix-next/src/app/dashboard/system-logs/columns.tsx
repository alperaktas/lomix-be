"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type Log = {
  id: string
  createdAt: string
  action: string
  ipAddress: string
  userAgent: string
  user?: {
    username: string
    email: string
  }
}

export const columns: ColumnDef<Log>[] = [
  {
    accessorKey: "createdAt",
    header: "Tarih",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      )
    },
  },
  {
    accessorKey: "user",
    header: "Kullanıcı",
    cell: ({ row }) => {
      const user = row.original.user
      return (
        <div>
          <div className="font-medium">{user?.username || 'Sistem'}</div>
          {user?.email && (
            <div className="text-xs text-muted-foreground">{user.email}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "action",
    header: "İşlem",
    cell: ({ row }) => {
      const action = (row.getValue("action") as string).toUpperCase()
      if (action.includes('LOGIN')) {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Giriş</Badge>
      }
      if (action.includes('DELETE')) {
        return <Badge variant="destructive">Silme</Badge>
      }
      if (action.includes('UPDATE')) {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Güncelleme</Badge>
      }
      return <Badge variant="secondary">{row.getValue("action")}</Badge>
    },
  },
  {
    accessorKey: "ipAddress",
    header: "IP Adresi",
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
        {row.getValue("ipAddress") || '—'}
      </code>
    ),
  },
  {
    accessorKey: "userAgent",
    header: "Cihaz",
    cell: ({ row }) => {
      const ua = row.getValue("userAgent") as string
      return (
        <span className="text-xs text-muted-foreground truncate block max-w-[250px]" title={ua}>
          {ua || 'Bilinmiyor'}
        </span>
      )
    },
  },
]
