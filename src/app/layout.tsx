import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AuthProvider } from "@/components/auth/AuthProvider";
import { BottomNav } from "@/components/layout/BottomNav";
import { PWAProvider } from "@/components/layout/PWAProvider";

export const metadata: Metadata = {
  title: "VentaÁgil | Sistema de Ventas",
  description: "Sistema de ventas ágil y moderno para tu negocio",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VentaÁgil",
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <PWAProvider />
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
