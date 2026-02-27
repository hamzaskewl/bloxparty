import type { Metadata } from "next";
import { Istok_Web, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/providers/WalletProvider";
import "./globals.css";

const istokWeb = Istok_Web({
  variable: "--font-istok",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloxparty — Token-Gated Concerts on Roblox",
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
        className={`${istokWeb.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-neutral-100 min-h-screen`}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
