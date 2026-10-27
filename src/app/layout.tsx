import type { Metadata } from "next";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";
export const metadata: Metadata = {
  title: {
    default: "Adaptiva — Ruang belajar SMA",
    template: "%s | Adaptiva",
  },
  description:
    "Latihan Matematika, Bahasa Indonesia, dan Bahasa Inggris kelas XII dengan pembahasan dan pendampingan guru.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var t;try{t=localStorage.getItem('adaptiva-theme')}catch{}document.documentElement.dataset.theme=t==='dark'||t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'",
          }}
        />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
