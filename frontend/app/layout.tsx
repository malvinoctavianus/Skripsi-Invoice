import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kontrak Kerja Sama Approval - Blockchain",
  description: "Sistem approval kontrak kerja sama antar perusahaan berbasis blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-100 font-sans text-slate-900 antialiased">
        <Providers>
          <Header />
          {children}
          <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Sistem Approval Kontrak Kerja Sama — Diamankan dengan Blockchain
          </footer>
        </Providers>
      </body>
    </html>
  );
}
