import './PowerToggle.css';

interface PowerToggleProps {
  isOn: boolean;
  onToggle: (turnOn: boolean) => void;
}

export function PowerToggle({ isOn, onToggle }: PowerToggleProps) {
  return (
    <button 
      className={`power-toggle ${isOn ? 'power-toggle--on' : ''}`}
      onClick={() => onToggle(!isOn)}
      aria-label={isOn ? 'Turn all lights off' : 'Turn all lights on'}
    >
      <svg 
        className="power-toggle__icon" 
        width="18" 
        height="18" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    </button>
  );
}
