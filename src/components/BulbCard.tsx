import { BulbState, ControlMode } from '../types';
import { TEMP_MIN, TEMP_MAX } from '../config';
import { Dial } from './Dial';
import './BulbCard.css';

interface BulbCardProps {
  bulb: BulbState;
  mode: ControlMode;
  dialValue: number;
  onDialChange: (value: number) => void;
  onTogglePower: () => void;
  onToggleLink: () => void;
}

// Link icon SVG
const LinkIcon = ({ linked }: { linked: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {linked ? (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ) : (
      <>
        <path d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </>
    )}
  </svg>
);

// Power icon SVG
const PowerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    <line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

// Get colors based on mode and value
function getDialColors(mode: ControlMode, bulb: BulbState) {
  if (mode === 'temperature') {
    const ratio = (bulb.temperature - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
    if (ratio < 0.33) {
      // Warm - amber/orange
      return {
        colorStart: '#ffb464',
        colorEnd: '#ff8a50',
        glowColor: 'rgba(255, 160, 80, 0.5)'
      };
    } else if (ratio < 0.66) {
      // Neutral - soft white
      return {
        colorStart: '#fff4e0',
        colorEnd: '#ffecd0',
        glowColor: 'rgba(255, 240, 220, 0.4)'
      };
    } else {
      // Cool - blue/white
      return {
        colorStart: '#a8d4ff',
        colorEnd: '#78b8ff',
        glowColor: 'rgba(140, 200, 255, 0.5)'
      };
    }
  }
  
  // Brightness mode - warm golden
  return {
    colorStart: '#ffb464',
    colorEnd: '#ff8a50',
    glowColor: 'rgba(255, 160, 80, 0.5)'
  };
}

export function BulbCard({ 
  bulb, 
  mode, 
  dialValue, 
  onDialChange, 
  onTogglePower, 
  onToggleLink 
}: BulbCardProps) {
  const colors = getDialColors(mode, bulb);
  
  // Format display value based on mode
  const getDisplayValue = (): string => {
    if (mode === 'brightness') {
      return `${Math.round(bulb.brightness)}`;
    }
    return `${Math.round(bulb.temperature)}`;
  };

  const getDisplayLabel = (): string => {
    if (mode === 'brightness') {
      return 'percent';
    }
    return 'kelvin';
  };

  return (
    <div className={`bulb-card ${!bulb.isOn ? 'bulb-card--off' : ''} ${bulb.isPending ? 'bulb-card--pending' : ''}`}>
      <div className="bulb-card__header">
        <span className="bulb-card__name">{bulb.name}</span>
        <div className="bulb-card__actions">
          <button 
            className={`bulb-card__link-btn ${bulb.isLinked ? 'bulb-card__link-btn--active' : ''}`}
            onClick={onToggleLink}
            title={bulb.isLinked ? 'Unlink from group' : 'Link to group'}
            aria-label={bulb.isLinked ? 'Unlink from group' : 'Link to group'}
          >
            <LinkIcon linked={bulb.isLinked} />
          </button>
          <button 
            className={`bulb-card__power-btn ${bulb.isOn ? 'bulb-card__power-btn--on' : ''}`}
            onClick={onTogglePower}
            title={bulb.isOn ? 'Turn off' : 'Turn on'}
            aria-label={bulb.isOn ? 'Turn off' : 'Turn on'}
          >
            <PowerIcon />
          </button>
        </div>
      </div>
      
      <div className="bulb-card__dial">
        <Dial
          value={dialValue}
          onChange={onDialChange}
          disabled={!bulb.isOn}
          displayValue={getDisplayValue()}
          label={getDisplayLabel()}
          colorStart={colors.colorStart}
          colorEnd={colors.colorEnd}
          glowColor={colors.glowColor}
        />
      </div>
      
      {bulb.isPending && (
        <div className="bulb-card__pending-indicator" />
      )}
    </div>
  );
}
