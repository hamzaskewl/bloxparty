import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/providers/WalletProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deadathon — Token-Gated Creator Experiences on Roblox",
  description:
    "Token-gated creator experiences on Roblox. Powered by Audius and Solana. Discover concerts, verify with Discord, and join the experience live.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-950 text-neutral-100 min-h-screen`}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
