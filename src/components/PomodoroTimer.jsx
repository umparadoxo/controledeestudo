import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import conteudo from '../../conteudo.json';
import { Play, Pause, RotateCcw, Settings, Maximize2, Minimize2, CheckCircle, BookOpen, List, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';

const PomodoroTimer = ({ isFocusMode, setIsFocusMode, initialTask, onClearTask }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('study'); // study, shortBreak, longBreak
  const [settings, setSettings] = useState({ study: 25, short: 5, long: 15 });
  const [showSettings, setShowSettings] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  // Task state
  const [currentTask, setCurrentTask] = useState({
    discipline: initialTask?.discipline || '',
    topic: initialTask?.topic || ''
  });

  const timerRef = useRef(null);

  // Helper to get topics for the current discipline
  const availableTopics = React.useMemo(() => {
    if (!currentTask.discipline) return [];
    const discipline = conteudo.cronograma.find(d => d.disciplina === currentTask.discipline);
    return discipline ? discipline.assuntos.flatMap(a => a.topicos) : [];
  }, [currentTask.discipline]);

  // Audio generation
  const playSound = (type) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'start') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else {
      osc.type = 'square'; osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    }
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) setSeconds(seconds - 1);
        else if (minutes > 0) { setMinutes(minutes - 1); setSeconds(59); }
        else handleTimerComplete();
      }, 1000);
    } else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [isActive, minutes, seconds]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    playSound('finish');
    if (mode === 'study') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ff4757', '#2ed573', '#1e90ff'] });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('pomodoro_sessions').insert({
          user_id: user.id, duration_minutes: settings.study, completed_at: new Date().toISOString(),
          discipline: currentTask.discipline, topic: currentTask.topic
        });
      }
      setSessionsCompleted(prev => prev + 1);
      if ((sessionsCompleted + 1) % 4 === 0) switchMode('longBreak');
      else switchMode('shortBreak');
    } else switchMode('study');
  };

  const switchMode = (newMode) => {
    setMode(newMode); setIsActive(false);
    const time = newMode === 'study' ? settings.study : (newMode === 'shortBreak' ? settings.short : settings.long);
    setMinutes(time); setSeconds(0);
  };

  const toggleTimer = () => { if (!isActive) playSound('start'); setIsActive(!isActive); };
  const resetTimer = () => { setIsActive(false); switchMode(mode); };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    const val = parseInt(value) || 1;
    setSettings(prev => ({ ...prev, [name]: val }));
    if (!isActive && mode === name || (name === 'short' && mode === 'shortBreak') || (name === 'long' && mode === 'longBreak')) {
      setMinutes(val); setSeconds(0);
    }
  };

  return (
    <div className={`pomodoro-container ${isFocusMode ? 'fullscreen' : 'animate-fade-in'}`}>
      <div className="glass-card timer-details animate-slide-up">
        <div className="task-info">
          <div className="task-header-row">
             <div className="task-field">
               <span className="task-label"><BookOpen size={14} /> Disciplina</span>
               <select 
                className="task-select discipline-select"
                value={currentTask.discipline}
                onChange={(e) => setCurrentTask({ discipline: e.target.value, topic: '' })}
               >
                 <option value="">Selecione...</option>
                 {conteudo.cronograma.map((bg, i) => (
                   <option key={i} value={bg.disciplina} className="dark-option">{bg.disciplina}</option>
                 ))}
               </select>
             </div>
             <div className="task-field">
               <span className="task-label"><List size={14} /> Tópico</span>
               <select 
                className="task-select topic-select"
                value={currentTask.topic}
                disabled={!currentTask.discipline}
                onChange={(e) => setCurrentTask({ ...currentTask, topic: e.target.value })}
               >
                 <option value="">Selecione...</option>
                 {availableTopics.map((t, i) => (
                   <option key={i} value={t} className="dark-option">{t}</option>
                 ))}
                 {currentTask.discipline && <option value="Outro (Manual)" className="dark-option">Outro... (Digite abaixo)</option>}
               </select>
             </div>
          </div>
          {currentTask.topic === 'Outro (Manual)' && (
            <div className="manual-topic-row animate-fade-in">
              <input 
                className="task-input-inline" 
                placeholder="Qual o tópico?" 
                autoFocus
                onChange={(e) => setCurrentTask({ ...currentTask, topic: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="glass-card timer-card">
        <div className="timer-header">
          <div className="header-spacer" />
          <div className="mode-selector">
            <button className={`mode-btn ${mode === 'study' ? 'active study' : ''}`} onClick={() => switchMode('study')}>Foco</button>
            <button className={`mode-btn ${mode === 'shortBreak' ? 'active break' : ''}`} onClick={() => switchMode('shortBreak')}>Pausa Curta</button>
            <button className={`mode-btn ${mode === 'longBreak' ? 'active break' : ''}`} onClick={() => switchMode('longBreak')}>Pausa Longa</button>
          </div>
          <div className="timer-actions-top">
            <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Configurações">
              <Settings size={20} className="icon-accent" />
            </button>
            <button className="icon-btn" onClick={() => setIsFocusMode(!isFocusMode)} title="Modo Foco">
              {isFocusMode ? <Minimize2 size={20} className="icon-accent" /> : <Maximize2 size={20} className="icon-accent" />}
            </button>
          </div>
        </div>

        <div className="timer-display">
          <h1 className="timer-text">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</h1>
          <p className="timer-status">
            {mode === 'study' ? (currentTask.discipline ? `Estudando: ${currentTask.discipline}` : 'Hora de focar!') : 'Hora de descansar!'}
          </p>
        </div>

        {showSettings && (
          <div className="settings-panel animate-fade-in">
            <div className="setting-group"><label>Estudo</label><input type="number" name="study" value={settings.study} onChange={handleSettingChange} /></div>
            <div className="setting-group"><label>Curta</label><input type="number" name="short" value={settings.short} onChange={handleSettingChange} /></div>
            <div className="setting-group"><label>Longa</label><input type="number" name="long" value={settings.long} onChange={handleSettingChange} /></div>
          </div>
        )}

        <div className="timer-controls">
          <button className="reset-btn" onClick={resetTimer}><RotateCcw size={24} /></button>
          <button className={`main-control ${isActive ? 'pause' : 'play'}`} onClick={toggleTimer}>
            {isActive ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" />}
          </button>
          <button className="next-btn" onClick={handleTimerComplete}><CheckCircle size={24} /></button>
        </div>
      </div>

      <style jsx>{`
        .pomodoro-container { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width: 100%; }
        .timer-details { width: 100%; max-width: 500px; padding: 20px; }
        .task-info { display: flex; flex-direction: column; gap: 16px; }
        .task-header-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .task-field { display: flex; flex-direction: column; gap: 8px; }
        .task-label { font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted); display: flex; align-items: center; gap: 4px; font-weight: 700; }
        .task-select { 
          background: rgba(0, 0, 0, 0.4); 
          border: 1px solid var(--border-color); 
          color: white; 
          border-radius: 12px; 
          padding: 10px 14px; 
          font-size: 0.85rem; 
          cursor: pointer; 
          color-scheme: dark;
          outline: none;
          transition: var(--transition);
        }
        .task-select:focus { border-color: var(--accent-primary); background: rgba(0, 0, 0, 0.6); }
        .dark-option { background-color: #0c0d10; color: white; }
        .task-input-inline { background: rgba(255, 255, 255, 0.05); border: 1px solid var(--accent-primary); color: white; border-radius: 8px; padding: 10px; width: 100%; outline: none; }
        
        .timer-card { width: 100%; max-width: 500px; padding: 32px; display: flex; flex-direction: column; align-items: center; gap: 40px; }
        .fullscreen .timer-card { max-width: 800px; background: transparent; border: none; box-shadow: none; }
        .fullscreen .timer-details { display: none; }

        .timer-header { width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .header-spacer, .timer-actions-top { flex: 1; display: flex; }
        .timer-actions-top { justify-content: flex-end; gap: 8px; }
        
        .icon-btn { 
          width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.03); color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: var(--transition);
        }
        .icon-btn:hover { background: rgba(255, 71, 87, 0.1); border-color: rgba(255, 71, 87, 0.3); color: var(--accent-primary); }
        .icon-accent { color: var(--accent-primary); }

        .mode-selector { display: flex; background: rgba(255, 255, 255, 0.05); padding: 4px; border-radius: 100px; gap: 4px; }
        .mode-btn { padding: 8px 16px; border-radius: 100px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: var(--transition); }
        .mode-btn.active.study { background: var(--accent-primary); color: white; box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3); }
        .mode-btn.active.break { background: var(--success); color: white; box-shadow: 0 4px 12px rgba(46, 213, 115, 0.3); }

        .timer-display { text-align: center; margin: 10px 0; }
        .timer-text { font-family: 'JetBrains Mono', monospace; font-size: 5rem; font-weight: 700; color: white; line-height: 1; }
        .fullscreen .timer-text { font-size: 8rem; }

        @media (min-width: 768px) {
          .timer-text { font-size: 8rem; }
          .fullscreen .timer-text { font-size: 15rem; }
        }

        .timer-controls { display: flex; align-items: center; gap: 24px; }
        @media (min-width: 768px) { .timer-controls { gap: 32px; } }
        
        .main-control { width: 72px; height: 72px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        @media (min-width: 768px) { .main-control { width: 80px; height: 80px; } }
        
        .main-control.play { background: var(--accent-primary); box-shadow: 0 0 20px rgba(255, 71, 87, 0.4); }
        .main-control.pause { background: rgba(255,255,255,0.1); }
        .main-control:hover { transform: scale(1.1); }
        .reset-btn, .next-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 12px; }
        .reset-btn:hover, .next-btn:hover { color: white; }

        .settings-panel { width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: rgba(255, 255, 255, 0.03); padding: 16px; border-radius: 16px; }
        .setting-group label { display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 6px; text-align: center; }
        .setting-group input { text-align: center; padding: 8px; font-size: 1rem; }

        @media (max-width: 600px) {
          .timer-card { padding: 24px; gap: 32px; }
          .mode-btn { padding: 8px 12px; font-size: 0.75rem; }
          .task-header-row { grid-template-columns: 1fr; }
        }

      `}</style>
    </div>
  );
};

export default PomodoroTimer;
