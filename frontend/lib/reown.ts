import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { bscTestnet as bscTestnetDefault } from "@reown/appkit/networks";
import { http } from "wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";

/**
 * Reown AppKit (WalletConnect) configured for BNB testnet only.
 *
 * Expects NEXT_PUBLIC_REOWN_PROJECT_ID to be set in the environment. On Vercel
 * this is a Project Setting; locally it goes in `frontend/.env.local`.
 *
 * RPC override: if NEXT_PUBLIC_BNB_TESTNET_RPC_URL is set we clone the chain
 * descriptor with our URL. Reown derives its own transports from the network's
 * rpcUrls.default.http list, so just passing `transports:` to the adapter is
 * not enough — the chain descriptor itself has to point to the override.
 */

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "ci-placeholder";

const rpcOverride = process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL;

// When overriding to a local RPC (Anvil dev), also drop the multicall3 contract
// address from the chain descriptor. Multicall3 is not deployed on a fresh Anvil,
// so wagmi's read batcher would hit a non-contract and get an empty response.
const bscTestnet: AppKitNetwork = rpcOverride
  ? {
      ...bscTestnetDefault,
      rpcUrls: {
        ...bscTestnetDefault.rpcUrls,
        default: { http: [rpcOverride] },
      },
      contracts: undefined,
    }
  : bscTestnetDefault;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(rpcOverride),
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
