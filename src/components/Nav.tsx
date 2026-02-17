"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/music", label: "Music" },
  { href: "/scan", label: "Scanner" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 border-b-2 border-purple-900/30 bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
        >
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400 flex items-center justify-center text-sm font-black text-white shadow-sm">
            d
          </span>
          <span className="font-semibold text-lg group-hover:text-white transition-colors">
            deadathon
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <div className="hidden sm:flex items-center gap-1 mr-3">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-purple-400/20 text-purple-300"
                      : "text-neutral-400 hover:text-white hover:bg-purple-900/20"
                  }`}
                >
                  {link.label}
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
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-purple-500/40 transition-all mb-6"
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
