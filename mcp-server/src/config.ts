// Bulb configuration - edit these to match your setup
export const BULBS = [
  { id: 'bulb-1', name: 'Sink', ip: '192.168.4.160' },
  { id: 'bulb-2', name: 'Frames', ip: '192.168.4.161' },
  { id: 'bulb-3', name: 'Bieb', ip: '192.168.4.162' },
  { id: 'bulb-4', name: 'Fridge', ip: '192.168.4.163' },
  { id: 'bulb-5', name: 'Pingu', ip: '192.168.4.164' },
  { id: 'bulb-6', name: 'AC', ip: '192.168.4.165' },
];

// Shelly Duo GU10 temperature range
export const TEMP_MIN = 2700; // Warm white (Kelvin)
export const TEMP_MAX = 6500; // Cool white (Kelvin)

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 5000;
