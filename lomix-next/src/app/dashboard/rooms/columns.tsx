"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import {
    Pencil,
    Trash2,
    ExternalLink,
    Radio,
    Lock,
    Crown,
    XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export type Room = {
    id: number
    roomId: string
    name: string
    type: string
    isLive: boolean
    isClosed: boolean
    isVip: boolean
    isLocked: boolean
    micCount: number
    viewerCount: number
    createdAt: string
    owner: { id: number; username: string; avatar: string | null }
    _count: { participants: number; reports: number }
}

interface ColumnsProps {
    onEdit: (room: Room) => void
    onDelete: (id: number) => void
    onDetail: (id: number) => void
    onClose: (id: number) => void
}

export const getColumns = ({ onEdit, onDelete, onDetail, onClose }: ColumnsProps): ColumnDef<Room>[] => [
    {
        accessorKey: "name",
        header: "Oda",
        cell: ({ row }) => {
            const room = row.original
            return (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shrink-0">
                        <Radio className="h-4 w-4 text-zinc-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 text-sm truncate">{room.name}</span>
                            {room.isVip && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                            {room.isLocked && <Lock className="h-3 w-3 text-zinc-400 shrink-0" />}
                        </div>
                        <span className="text-[11px] text-zinc-400">{room.roomId} · {room.owner.username}</span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "type",
        header: "Tür",
        cell: ({ row }) => {
            const type = row.getValue("type") as string
            return (
                <Badge variant="outline" className={
                    type === 'video'
                        ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                        : "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                }>
                    {type === 'video' ? 'Video' : 'Sesli'}
                </Badge>
            )
        },
    },
    {
        accessorKey: "isLive",
        header: "Durum",
        cell: ({ row }) => {
            const room = row.original
            if (room.isClosed) return (
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-500">Kapalı</span>
                </div>
            )
            return (
                <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-1.5 rounded-full ${room.isLive
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : 'bg-zinc-300'}`} />
                    <span className={`text-xs font-semibold ${room.isLive ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {room.isLive ? 'Canlı' : 'Çevrimdışı'}
                    </span>
                </div>
            )
        },
    },
    {
        accessorKey: "_count",
        header: "Katılımcı",
        cell: ({ row }) => {
            const room = row.original
            return (
                <div className="flex items-center gap-3 text-xs text-zinc-600">
                    <span className="font-semibold">{room._count.participants}</span>
                    {room._count.reports > 0 && (
                        <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[10px] px-1.5">
                            {room._count.reports} rapor
                        </Badge>
                    )}
                </div>
            )
        },
    },
    {
        accessorKey: "micCount",
        header: "Mik",
        cell: ({ row }) => (
            <span className="text-xs text-zinc-500 font-medium">{row.getValue("micCount")}</span>
        ),
    },
    {
        accessorKey: "createdAt",
        header: "Oluşturulma",
        cell: ({ row }) => {
            const date = new Date(row.getValue("createdAt"))
            return (
                <span className="text-xs text-zinc-500 font-medium">
                    {date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
            )
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const room = row.original
            return (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600 hover:text-zinc-900" onClick={() => onDetail(room.id)}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Detay
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-zinc-600 hover:text-zinc-900" onClick={() => onEdit(room)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Düzenle
                    </Button>
                    {room.isLive && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => onClose(room.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Kapat
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => onDelete(room.id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                    </Button>
                </div>
            )
        },
    },
]
