/**
 * Next.js instrumentation file - runs once on server startup.
 * Sets up corporate proxy for outbound HTTPS requests made by NextAuth.
 * Only runs in Node.js runtime (not Edge).
 *
 * Uses Symbol.for('undici.globalDispatcher.1') to patch Node.js v22's
 * built-in fetch (which uses internal undici) to route through the proxy.
 */
export async function register() {
  // Only run in Node.js runtime, not Edge
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return;

  try {
    const { ProxyAgent } = require("undici");
    const agent = new ProxyAgent(proxyUrl);

    // Set the global dispatcher symbol used by Node.js v18+ built-in fetch
    // This is the internal symbol that Node.js's undici reads for the global dispatcher
    const dispatcherSymbol = Symbol.for("undici.globalDispatcher.1");
    (globalThis as Record<symbol, unknown>)[dispatcherSymbol] = agent;

    console.log(`[Proxy] Node.js built-in fetch dispatcher set to proxy: ${proxyUrl}`);
  } catch (err) {
    console.warn("[Proxy] Could not set global proxy dispatcher:", err);
  }
}
