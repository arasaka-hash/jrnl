import type { Metadata, Viewport } from "next";
import { Rajdhani, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "JRNL | Life Tracker",
  description: "Westworld-style life tracking with qualitative updates and spider graph",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#0a0a0f] text-cyan-100 overflow-x-hidden font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
