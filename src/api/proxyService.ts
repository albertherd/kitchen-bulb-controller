import { PROXY_CONFIG, SIMULATE_MODE } from '../config';

export type ProxyStatus = 'checking' | 'online' | 'offline';

// Singleton state for proxy status
let proxyStatus: ProxyStatus = 'checking';
let proxyCheckPromise: Promise<boolean> | null = null;
let initialCheckPromise: Promise<boolean> | null = null;
let lastCheckTime = 0;

// Listeners for status changes
type StatusListener = (status: ProxyStatus) => void;
const listeners: Set<StatusListener> = new Set();

export function subscribeToProxyStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  // Immediately notify with current status
  listener(proxyStatus);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(listener => listener(proxyStatus));
}

/**
 * Check if the Raspberry Pi proxy is available
 */
export async function checkProxyHealth(): Promise<boolean> {
  if (SIMULATE_MODE || !PROXY_CONFIG.enabled) {
    proxyStatus = 'offline';
    notifyListeners();
    return false;
  }

  // If we're already checking, return the existing promise
  if (proxyCheckPromise) {
    return proxyCheckPromise;
  }

  proxyStatus = 'checking';
  notifyListeners();

  proxyCheckPromise = (async () => {
    const url = `https://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}${PROXY_CONFIG.healthEndpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_CONFIG.healthTimeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        // Don't cache health checks
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const isOnline = response.ok;
      proxyStatus = isOnline ? 'online' : 'offline';
      lastCheckTime = Date.now();
      notifyListeners();
      console.log(`[Proxy] Health check result: ${proxyStatus}`);
      return isOnline;
    } catch (error) {
      clearTimeout(timeoutId);
      console.log('[Proxy] Health check failed:', error instanceof Error ? error.message : 'Unknown error');
      proxyStatus = 'offline';
      lastCheckTime = Date.now();
      notifyListeners();
      return false;
    } finally {
      proxyCheckPromise = null;
    }
  })();

  return proxyCheckPromise;
}

/**
 * Get the current proxy status (synchronous)
 */
export function getProxyStatus(): ProxyStatus {
  return proxyStatus;
}

/**
 * Check if proxy is online (synchronous, based on last check)
 */
export function isProxyOnline(): boolean {
  return proxyStatus === 'online';
}

/**
 * Schedule periodic proxy health checks when offline
 */
let recheckIntervalId: ReturnType<typeof setInterval> | null = null;

export function startProxyMonitoring(): void {
  // Initial check - store the promise so others can await it
  initialCheckPromise = checkProxyHealth();

  // Set up periodic re-checks when offline
  if (recheckIntervalId) {
    clearInterval(recheckIntervalId);
  }

  recheckIntervalId = setInterval(() => {
    // Only re-check if currently offline and enough time has passed
    if (proxyStatus === 'offline' && Date.now() - lastCheckTime >= PROXY_CONFIG.recheckInterval) {
      checkProxyHealth();
    }
  }, PROXY_CONFIG.recheckInterval);
}

/**
 * Wait for the initial proxy health check to complete
 * Call this before making any bulb requests to ensure proxy status is known
 */
export async function waitForProxyCheck(): Promise<boolean> {
  if (initialCheckPromise) {
    return initialCheckPromise;
  }
  // If monitoring hasn't started, do a check now
  return checkProxyHealth();
}

export function stopProxyMonitoring(): void {
  if (recheckIntervalId) {
    clearInterval(recheckIntervalId);
    recheckIntervalId = null;
  }
}

/**
 * Build the URL for a bulb request, using proxy if available
 * @param ip - The IP address of the Shelly bulb
 * @param path - The API path (e.g., '/light/0' or '/status')
 * @returns The full URL to use for the request
 */
export function buildBulbUrl(ip: string, path: string): string {
  const useProxy = isProxyOnline();
  if (useProxy) {
    // Use the generic proxy route which works for any IP
    // Format: https://<proxy>/proxy/<bulb-ip>/<path>
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `https://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}/proxy/${ip}${cleanPath}`;
    console.log(`[Proxy] Routing through proxy: ${url}`);
    return url;
  } else {
    // Direct connection (only works on platforms that allow HTTP)
    const url = `http://${ip}${path.startsWith('/') ? path : `/${path}`}`;
    console.log(`[Proxy] Direct connection (proxy ${proxyStatus}): ${url}`);
    return url;
  }
}
