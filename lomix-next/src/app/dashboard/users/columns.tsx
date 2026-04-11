"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  ShieldCheck, 
  User as UserIcon,
  ShieldAlert
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type User = {
  id: number
  username: string
  email: string
  role: string
  status: string
  createdAt: string
}

interface ColumnsProps {
  onEdit: (user: User) => void
  onDelete: (id: number) => void
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<User>[] => [
  {
    accessorKey: "username",
    header: "Kullanıcı",
    cell: ({ row }) => {
      const user = row.original
      const role = user.role.toLowerCase()
      
      return (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shadow-sm shrink-0">
            {role === 'admin' ? (
              <ShieldCheck className="h-4 w-4 text-rose-600" />
            ) : role === 'moderator' ? (
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            ) : (
              <UserIcon className="h-4 w-4 text-zinc-500" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-zinc-900 text-sm truncate">{user.username}</span>
            <span className="text-[11px] text-zinc-400 truncate">{user.email}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const roleLower = role.toLowerCase()
      
      return (
        <Badge 
          variant="outline" 
          className={
            roleLower === 'admin' 
              ? "bg-rose-50 text-rose-700 border-rose-200 font-bold" 
              : roleLower === 'moderator'
              ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
              : "bg-blue-50 text-blue-700 border-blue-200 font-bold"
          }
        >
          {role.toUpperCase()}
        </Badge>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => {
      const status = (row.getValue("status") || 'active') as string
      const statusLower = status.toLowerCase()
      
      return (
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${
            statusLower === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
            statusLower === 'pending' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
            'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
          }`} />
          <span className="text-xs font-semibold text-zinc-600 capitalize">
            {statusLower === 'active' ? 'Aktif' : statusLower === 'pending' ? 'Bekliyor' : 'Askıda'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Kayıt Tarihi",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return (
        <span className="text-xs text-zinc-500 font-medium">
          {date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-zinc-100 rounded-full">
              <span className="sr-only">Menüyü aç</span>
              <MoreHorizontal className="h-4 w-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuLabel className="text-xs text-zinc-400 font-normal">İşlemler</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onEdit(user)}
              className="cursor-pointer gap-2 text-sm"
            >
              <Pencil className="h-3.5 w-3.5" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(user.id)}
              className="cursor-pointer gap-2 text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
