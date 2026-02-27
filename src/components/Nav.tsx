"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const NAV_LINKS = [
  {
    href: "/events",
    label: "Events",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/artists",
    label: "Artists",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/music",
    label: "Music",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-3 sm:px-5 pt-3">
      {/* Single unified glass bar */}
      <div className="max-w-7xl mx-auto glass-nav rounded-2xl px-4 sm:px-5 py-2.5 flex items-center justify-between">
        {/* Logo — left */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group flex-shrink-0"
        >
          <img src="/logo.png" alt="Bloxparty" className="w-9 h-9 rounded-lg object-contain" />
          <span className="font-bold text-lg group-hover:text-white transition-colors hidden sm:block text-neutral-200">
            Bloxparty
          </span>
        </Link>

        {/* Nav links — center pills */}
        <div className="hidden sm:flex items-center gap-1 bg-white/[0.04] px-1.5 py-1 rounded-xl">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  isActive
                    ? "bg-white/10 text-accent shadow-sm"
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile nav + Wallet — right */}
        <div className="flex items-center gap-2">
          <div className="flex sm:hidden items-center gap-0.5 bg-white/[0.04] px-1 py-0.5 rounded-lg">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`p-2 rounded-md transition-all ${
                    isActive
                      ? "bg-white/10 text-accent"
                      : "text-neutral-500 hover:text-white"
                  }`}
                >
                  {link.icon}
                </Link>
              );
            })}
          </div>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}

export function BackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-400 hover:text-white glass hover:bg-white/5 transition-all mb-6"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}
