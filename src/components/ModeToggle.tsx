import { ControlMode } from '../types';
import './ModeToggle.css';

interface ModeToggleProps {
  mode: ControlMode;
  onToggle: () => void;
}

// Sun icon for brightness
const BrightnessIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

// Thermometer icon for temperature
const TemperatureIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
);

export function ModeToggle({ mode, onToggle }: ModeToggleProps) {
  return (
    <button 
      className="mode-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${mode === 'brightness' ? 'temperature' : 'brightness'} mode`}
    >
      <div className={`mode-toggle__option ${mode === 'brightness' ? 'mode-toggle__option--active' : ''}`}>
        <BrightnessIcon />
        <span>Intensity</span>
      </div>
      <div className={`mode-toggle__option ${mode === 'temperature' ? 'mode-toggle__option--active' : ''}`}>
        <TemperatureIcon />
        <span>Warmth</span>
      </div>
      <div 
        className="mode-toggle__indicator"
        style={{ transform: `translateX(${mode === 'temperature' ? '100%' : '0'})` }}
      />
    </button>
  );
}
