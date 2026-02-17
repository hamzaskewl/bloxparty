"use client";

import { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="wallet-adapter-button wallet-adapter-button-trigger" style={{ pointerEvents: "none", opacity: 0.5 }}>
        Select Wallet
      </button>
    );
  }

  return <WalletMultiButton />;
}
