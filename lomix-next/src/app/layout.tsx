import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lomix Admin",
  description: "Lomix Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        {/* Public klasöründeki dosyalara doğrudan / ile erişilir */}
        <link href="/libs/tabler/css/tabler.min.css" rel="stylesheet" />
        {/* Tabler Icons CSS */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
        {/* FontAwesome CSS */}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className={inter.className}>
        {children}
        {/* Tabler JS */}
        {/* <script src="/libs/tabler/js/tabler.min.js"></script> */}
      </body>
    </html>
  );
}
