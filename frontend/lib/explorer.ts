import type { Address, Hash } from "viem";

const BASE = "https://testnet.bscscan.com";

export const txUrl = (hash: Hash) => `${BASE}/tx/${hash}`;
export const addressUrl = (address: Address) => `${BASE}/address/${address}`;
export const tokenUrl = (address: Address) => `${BASE}/token/${address}`;

export function truncateAddress(address: Address, chars = 4): string {
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function truncateHash(hash: Hash, chars = 6): string {
  return `${hash.slice(0, 2 + chars)}…${hash.slice(-chars)}`;
}
