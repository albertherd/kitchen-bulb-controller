import { useBulbController } from './hooks/useBulbController';
import { BulbCard } from './components/BulbCard';
import { ModeToggle } from './components/ModeToggle';
import { PowerToggle } from './components/PowerToggle';
import { SIMULATE_MODE } from './config';
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

  return (
    <div className="app">
      {SIMULATE_MODE && (
        <div className="app__simulate-banner">
          Simulation Mode
        </div>
      )}
      
      <header className="app__header">
        <PowerToggle isOn={isAnyOn} onToggle={setAllPower} />
        <h1 className="app__title">Lights</h1>
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
