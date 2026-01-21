import { useRef, useEffect, useState } from 'react';
import './Dial.css';

interface DialProps {
  value: number;           // 0-100
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  displayValue?: string;   // Override display text
  colorStart?: string;     // Gradient start color
  colorEnd?: string;       // Gradient end color
  glowColor?: string;      // Glow effect color
}

const DIAL_SIZE = 120;
const STROKE_WIDTH = 5;
const RADIUS = (DIAL_SIZE - STROKE_WIDTH) / 2 - 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Arc goes from 135° to 405° (270° total sweep)
const START_ANGLE = 135;
const SWEEP_ANGLE = 270;

// Snap points for easier selection
const SNAP_POINTS = [0, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];
const SNAP_THRESHOLD = 3;

function snapToPoint(value: number): number {
  for (const point of SNAP_POINTS) {
    if (Math.abs(value - point) <= SNAP_THRESHOLD) {
      return point;
    }
  }
  return Math.round(value);
}

// Get angle from touch position relative to center
function getAngle(clientX: number, clientY: number, rect: DOMRect): number {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = clientX - centerX;
  const dy = clientY - centerY;
  // Standard screen coords: 0° = right, clockwise positive
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// Get shortest angular difference (handles wraparound)
function angleDiff(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export function Dial({ 
  value, 
  onChange, 
  disabled = false, 
  label,
  displayValue,
  colorStart = '#ffb464',
  colorEnd = '#ff8a50',
  glowColor = 'rgba(255, 180, 100, 0.5)'
}: DialProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const gradientId = useRef(`dialGradient-${Math.random().toString(36).substr(2, 9)}`);
  
  // Refs for drag state - avoids stale closure issues
  const dragState = useRef({
    isDragging: false,
    lastAngle: 0,
    currentValue: value,
  });

  // Sync local value with prop when not dragging
  useEffect(() => {
    if (!dragState.current.isDragging) {
      setLocalValue(value);
      dragState.current.currentValue = value;
    }
  }, [value]);

  // Haptic feedback
  const vibrate = (ms: number) => {
    if (navigator.vibrate) {
      navigator.vibrate(ms);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    const rect = containerRef.current.getBoundingClientRect();
    const angle = getAngle(e.clientX, e.clientY, rect);
    
    dragState.current.isDragging = true;
    dragState.current.lastAngle = angle;
    dragState.current.currentValue = localValue;
    
    vibrate(10);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const state = dragState.current;
    if (!state.isDragging || disabled || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const angle = getAngle(e.clientX, e.clientY, rect);
    const delta = angleDiff(state.lastAngle, angle);
    
    // Update last angle for next move
    state.lastAngle = angle;
    
    // Convert angle delta to value delta
    // Clockwise motion (positive delta in screen coords) = increase value
    // Our dial sweeps 270° for 0-100
    const valueDelta = (delta / SWEEP_ANGLE) * 100;
    
    // Calculate new value with hard clamp
    let newValue = state.currentValue + valueDelta;
    newValue = Math.max(0, Math.min(100, newValue));
    
    // Update ref immediately
    state.currentValue = newValue;
    
    const snapped = snapToPoint(newValue);
    
    // Haptic on snap points
    if (snapped !== localValue && SNAP_POINTS.includes(snapped)) {
      vibrate(5);
    }
    
    setLocalValue(snapped);
    onChange(snapped);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState.current.isDragging) {
      vibrate(8);
    }
    dragState.current.isDragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if capture was already released
    }
  };

  const arcLength = (localValue / 100) * (CIRCUMFERENCE * (SWEEP_ANGLE / 360));
  const dashArray = `${arcLength} ${CIRCUMFERENCE}`;
  
  const knobAngle = START_ANGLE + (localValue / 100) * SWEEP_ANGLE;
  const knobRad = (knobAngle * Math.PI) / 180;
  const knobX = DIAL_SIZE / 2 + RADIUS * Math.cos(knobRad);
  const knobY = DIAL_SIZE / 2 + RADIUS * Math.sin(knobRad);

  const displayText = displayValue ?? `${Math.round(localValue)}`;
  const intensity = localValue / 100;

  return (
    <div 
      className={`dial ${disabled ? 'dial--disabled' : ''}`}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ 
        '--dial-color': colorStart,
        '--dial-glow': glowColor,
        '--dial-intensity': intensity
      } as React.CSSProperties}
    >
      {/* Ambient glow effect */}
      <div className="dial__glow" />
      
      <svg 
        width={DIAL_SIZE} 
        height={DIAL_SIZE} 
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
      >
        <defs>
          <linearGradient id={gradientId.current} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        
        {/* Background track */}
        <circle
          className="dial__track"
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * (SWEEP_ANGLE / 360)} ${CIRCUMFERENCE}`}
          transform={`rotate(${START_ANGLE} ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
        />
        
        {/* Active arc */}
        <circle
          className="dial__progress"
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={`url(#${gradientId.current})`}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={dashArray}
          transform={`rotate(${START_ANGLE} ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
        />
        
        {/* Knob */}
        <circle
          className="dial__knob"
          cx={knobX}
          cy={knobY}
          r={11}
        />
        <circle
          className="dial__knob-inner"
          cx={knobX}
          cy={knobY}
          r={5}
        />
      </svg>
      
      <div className="dial__content">
        <span className="dial__value">{displayText}</span>
        {label && <span className="dial__label">{label}</span>}
      </div>
    </div>
  );
}
