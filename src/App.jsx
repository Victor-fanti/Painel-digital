import { useEffect, useRef, useState } from 'react';

const modes = {
  street: { factor: 1.0, label: 'Street', color: '#2600ff' },
  race: { factor: 1.22, label: 'Race', color: '#ff0000' },
  eco: { factor: 0.85, label: 'Economy', color: '#00ccff' }
};

const calcPower = (torque, rpm) => ((torque * rpm) / 7127).toFixed(1);
const calcSpeed = (rpm, torque, injection) => {
  const base = rpm / 50;
  const injectionFactor = injection / 100;
  const torqueFactor = torque / 20;
  return Math.min(320, Math.round(base * injectionFactor * torqueFactor * 1.2));
};

function Gauge({ value, max, label, color, unit, isRedZone = false }) {
  const angle = (value / max) * 270 - 135;
  const displayValue = Math.round(value / 100);
  
  return (
    <div className={`gauge-container ${isRedZone ? 'redzone-active' : ''}`}>
      <div className="gauge-wrapper">
        <svg className="gauge-svg" viewBox="0 0 240 240">
          {/* Fundo principal com gradiente 3D */}
          <defs>
            <radialGradient id={`grad-${label}`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" style={{ stopColor: '#1a1a2e', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#0a0a14', stopOpacity: 1 }} />
            </radialGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Base circular 3D */}
          <circle cx="120" cy="120" r="115" fill={`url(#grad-${label})`} stroke={color} strokeWidth="2" opacity="0.9" />
          <circle cx="120" cy="120" r="110" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
          
          {/* Arco de zona vermelha (high RPM) */}
          <path d="M 120 20 A 100 100 0 0 1 210 210" fill="none" stroke="#ff3333" strokeWidth="8" opacity="0.4" className="redzone" />
          
          {/* Marcações numeradas ao redor */}
          {[...Array(11)].map((_, i) => {
            const angle = (i * 270) / 10 - 135;
            const rad = (angle * Math.PI) / 180;
            const x = 120 + 85 * Math.cos(rad);
            const y = 120 + 85 * Math.sin(rad);
            return (
              <text
                key={`num-${i}`}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="gauge-number"
                fill={color}
                fontSize="14"
                fontWeight="bold"
                style={{ textShadow: `0 0 10px ${color}` }}
              >
                {i}
              </text>
            );
          })}
          
          {/* Marcações pequenas entre números */}
          {[...Array(50)].map((_, i) => {
            const angle = (i * 270) / 50 - 135;
            const rad = (angle * Math.PI) / 180;
            const x1 = 120 + 95 * Math.cos(rad);
            const y1 = 120 + 95 * Math.sin(rad);
            const x2 = 120 + 102 * Math.cos(rad);
            const y2 = 120 + 102 * Math.sin(rad);
            return i % 5 !== 0 ? (
              <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" opacity="0.6" />
            ) : null;
          })}
          
          {/* Marcações maiores a cada número */}
          {[...Array(11)].map((_, i) => {
            const angle = (i * 270) / 10 - 135;
            const rad = (angle * Math.PI) / 180;
            const x1 = 120 + 92 * Math.cos(rad);
            const y1 = 120 + 92 * Math.sin(rad);
            const x2 = 120 + 105 * Math.cos(rad);
            const y2 = 120 + 105 * Math.sin(rad);
            return (
              <line key={`major-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.5" opacity="0.9" filter={`url(#glow-${label})`} />
            );
          })}
          
          {/* Ponteiro principal com sombra */}
          <g transform={`rotate(${angle} 120 120)`}>
            <polygon points="120,50 115,118 125,118" fill="rgba(0,0,0,0.3)" className="gauge-needle-shadow" />
          </g>
          
          {/* Ponteiro brilhante */}
          <g transform={`rotate(${angle} 120 120)`}>
            <polygon points="120,50 115,118 125,118" fill={color} className="gauge-needle" filter={`url(#glow-${label})`} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
          </g>
          
          {/* Centro com brilho */}
          <circle cx="120" cy="120" r="12" fill={color} opacity="0.8" filter={`url(#glow-${label})`} />
          <circle cx="120" cy="120" r="8" fill="white" opacity="0.6" />
          
          {/* Efeito de borda com glow */}
          <circle cx="120" cy="120" r="115" fill="none" stroke={color} strokeWidth="3" opacity="0.1" className="gauge-glow-outer" />
        </svg>
      </div>
      
      <div className="gauge-display">
        <div className="gauge-value-big">{displayValue}</div>
        <div className="gauge-label-text">{label}</div>
        <div className="gauge-unit-text">{unit}</div>
      </div>
    </div>
  );
}

function App() {
  const [injection, setInjection] = useState(30);
  const [torque, setTorque] = useState(18);
  const [rpm, setRpm] = useState(0);
  const [mode, setMode] = useState('street');
  const [throttle, setThrottle] = useState(0);
  const throttleIntervalRef = useRef(null);

  const power = calcPower(torque, rpm);
  const speed = calcSpeed(rpm, torque, injection);
  const modeConfig = modes[mode];
  const speedPercent = (speed / 320) * 100;
  const rpmPercent = (rpm / 7800) * 100;
  const isRedZone = rpm > 6500;
  const isThrottling = throttle > 0;

  useEffect(() => {
    return () => {
      if (throttleIntervalRef.current) clearInterval(throttleIntervalRef.current);
    };
  }, []);

  const handleThrottleStart = () => {
    setThrottle(100);
    if (throttleIntervalRef.current) return;
    
    throttleIntervalRef.current = setInterval(() => {
      setRpm((prev) => Math.min(7800, prev + 180));
      setInjection((prev) => Math.min(100, prev + 1.5));
    }, 16);
  };

  const handleThrottleStop = () => {
    setThrottle(0);
    if (throttleIntervalRef.current) {
      clearInterval(throttleIntervalRef.current);
      throttleIntervalRef.current = null;
    }
    
    // RPM cai suavemente até 0
    const dropInterval = setInterval(() => {
      setRpm((prev) => {
        const newRpm = Math.max(0, prev - 120);
        if (newRpm <= 0) {
          clearInterval(dropInterval);
          return 0;
        }
        return newRpm;
      });
      setInjection((prev) => Math.max(30, prev - 1));
    }, 16);
  };

  const handleMode = (newMode) => {
    setMode(newMode);
    setTorque((current) => {
      const newTorque = Math.min(38, Math.max(8, Math.round(current * modes[newMode].factor)));
      return newTorque;
    });
  };

  const handleReset = () => {
    if (throttleIntervalRef.current) clearInterval(throttleIntervalRef.current);
    setInjection(30);
    setTorque(18);
    setRpm(0);
    setThrottle(0);
  };

  return (
    <div className={`app-nfs ${throttle > 0 ? 'throttling' : ''}`}>
      <div className="hud-container">
        <div className="top-panel">
          <div className="mode-display">
            <div className={`mode-badge mode-${mode}`}>{modeConfig.label}</div>
            <div className="gear-display">
              <span>P</span>
            </div>
          </div>
          <div className="status-display">
            <div className="status-item">
              <span className="label">POWER</span>
              <span className="value" style={{ color: modeConfig.color }}>{power} CV</span>
            </div>
            <div className="status-item">
              <span className="label">TORQUE</span>
              <span className="value" style={{ color: modeConfig.color }}>{torque} kgf·m</span>
            </div>
          </div>
        </div>

        <div className="gauges-main">
          <Gauge value={rpm} max={7800} label="RPM" color={modeConfig.color} unit="rpm" isRedZone={isRedZone} />
          <Gauge value={speed} max={320} label="SPEED" color={modeConfig.color} unit="km/h" />
        </div>

        <div className="bottom-panel">
          <div className="info-block">
            <div className="info-row">
              <span>INJECTION</span>
              <span className="percent-bar">
                <span className="percent-fill" style={{ width: `${injection}%`, backgroundColor: modeConfig.color }} />
              </span>
              <span>{injection}%</span>
            </div>
            <div className="info-row">
              <span>THROTTLE</span>
              <span className="percent-bar">
                <span className="percent-fill" style={{ width: `${throttle}%`, backgroundColor: throttle > 0 ? '#ff0000' : '#333' }} />
              </span>
              <span>{throttle}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="control-panel">
        <div className="ctrl-group">
          <h3>SETTINGS</h3>
          <div className="slider-ctrl">
            <label>Injection</label>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={injection} 
              onChange={(e) => setInjection(Number(e.target.value))}
              className="slider"
            />
            <span>{injection}%</span>
          </div>
          <div className="slider-ctrl">
            <label>Torque</label>
            <input 
              type="range" 
              min="8" 
              max="38" 
              value={torque} 
              onChange={(e) => setTorque(Number(e.target.value))}
              className="slider"
            />
            <span>{torque} kgf·m</span>
          </div>
        </div>

        <div className="ctrl-group">
          <h3>MODE</h3>
          <div className="mode-buttons">
            {Object.keys(modes).map((m) => (
              <button
                key={m}
                className={`mode-btn ${mode === m ? 'active' : ''}`}
                onClick={() => handleMode(m)}
                style={{ borderColor: modes[m].color, color: mode === m ? modes[m].color : '#888' }}
              >
                {modes[m].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ctrl-group">
          <h3>ACCELERATION</h3>
          <div className="throttle-button">
            <button
              className={`throttle-btn ${throttle === 100 ? 'active' : ''}`}
              onMouseDown={handleThrottleStart}
              onMouseUp={handleThrottleStop}
              onMouseLeave={handleThrottleStop}
              onTouchStart={handleThrottleStart}
              onTouchEnd={handleThrottleStop}
            >
              {throttle === 100 ? '🔥 ACCELERATING' : '⏸ STANDBY'}
            </button>
            <button className="reset-btn" onClick={handleReset}>RESET</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
