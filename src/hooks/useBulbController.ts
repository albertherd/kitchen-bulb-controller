import { useCallback, useEffect, useRef, useState } from 'react';
import { BulbState, ControlMode } from '../types';
import { DEFAULT_BULBS, DEBOUNCE_DELAY, TEMP_MIN, TEMP_MAX } from '../config';
import * as api from '../api/shellyApi';

interface PendingUpdate {
  brightness?: number;
  temperature?: number;
  isOn?: boolean;
}

export function useBulbController() {
  const [bulbs, setBulbs] = useState<BulbState[]>(() => 
    DEFAULT_BULBS.map(b => ({
      ...b,
      brightness: 50,
      temperature: 4000,
      isOn: true,
      isLinked: true,
      isPending: false,
    }))
  );
  
  const [mode, setMode] = useState<ControlMode>('brightness');
  
  // Track pending updates per bulb for debouncing
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlightRequests = useRef<Set<string>>(new Set());

  // Send API request for a bulb
  const sendUpdate = useCallback(async (bulbId: string) => {
    const bulb = bulbs.find(b => b.id === bulbId);
    const pending = pendingUpdates.current.get(bulbId);
    
    if (!bulb || !pending || inFlightRequests.current.has(bulbId)) {
      return;
    }

    // Mark as in-flight
    inFlightRequests.current.add(bulbId);
    setBulbs(prev => prev.map(b => 
      b.id === bulbId ? { ...b, isPending: true } : b
    ));

    try {
      // Determine what to send
      if (pending.isOn === false) {
        await api.turnOff(bulb.ip);
      } else if (pending.isOn === true) {
        // Turning on - send brightness and temp
        const brightness = pending.brightness ?? bulb.brightness;
        const temperature = pending.temperature ?? bulb.temperature;
        await api.turnOn(bulb.ip, brightness, temperature);
      } else if (pending.brightness !== undefined && pending.temperature !== undefined) {
        // Both changed
        await api.setLight(bulb.ip, { 
          brightness: pending.brightness, 
          temp: pending.temperature 
        });
      } else if (pending.brightness !== undefined) {
        await api.setBrightness(bulb.ip, pending.brightness);
      } else if (pending.temperature !== undefined) {
        await api.setTemperature(bulb.ip, pending.temperature);
      }
    } catch (error) {
      console.error(`Failed to update ${bulb.name}:`, error);
    } finally {
      inFlightRequests.current.delete(bulbId);
      pendingUpdates.current.delete(bulbId);
      setBulbs(prev => prev.map(b => 
        b.id === bulbId ? { ...b, isPending: false } : b
      ));

      // Check if there's a new pending update that arrived while we were sending
      const newPending = pendingUpdates.current.get(bulbId);
      if (newPending) {
        sendUpdate(bulbId);
      }
    }
  }, [bulbs]);

  // Schedule an update with debouncing
  const scheduleUpdate = useCallback((bulbId: string, update: PendingUpdate) => {
    // Merge with existing pending update
    const existing = pendingUpdates.current.get(bulbId) || {};
    pendingUpdates.current.set(bulbId, { ...existing, ...update });

    // Clear existing timer
    const existingTimer = debounceTimers.current.get(bulbId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // If already in flight, don't start a new timer - it will be picked up after
    if (inFlightRequests.current.has(bulbId)) {
      return;
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      debounceTimers.current.delete(bulbId);
      sendUpdate(bulbId);
    }, DEBOUNCE_DELAY);
    
    debounceTimers.current.set(bulbId, timer);
  }, [sendUpdate]);

  // Update brightness for a bulb (and linked bulbs)
  const updateBrightness = useCallback((bulbId: string, value: number) => {
    setBulbs(prev => {
      const sourceBulb = prev.find(b => b.id === bulbId);
      if (!sourceBulb) return prev;

      return prev.map(bulb => {
        // Update source bulb always
        if (bulb.id === bulbId) {
          return { ...bulb, brightness: value };
        }
        // Update linked bulbs if source is linked
        if (sourceBulb.isLinked && bulb.isLinked) {
          return { ...bulb, brightness: value };
        }
        return bulb;
      });
    });

    // Schedule API updates
    setBulbs(prev => {
      const sourceBulb = prev.find(b => b.id === bulbId);
      if (!sourceBulb) return prev;

      // Schedule for source and linked bulbs that are ON
      prev.forEach(bulb => {
        const shouldUpdate = bulb.id === bulbId || (sourceBulb.isLinked && bulb.isLinked);
        if (shouldUpdate && bulb.isOn) {
          scheduleUpdate(bulb.id, { brightness: value });
        }
      });

      return prev;
    });
  }, [scheduleUpdate]);

  // Update temperature for a bulb (and linked bulbs)
  const updateTemperature = useCallback((bulbId: string, value: number) => {
    const clampedValue = Math.max(TEMP_MIN, Math.min(TEMP_MAX, value));
    
    setBulbs(prev => {
      const sourceBulb = prev.find(b => b.id === bulbId);
      if (!sourceBulb) return prev;

      return prev.map(bulb => {
        if (bulb.id === bulbId) {
          return { ...bulb, temperature: clampedValue };
        }
        if (sourceBulb.isLinked && bulb.isLinked) {
          return { ...bulb, temperature: clampedValue };
        }
        return bulb;
      });
    });

    setBulbs(prev => {
      const sourceBulb = prev.find(b => b.id === bulbId);
      if (!sourceBulb) return prev;

      prev.forEach(bulb => {
        const shouldUpdate = bulb.id === bulbId || (sourceBulb.isLinked && bulb.isLinked);
        if (shouldUpdate && bulb.isOn) {
          scheduleUpdate(bulb.id, { temperature: clampedValue });
        }
      });

      return prev;
    });
  }, [scheduleUpdate]);

  // Toggle bulb on/off
  const togglePower = useCallback((bulbId: string) => {
    setBulbs(prev => prev.map(bulb => {
      if (bulb.id === bulbId) {
        const newIsOn = !bulb.isOn;
        // Schedule immediately (no debounce for on/off)
        if (newIsOn) {
          scheduleUpdate(bulbId, { 
            isOn: true, 
            brightness: bulb.brightness, 
            temperature: bulb.temperature 
          });
        } else {
          scheduleUpdate(bulbId, { isOn: false });
        }
        return { ...bulb, isOn: newIsOn };
      }
      return bulb;
    }));
  }, [scheduleUpdate]);

  // Toggle link state for a bulb
  const toggleLink = useCallback((bulbId: string) => {
    setBulbs(prev => prev.map(bulb => 
      bulb.id === bulbId ? { ...bulb, isLinked: !bulb.isLinked } : bulb
    ));
  }, []);

  // Toggle between brightness and temperature mode
  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'brightness' ? 'temperature' : 'brightness');
  }, []);

  // Get value based on current mode
  const getValue = useCallback((bulb: BulbState): number => {
    if (mode === 'brightness') {
      return bulb.brightness;
    }
    // Normalize temperature to 0-100 for dial
    return ((bulb.temperature - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100;
  }, [mode]);

  // Set value based on current mode
  const setValue = useCallback((bulbId: string, value: number) => {
    if (mode === 'brightness') {
      updateBrightness(bulbId, value);
    } else {
      // Convert 0-100 back to temperature
      const temp = TEMP_MIN + (value / 100) * (TEMP_MAX - TEMP_MIN);
      updateTemperature(bulbId, temp);
    }
  }, [mode, updateBrightness, updateTemperature]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return {
    bulbs,
    mode,
    toggleMode,
    getValue,
    setValue,
    togglePower,
    toggleLink,
  };
}
