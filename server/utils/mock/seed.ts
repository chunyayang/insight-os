/**
 * Deterministic pseudo-randomness for mock data.
 *
 * Mocks must be stable: the same date/market/metric always yields the same number, so
 * charts don't reshuffle between requests and money totals are reproducible (the FX
 * aggregation is audit-stable by contract). Seeded from a string key rather than
 * Math.random for exactly that reason.
 */

/** FNV-1a — small, fast string hash used to derive a numeric seed from a key. */
export function hashKey(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — compact deterministic PRNG. Returns floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** One stable float in [0,1) for a given key — the workhorse for per-day jitter. */
export function seeded(key: string): number {
  return rng(hashKey(key))()
}

/** A stable value within [min, max] for a key. */
export function seededRange(key: string, min: number, max: number): number {
  return min + seeded(key) * (max - min)
}
