import { SIMULATE_MODE } from '../config';

interface LightParams {
  turn?: 'on' | 'off';
  brightness?: number;
  temp?: number;
}

interface BulbStatus {
  ison: boolean;
  brightness: number;
  temp: number;
}

/**
 * Set light parameters on a Shelly bulb
 * Uses GET request to /light/0 endpoint
 */
export async function setLight(ip: string, params: LightParams): Promise<void> {
  if (SIMULATE_MODE) {
    console.log(`[SIMULATE] setLight(${ip}):`, params);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    return;
  }

  const searchParams = new URLSearchParams();
  
  if (params.turn !== undefined) {
    searchParams.set('turn', params.turn);
  }
  if (params.brightness !== undefined) {
    searchParams.set('brightness', String(Math.round(params.brightness)));
  }
  if (params.temp !== undefined) {
    searchParams.set('temp', String(Math.round(params.temp)));
  }

  const url = `http://${ip}/light/0?${searchParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to set light on ${ip}:`, error);
    throw error;
  }
}

/**
 * Get current status of a Shelly bulb
 */
export async function getStatus(ip: string): Promise<BulbStatus> {
  if (SIMULATE_MODE) {
    console.log(`[SIMULATE] getStatus(${ip})`);
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    return {
      ison: true,
      brightness: 50,
      temp: 4000,
    };
  }

  const url = `http://${ip}/status`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const light = data.lights?.[0];
    
    if (!light) {
      throw new Error('No light data in response');
    }
    
    return {
      ison: light.ison,
      brightness: light.brightness,
      temp: light.temp,
    };
  } catch (error) {
    console.error(`Failed to get status from ${ip}:`, error);
    throw error;
  }
}

/**
 * Turn bulb on with specific brightness and temperature
 */
export async function turnOn(ip: string, brightness: number, temp: number): Promise<void> {
  return setLight(ip, { turn: 'on', brightness, temp });
}

/**
 * Turn bulb off
 */
export async function turnOff(ip: string): Promise<void> {
  return setLight(ip, { turn: 'off' });
}

/**
 * Set brightness only (bulb must be on)
 */
export async function setBrightness(ip: string, brightness: number): Promise<void> {
  return setLight(ip, { brightness });
}

/**
 * Set temperature only (bulb must be on)
 */
export async function setTemperature(ip: string, temp: number): Promise<void> {
  return setLight(ip, { temp });
}
