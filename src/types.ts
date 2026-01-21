export interface BulbState {
  id: string;
  name: string;
  ip: string;
  brightness: number;      // 0-100
  temperature: number;     // 2700-6500 Kelvin
  isOn: boolean;
  isLinked: boolean;
  isPending: boolean;      // API request in flight
}

export type ControlMode = 'brightness' | 'temperature';

export interface AppState {
  bulbs: BulbState[];
  mode: ControlMode;
}
