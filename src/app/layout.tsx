import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Adaptiva — Ruang belajar adaptif",
    template: "%s | Adaptiva",
  },
  description:
    "Platform asesmen dan pendampingan belajar untuk program pengabdian kepada masyarakat bersama mitra SMA.",
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
              "try{var t=localStorage.getItem('adaptiva-theme');document.documentElement.dataset.theme=t==='dark'||t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme='light'}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
