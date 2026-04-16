import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bscTestnet } from "@reown/appkit/networks";
import { http } from "wagmi";

/**
 * Reown AppKit (WalletConnect) configured for BNB testnet only.
 *
 * Expects NEXT_PUBLIC_REOWN_PROJECT_ID to be set in the environment. On Vercel
 * this is a Project Setting; locally it goes in `frontend/.env.local`.
 */

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "ci-placeholder";

const rpcUrl =
  process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL ||
  "https://data-seed-prebsc-1-s1.binance.org:8545";

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(rpcUrl),
  },
  ssr: true,
});

export const appkitNetworks = [bscTestnet] as const;

const metadata = {
  name: "Igbo Labs Prediction Market Demo",
  description:
    "An LMSR-backed prediction market demo on BNB testnet. Accompanies Case Study № 007.",
  url: "https://example.com", // Phase 08 replaces with real domain
  icons: [],
};

let _appKitInitialized = false;

/**
 * Lazy-init AppKit on the client. Must be called from a client component
 * before any `@reown/appkit/react` hook is used.
 */
export function initAppKit() {
  if (_appKitInitialized || typeof window === "undefined") return;
  _appKitInitialized = true;
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [bscTestnet],
    projectId,
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeMode: "dark",
  });
}
