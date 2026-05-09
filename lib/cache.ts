// lib/cache.ts

import NodeCache from "node-cache";

export const searchCache = new NodeCache({
  stdTTL: 60 * 60 * 24,
  checkperiod: 120,
});
