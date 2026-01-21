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
  { id: 'bulb-1', name: 'Bulb 1', ip: '192.168.4.160' },
  { id: 'bulb-2', name: 'Bulb 2', ip: '192.168.4.161' },
  { id: 'bulb-3', name: 'Bulb 3', ip: '192.168.4.162' },
  { id: 'bulb-4', name: 'Bulb 4', ip: '192.168.4.163' },
];

// Local storage key for persisting bulb IPs
export const STORAGE_KEY = 'bulb-controller-config';
