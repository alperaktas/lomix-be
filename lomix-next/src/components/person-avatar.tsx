export type Person = { id: number; username: string; fullName: string | null; avatar: string | null };

export const personName = (p: Person) => p.fullName || p.username;

export function PersonAvatar({ person, className = 'h-8 w-8' }: { person: Person; className?: string }) {
    const base = `${className} rounded-full border bg-zinc-100 shrink-0`;
    return person.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.avatar} alt="" className={`${base} object-cover`} />
    ) : (
        <div className={`${base} flex items-center justify-center text-xs text-zinc-500`}>
            {personName(person).charAt(0).toUpperCase()}
        </div>
    );
}
