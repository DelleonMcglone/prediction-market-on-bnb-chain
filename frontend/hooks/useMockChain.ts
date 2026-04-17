"use client";

import { useEffect, useState } from "react";
import { subscribeMockChain } from "@/lib/mockChain";

/**
 * Returns an integer that increments whenever the mock chain emits. Components
 * that read from the mock can depend on this to re-render on updates.
 */
export function useMockChainVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    return subscribeMockChain(() => setVersion((v) => v + 1));
  }, []);
  return version;
}
