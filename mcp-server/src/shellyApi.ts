import { REQUEST_TIMEOUT } from './config.js';

export interface LightParams {
  turn?: 'on' | 'off';
  brightness?: number; // 0-100
  temp?: number; // 2700-6500 Kelvin
}

export interface BulbStatus {
  ison: boolean;
  brightness: number;
  temp: number;
  online: boolean;
  error?: string;
}

interface ShellyLightResponse {
  ison: boolean;
  brightness: number;
  temp: number;
}

/**
 * Build URL for Shelly light control
 */
function buildUrl(ip: string, params: LightParams): string {
  const url = new URL(`http://${ip}/light/0`);
  if (params.turn) url.searchParams.set('turn', params.turn);
  if (params.brightness !== undefined) url.searchParams.set('brightness', String(params.brightness));
  if (params.temp !== undefined) url.searchParams.set('temp', String(params.temp));
  return url.toString();
}

/**
 * Make HTTP request with timeout
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Set light parameters (turn on/off, brightness, temperature)
 */
export async function setLight(ip: string, params: LightParams): Promise<void> {
  const url = buildUrl(ip, params);
  const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);
  if (!response.ok) {
    throw new Error(`Failed to set light: ${response.status} ${response.statusText}`);
  }
}

/**
 * Get current bulb status
 */
export async function getStatus(ip: string): Promise<BulbStatus> {
  try {
    const url = `http://${ip}/light/0`;
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT);
    
    if (!response.ok) {
      return { ison: false, brightness: 0, temp: 2700, online: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json() as ShellyLightResponse;
    return {
      ison: data.ison,
      brightness: data.brightness,
      temp: data.temp,
      online: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ison: false, brightness: 0, temp: 2700, online: false, error: message };
  }
}

/**
 * Turn on bulb with brightness and temperature
 */
export async function turnOn(ip: string, brightness: number = 100, temp: number = 2700): Promise<void> {
  await setLight(ip, { turn: 'on', brightness, temp });
}

/**
 * Turn off bulb
 */
export async function turnOff(ip: string): Promise<void> {
  await setLight(ip, { turn: 'off' });
}

/**
 * Set brightness only
 */
export async function setBrightness(ip: string, brightness: number): Promise<void> {
  await setLight(ip, { brightness });
}

/**
 * Set temperature only
 */
export async function setTemperature(ip: string, temp: number): Promise<void> {
  await setLight(ip, { temp });
}
