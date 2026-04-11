export interface BulbState {
  id: string;
  name: string;
  ip: string;
  brightness: number;      // 0-100
  temperature: number;     // 2700-6500 Kelvin
  isOn: boolean;
  isLinked: boolean;
  isPending: boolean;      // API request in flight
  isOnline: boolean;       // Device reachable
  isLoading: boolean;      // Initial status fetch in progress
}

export type ControlMode = 'brightness' | 'temperature';

export interface AppState {
  bulbs: BulbState[];
  mode: ControlMode;
}

export interface PresetBulbAction {
  bulbId: string;
  isOn?: boolean;
  brightness?: number;
  temperature?: number;
}

export interface PresetConfig {
  id: string;
  name: string;
  description?: string;
  actions: PresetBulbAction[];
}
