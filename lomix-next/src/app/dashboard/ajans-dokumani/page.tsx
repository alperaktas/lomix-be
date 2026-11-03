import fs from 'fs/promises';
import path from 'path';
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Kaynak döküman: proje kökündeki markdown dosyası. Düzenleyip yayınlamak yeterli, sayfa onu okur. */
const DOC_FILE = 'Lomix-mobil-endpointler-ajans.md';

const TR_LETTERS: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

/** Aynı başlık birden çok kez geçerse sonuna sayı ekleyen bağlantı kimliği üretici. */
function makeSlugger() {
    const seen = new Map<string, number>();
    return (text: string) => {
        const base = text.toLowerCase().replace(/[çğıöşü]/g, c => TR_LETTERS[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bolum';
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        return n === 0 ? base : `${base}-${n}`;
    };
}

function textOf(node: ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (typeof node === 'object' && 'props' in node) return textOf((node as { props: { children?: ReactNode } }).props.children);
    return '';
}

type TocItem = { level: 2 | 3; title: string; id: string };

/** İçindekiler: ## ve ### başlıkları (kod bloklarının içindekiler sayılmaz). */
function buildToc(markdown: string): TocItem[] {
    const slug = makeSlugger();
    const items: TocItem[] = [];
    let inFence = false;
    for (const line of markdown.split('\n')) {
        if (line.trimStart().startsWith('```')) { inFence = !inFence; continue; }
        if (inFence) continue;
        const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
        if (m) {
            const title = m[2].replace(/[`*]/g, ''); // alt çizgi kalır: başlık metninde de duruyor, kimlikler aynı çıkmalı
            items.push({ level: m[1].length as 2 | 3, title, id: slug(title) });
        }
    }
    return items;
}

const METHOD_STYLES: Record<string, string> = {
    GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POST: 'bg-sky-50 text-sky-700 border-sky-200',
    PUT: 'bg-amber-50 text-amber-700 border-amber-200',
    PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

function buildComponents(): Components {
    const slug = makeSlugger();
    return {
        h1: ({ children }) => <h1 className="text-3xl font-bold tracking-tight mb-4">{children}</h1>,
        h2: ({ children }) => (
            <h2 id={slug(textOf(children))} className="scroll-mt-20 text-2xl font-semibold tracking-tight mt-12 mb-4 pb-2 border-b">{children}</h2>
        ),
        h3: ({ children }) => {
            const text = textOf(children);
            const id = slug(text);
            const m = /^(GET|POST|PUT|PATCH|DELETE)\s+(.+)$/.exec(text);
            if (!m) return <h3 id={id} className="scroll-mt-20 text-lg font-semibold mt-8 mb-2">{children}</h3>;
            return (
                <h3 id={id} className="scroll-mt-20 mt-10 mb-2 flex flex-wrap items-center gap-2 text-lg font-semibold">
                    <span className={cn('rounded-md border px-2 py-0.5 text-xs font-bold tracking-wide', METHOD_STYLES[m[1]])}>{m[1]}</span>
                    <span className="font-mono text-base break-all">{m[2]}</span>
                </h3>
            );
        },
        p: ({ children }) => <p className="my-3 leading-7">{children}</p>,
        ul: ({ children }) => <ul className="my-3 ml-6 list-disc space-y-1.5 leading-7">{children}</ul>,
        ol: ({ children }) => <ol className="my-3 ml-6 list-decimal space-y-1.5 leading-7">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        a: ({ children, href }) => <a href={href} className="text-primary underline underline-offset-2">{children}</a>,
        blockquote: ({ children }) => <blockquote className="my-4 border-l-4 pl-4 text-muted-foreground">{children}</blockquote>,
        hr: () => <hr className="my-8" />,
        pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-[13px] leading-6 text-zinc-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">{children}</pre>
        ),
        code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>,
        table: ({ children }) => <div className="my-4 overflow-x-auto rounded-lg border"><table className="w-full text-sm">{children}</table></div>,
        th: ({ children }) => <th className="border-b bg-muted/40 px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border-b px-3 py-2 align-top">{children}</td>,
    };
}

async function readDoc(): Promise<string | null> {
    for (const dir of [process.cwd(), path.join(process.cwd(), 'lomix-next')]) {
        try { return await fs.readFile(path.join(dir, DOC_FILE), 'utf8'); } catch { /* sıradaki konumu dene */ }
    }
    return null;
}

export default async function AjansDokumaniPage() {
    const markdown = await readDoc();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Ajans Dökümanı</h2>
                <p className="text-muted-foreground">Mobil ajans endpointleri: ne işe yaradığı ve örnek cevapları.</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="h-3.5 w-3.5" /> {DOC_FILE}</p>
            </div>

            {markdown === null ? (
                <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">Döküman dosyası bulunamadı: <span className="font-mono">{DOC_FILE}</span></p>
            ) : (
                <div className="flex items-start gap-10">
                    <article className="min-w-0 max-w-3xl flex-1 rounded-xl border bg-card p-6 sm:p-8">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildComponents()}>{markdown}</ReactMarkdown>
                    </article>

                    <nav className="sticky top-20 hidden max-h-[calc(100vh-7rem)] w-60 shrink-0 overflow-y-auto xl:block" aria-label="İçindekiler">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">İçindekiler</p>
                        <ul className="space-y-1 text-sm">
                            {buildToc(markdown).map(item => (
                                <li key={item.id} className={item.level === 3 ? 'pl-3' : 'mt-3 font-semibold first:mt-0'}>
                                    <a href={`#${item.id}`} className="block truncate text-muted-foreground hover:text-foreground" title={item.title}>{item.title}</a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            )}
        </div>
    );
}
