import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import { DivergenceProvider } from "@/app/context/DivergenceContext";
import { BranchProvider } from "@/app/context/BranchContext";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "JRNL | Arasaka Agent Assessment to Baseline",
  description: "Arasaka Agent Assessment to Baseline - life tracking with qualitative updates and neural profile",
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
      className={`${jetbrainsMono.variable} ${orbitron.variable}`}
    >
      <body className="min-h-screen bg-[#0a0a0f] text-cyan-100 overflow-x-hidden font-mono antialiased">
        <DivergenceProvider>
          <BranchProvider>{children}</BranchProvider>
        </DivergenceProvider>
      </body>
    </html>
  );
}
