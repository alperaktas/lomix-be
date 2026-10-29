"use client";

import { useEffect, useState } from 'react';

const SELECT_CLASS = "flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-950";

/** Rol seçimi; seçenekler `roles` tablosundan (GET /api/roles) gelir. Kullanıcının mevcut rolü tabloda yoksa da listede kalır. */
export function RoleSelect({ value, onChange }: { value: string; onChange: (role: string) => void }) {
    const [roles, setRoles] = useState<string[]>([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/roles', { headers: { Authorization: 'Bearer ' + token } })
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((rows: { name: string }[]) => setRoles(rows.map(r => r.name)))
            .catch(() => setRoles([]));
    }, []);

    const options = value && !roles.includes(value) ? [value, ...roles] : roles;

    return (
        <select className={SELECT_CLASS} value={value} onChange={e => onChange(e.target.value)}>
            {options.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
    );
}
