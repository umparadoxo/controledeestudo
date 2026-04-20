import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import conteudo from '../../conteudo.json';
import { Play, Pause, RotateCcw, Settings, Maximize2, Minimize2, CheckCircle, BookOpen, List, ChevronDown, Search, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const PomodoroTimer = ({ isFocusMode, setIsFocusMode, initialTask, onClearTask }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('study'); // study, shortBreak
  const [settings, setSettings] = useState({ study: 25, short: 5 });
  const [showSettings, setShowSettings] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  // Task state
  const [currentTask, setCurrentTask] = useState({
    discipline: initialTask?.discipline || '',
    topic: initialTask?.topic || ''
  });
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const timerRef = useRef(null);

  // Helper to get topics for the current discipline
  const availableTopics = React.useMemo(() => {
    if (!currentTask.discipline) return [];
    const discipline = conteudo.cronograma.find(d => d.disciplina === currentTask.discipline);
    return discipline ? discipline.assuntos.flatMap(a => a.topicos) : [];
  }, [currentTask.discipline]);

  const filteredTopics = availableTopics.filter(t => 
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTopicSelect = (topic) => {
    setCurrentTask({ ...currentTask, topic });
    setIsTopicModalOpen(false);
    setSearchTerm('');
  };

  const handleDisciplineSelect = (discipline) => {
    setCurrentTask({ discipline, topic: '' });
    setIsDisciplineModalOpen(false);
    setSearchTerm('');
  };

  useEffect(() => {
    if (isTopicModalOpen || isDisciplineModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isTopicModalOpen, isDisciplineModalOpen]);

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
      switchMode('shortBreak');
    } else switchMode('study');
  };

  const switchMode = (newMode) => {
    setMode(newMode); setIsActive(false);
    const time = newMode === 'study' ? settings.study : settings.short;
    setMinutes(time); setSeconds(0);
  };

  const toggleTimer = () => { if (!isActive) playSound('start'); setIsActive(!isActive); };
  const resetTimer = () => { setIsActive(false); switchMode(mode); };

  const handleSettingChange = (e) => {
    const { name, value } = e.target;
    const val = parseInt(value) || 1;
    setSettings(prev => ({ ...prev, [name]: val }));
    if (!isActive && mode === name || (name === 'short' && mode === 'shortBreak')) {
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
               <div 
                className="task-select-trigger"
                onClick={() => setIsDisciplineModalOpen(true)}
               >
                 <span className="selected-value">
                   {currentTask.discipline || 'Selecionar disciplina...'}
                 </span>
                 <ChevronDown size={16} />
               </div>
             </div>
             <div className="task-field">
               <span className="task-label"><List size={14} /> Tópico</span>
               <div 
                className={`task-select-trigger ${!currentTask.discipline ? 'disabled' : ''}`}
                onClick={() => currentTask.discipline && setIsTopicModalOpen(true)}
               >
                 <span className="selected-value">
                   {currentTask.topic || (currentTask.discipline ? 'Selecionar tópico...' : 'Escolha a disciplina primeiro')}
                 </span>
                 <ChevronDown size={16} />
               </div>
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

      {/* Topic Selection Modal */}
      {isTopicModalOpen && createPortal(
        <div className="modal-overlay animate-fade-in" onClick={() => setIsTopicModalOpen(false)}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Selecionar Tópico</h3>
                <p>{currentTask.discipline}</p>
              </div>
              <button className="close-modal-btn" onClick={() => setIsTopicModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-search">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar tópico..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className="topics-list-container">
              <button 
                className={`topic-option-btn ${currentTask.topic === 'Outro (Manual)' ? 'selected' : ''}`}
                onClick={() => handleTopicSelect('Outro (Manual)')}
              >
                <span className="topic-text">Outro... (Digitar manualmente)</span>
              </button>
              
              {filteredTopics.map((topic, i) => (
                <button 
                  key={i} 
                  className={`topic-option-btn ${currentTask.topic === topic ? 'selected' : ''}`}
                  onClick={() => handleTopicSelect(topic)}
                >
                  <span className="topic-text">{topic}</span>
                </button>
              ))}

              {filteredTopics.length === 0 && searchTerm && (
                <div className="no-topics-found">
                  Nenhum tópico encontrado para "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Discipline Selection Modal */}
      {isDisciplineModalOpen && createPortal(
        <div className="modal-overlay animate-fade-in" onClick={() => setIsDisciplineModalOpen(false)}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Selecionar Disciplina</h3>
                <p>Escolha o que vai estudar agora</p>
              </div>
              <button className="close-modal-btn" onClick={() => setIsDisciplineModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-search">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar disciplina..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className="topics-list-container">
              {conteudo.cronograma
                .filter(d => d.disciplina.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((bg, i) => (
                <button 
                  key={i} 
                  className={`topic-option-btn ${currentTask.discipline === bg.disciplina ? 'selected' : ''}`}
                  onClick={() => handleDisciplineSelect(bg.disciplina)}
                >
                  <span className="topic-text">{bg.disciplina}</span>
                </button>
              ))}

              {conteudo.cronograma.filter(d => d.disciplina.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <div className="no-topics-found">
                  Nenhuma disciplina encontrada para "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="glass-card timer-card">
        <div className="timer-header">
          <div className="header-spacer" />
          <div className="mode-selector">
            <button className={`mode-btn ${mode === 'study' ? 'active study' : ''}`} onClick={() => switchMode('study')}>Foco</button>
            <button className={`mode-btn ${mode === 'shortBreak' ? 'active break' : ''}`} onClick={() => switchMode('shortBreak')}>Pausa</button>
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
          <div className="settings-panel animate-fade-in two-cols">
            <div className="setting-group"><label>Estudo</label><input type="number" name="study" value={settings.study} onChange={handleSettingChange} /></div>
            <div className="setting-group"><label>Pausa</label><input type="number" name="short" value={settings.short} onChange={handleSettingChange} /></div>
          </div>
        )}

        <div className="timer-controls">
          <button className="reset-btn" onClick={resetTimer}><RotateCcw size={24} /></button>
          <button className={`main-control ${isActive ? 'pause' : 'play'}`} onClick={toggleTimer}>
            {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
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
        .task-select, .task-select-trigger { 
          background: var(--input-bg); 
          border: 1px solid var(--border-color); 
          color: var(--text-primary); 
          border-radius: 12px; 
          padding: 10px 14px; 
          font-size: 0.85rem; 
          cursor: pointer; 
          color-scheme: var(--color-scheme);
          outline: none;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 42px;
        }
        .task-select-trigger.disabled { opacity: 0.5; cursor: not-allowed; background: rgba(0,0,0,0.05); }
        .task-select:focus, .task-select-trigger:not(.disabled):hover { border-color: var(--accent-primary); background: var(--input-bg); }
        .selected-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
        .dark-option { background-color: var(--bg-color); color: var(--text-primary); }
        .task-input-inline { background: var(--input-bg); border: 1px solid var(--accent-primary); color: var(--text-primary); border-radius: 8px; padding: 10px; width: 100%; outline: none; margin-top: 8px; }

        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 5000; padding: 20px;
        }
        .modal-content {
          width: 100%; max-width: 600px; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
          padding: 0; border: 1px solid var(--border-color);
          background: var(--bg-color);
        }
        .modal-header {
          padding: 24px; border-bottom: 1px solid var(--border-color);
          display: flex; justify-content: space-between; align-items: flex-start;
        }
        .modal-title-group h3 { margin: 0; font-size: 1.25rem; color: var(--text-primary); }
        .modal-title-group p { margin: 4px 0 0; font-size: 0.85rem; color: var(--text-muted); }
        .close-modal-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: var(--transition); }
        .close-modal-btn:hover { color: var(--accent-primary); transform: rotate(90deg); }

        .modal-search {
          padding: 16px 24px; display: flex; align-items: center; gap: 12px;
          background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color);
        }
        .modal-search input {
          flex: 1; background: transparent; border: none; color: var(--text-primary);
          font-size: 1rem; outline: none;
        }
        .modal-search svg { color: var(--text-muted); }

        .topics-list-container {
          flex: 1; overflow-y: auto; padding: 12px;
          display: flex; flex-direction: column; gap: 8px;
        }
        .topic-option-btn {
          padding: 14px 20px; text-align: left; background: transparent;
          border: 1px solid transparent; border-radius: 12px;
          color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center;
        }
        .topic-option-btn:hover { background: rgba(255, 71, 87, 0.05); color: var(--accent-primary); border-color: rgba(255, 71, 87, 0.1); }
        .topic-option-btn.selected { background: var(--accent-primary); color: white; }
        .topic-text { font-size: 0.95rem; line-height: 1.4; }
        .no-topics-found { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }

        @media (max-width: 600px) {
          .modal-overlay {
            align-items: stretch;
            padding: 0;
            background: var(--bg-color);
            z-index: 99999;
          }
          .modal-content {
            height: 100% !important;
            max-height: 100% !important;
            width: 100%;
            border-radius: 0;
            border: none;
            background: var(--bg-color);
          }
          .modal-header {
            padding: 24px 20px;
          }
          .modal-title-group h3 {
            font-size: 1.3rem;
          }
          .modal-title-group p {
            display: block; /* Volta a mostrar o subtítulo já que temos espaço agora */
            font-size: 0.9rem;
          }
          .modal-search {
            padding: 16px 20px;
          }
        }
        
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
        .timer-text { font-family: 'JetBrains Mono', monospace; font-size: 5rem; font-weight: 700; color: var(--text-primary); line-height: 1; }
        .fullscreen .timer-text { font-size: 8rem; }

        @media (min-width: 768px) {
          .timer-text { font-size: 8rem; }
          .fullscreen .timer-text { font-size: 15rem; }
        }

        .timer-controls { display: flex; align-items: center; gap: 24px; }
        @media (min-width: 768px) { .timer-controls { gap: 32px; } }
        
        .main-control { width: 72px; height: 72px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        @media (min-width: 768px) { .main-control { width: 80px; height: 80px; } }
        
        .main-control.play { background: var(--accent-primary); color: white; box-shadow: 0 0 20px rgba(255, 71, 87, 0.4); }
        .main-control.pause { background: var(--accent-secondary); color: var(--text-primary); }
        .main-control:hover { transform: scale(1.1); }
        .reset-btn, .next-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 12px; }
        .reset-btn:hover, .next-btn:hover { color: var(--text-primary); }

        .settings-panel { width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: rgba(255, 255, 255, 0.03); padding: 16px; border-radius: 16px; }
        .settings-panel.two-cols { grid-template-columns: 1fr 1fr; }
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
