"use client";

import { useEffect, useState } from "react";

const KEY = "pm-demo:slippage-bps";
const DEFAULT_BPS = 200; // 2%
const MIN_BPS = 10;
const MAX_BPS = 2_000;

/**
 * User-adjustable slippage tolerance in basis points, persisted to
 * localStorage. Default is 2%. Safe for SSR: reads lazily in an effect.
 */
export function useSlippage() {
  const [bps, setBpsState] = useState<number>(DEFAULT_BPS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= MIN_BPS && n <= MAX_BPS) setBpsState(n);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setBps = (next: number) => {
    const clamped = Math.max(MIN_BPS, Math.min(MAX_BPS, Math.round(next)));
    setBpsState(clamped);
    try {
      window.localStorage.setItem(KEY, String(clamped));
    } catch {
      // ignore
    }
  };

  return { bps, setBps, minBps: MIN_BPS, maxBps: MAX_BPS };
}
