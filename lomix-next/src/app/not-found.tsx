import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
            <div className="text-center">
                <h1 className="text-8xl font-bold text-primary">404</h1>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                    Sayfa Bulunamadı
                </h2>
                <p className="mt-2 text-muted-foreground">
                    Aradığınız sayfa mevcut değil veya taşınmış olabilir.
                </p>
                <Link
                    href="/"
                    className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
