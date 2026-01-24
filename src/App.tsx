import { useEffect, useState } from 'react';
import { useBulbController } from './hooks/useBulbController';
import { BulbCard } from './components/BulbCard';
import { ModeToggle } from './components/ModeToggle';
import { PowerToggle } from './components/PowerToggle';
import { SIMULATE_MODE } from './config';
import { startProxyMonitoring, stopProxyMonitoring, subscribeToProxyStatus, ProxyStatus } from './api/proxyService';
import './App.css';

function App() {
  const {
    bulbs,
    mode,
    toggleMode,
    getValue,
    setValue,
    togglePower,
    toggleLink,
    isAnyOn,
    setAllPower,
  } = useBulbController();

  const [proxyStatus, setProxyStatus] = useState<ProxyStatus>('checking');

  // Start proxy monitoring on mount
  useEffect(() => {
    startProxyMonitoring();
    const unsubscribe = subscribeToProxyStatus(setProxyStatus);
    return () => {
      stopProxyMonitoring();
      unsubscribe();
    };
  }, []);

  return (
    <div className="app">
      {SIMULATE_MODE && (
        <div className="app__simulate-banner">
          Simulation Mode
        </div>
      )}
      
      <header className="app__header">
        <PowerToggle isOn={isAnyOn} onToggle={setAllPower} />
        <div 
          className={`app__proxy-indicator app__proxy-indicator--${proxyStatus}`}
          title={proxyStatus === 'online' ? 'Routed via Pi' : proxyStatus === 'checking' ? 'Checking proxy...' : 'Direct connection'}
        />
        <ModeToggle mode={mode} onToggle={toggleMode} />
      </header>
      
      <main className="app__main">
        <div className="app__grid">
          {bulbs.map(bulb => (
            <BulbCard
              key={bulb.id}
              bulb={bulb}
              mode={mode}
              dialValue={getValue(bulb)}
              onDialChange={(value) => setValue(bulb.id, value)}
              onTogglePower={() => togglePower(bulb.id)}
              onToggleLink={() => toggleLink(bulb.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
