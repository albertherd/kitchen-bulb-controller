// Compile-time flag for simulation mode
// Run with: npm run dev:simulate or npm run build:simulate
declare const __SIMULATE_MODE__: boolean;
export const SIMULATE_MODE = typeof __SIMULATE_MODE__ !== 'undefined' ? __SIMULATE_MODE__ : false;

// Temperature range for Shelly Duo GU10
export const TEMP_MIN = 2700;  // Warm white
export const TEMP_MAX = 6500;  // Cool white

// Debounce delay before sending API request (ms)
export const DEBOUNCE_DELAY = 250;

// Default bulb configuration
// Update these IPs to match your network setup
export const DEFAULT_BULBS = [
  { id: 'bulb-1', name: 'Sink', ip: '192.168.4.160' },
  { id: 'bulb-2', name: 'Frames', ip: '192.168.4.161' },
  { id: 'bulb-3', name: 'Bieb', ip: '192.168.4.162' },
  { id: 'bulb-4', name: 'Fridge', ip: '192.168.4.163' },
];

// Local storage key for persisting bulb IPs
export const STORAGE_KEY = 'bulb-controller-config';

// Raspberry Pi Proxy Configuration
// The proxy allows HTTPS requests to be forwarded to HTTP Shelly bulbs
// This is required for iOS which blocks mixed content (HTTPS -> HTTP)
export const PROXY_CONFIG = {
  // Enable/disable proxy feature entirely
  enabled: true,
  // Domain pointing to your Raspberry Pi (uses Let's Encrypt cert)
  host: 'bulb.bozoz.lol',
  // HTTPS port (443 is standard)
  port: 443,
  // Health check endpoint to verify proxy is online
  healthEndpoint: '/health',
  // How long to wait for proxy health check (ms)
  healthTimeout: 2000,
  // How often to re-check proxy availability when offline (ms)
  recheckInterval: 30000,
};
