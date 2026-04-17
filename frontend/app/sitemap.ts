import type { MetadataRoute } from "next";

/**
 * Static routes only. Per-market URLs are not listed because they're dynamic
 * and indexing them would just surface stale testnet addresses.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://example.com"; // replaced in Phase 08 once the live URL is pinned
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/portfolio`, lastModified: now, priority: 0.5 },
    { url: `${base}/about`, lastModified: now, priority: 0.7 },
  ];
}
