import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevPanel",
  description: "Mini panel de administracion con login, dashboard y tabla de usuarios",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
