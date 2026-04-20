import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import conteudo from '../../conteudo.json';
import { Save, Calendar, BookOpen, Plus, X, Search, ChevronDown } from 'lucide-react';

const Planning = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSelection, setActiveSelection] = useState(null); // { dayId, taskIndex }

  const daysOfWeek = [
    { id: 0, name: 'Domingo' },
    { id: 1, name: 'Segunda-feira' },
    { id: 2, name: 'Terça-feira' },
    { id: 3, name: 'Quarta-feira' },
    { id: 4, name: 'Quinta-feira' },
    { id: 5, name: 'Sexta-feira' },
    { id: 6, name: 'Sábado' },
  ];

  useEffect(() => {
    fetchPlans();
  }, []);

  const cleanName = (name) => {
    if (!name) return '';
    const base = name.replace(/\s*\[cite:\s*\d+\]/g, '').trim();
    if (base === base.toUpperCase()) {
      return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    }
    return base;
  };

  const fetchPlans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('study_plans')
      .select('*')
      .order('day_of_week', { ascending: true });

    const initialPlans = daysOfWeek.map(day => {
      const dayTasks = data?.filter(p => p.day_of_week === day.id) || [];
      return {
        day_of_week: day.id,
        name: day.name,
        tasks: dayTasks.length > 0 
          ? dayTasks.map(t => ({ discipline: cleanName(t.discipline) }))
          : [{ discipline: '' }]
      };
    });

    setPlans(initialPlans);
    setLoading(false);
  };

  const handleTaskChange = (dayId, taskIndex, value) => {
    setPlans(prev => prev.map(day => {
      if (day.day_of_week === dayId) {
        const newTasks = [...day.tasks];
        newTasks[taskIndex] = { discipline: value };
        return { ...day, tasks: newTasks };
      }
      return day;
    }));
  };

  const addTask = (dayId) => {
    setPlans(prev => prev.map(day => {
      if (day.day_of_week === dayId) {
        return { ...day, tasks: [...day.tasks, { discipline: '' }] };
      }
      return day;
    }));
  };

  const removeTask = (dayId, taskIndex) => {
    setPlans(prev => prev.map(day => {
      if (day.day_of_week === dayId) {
        const newTasks = day.tasks.filter((_, i) => i !== taskIndex);
        return { ...day, tasks: newTasks.length > 0 ? newTasks : [{ discipline: '' }] };
      }
      return day;
    }));
  };

  const handleDisciplineSelect = (discipline) => {
    if (activeSelection) {
      handleTaskChange(activeSelection.dayId, activeSelection.taskIndex, discipline);
    }
    setIsModalOpen(false);
    setSearchTerm('');
    setActiveSelection(null);
  };

  const filteredDisciplines = conteudo.cronograma.filter(d => 
    d.disciplina.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  const savePlans = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('study_plans').delete().eq('user_id', user.id);

    const rowsToInsert = [];
    plans.forEach(day => {
      day.tasks.forEach(task => {
        if (task.discipline) {
          rowsToInsert.push({
            user_id: user.id,
            day_of_week: day.day_of_week,
            discipline: cleanName(task.discipline),
            topic: '' // Topic is now chosen during study
          });
        }
      });
    });

    if (rowsToInsert.length > 0) {
      await supabase.from('study_plans').insert(rowsToInsert);
    }

    setSaving(false);
    alert('Planejamento salvo!');
  };

  if (loading) return <div className="loading">Carregando planejamento...</div>;

  return (
    <div className="planning-container animate-fade-in">
      <div className="planning-header">
        <div className="header-info">
          <h1>Cronograma Semanal</h1>
          <p>Escolha as disciplinas para cada dia. O tópico específico você escolhe na hora de estudar!</p>
        </div>
        <button className="btn btn-primary" onClick={savePlans} disabled={saving}>
          <Save size={18} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="planning-grid">
        {plans.map((day) => (
          <div key={day.day_of_week} className="glass-card day-card">
            <div className="day-header">
              <Calendar size={18} />
              <h3>{day.name}</h3>
            </div>
            
            <div className="tasks-list">
              {day.tasks.map((task, idx) => (
                <div key={idx} className="task-row">
                  <div className="select-group">
                    <label><BookOpen size={12} /> Disciplina</label>
                    <div 
                      className="discipline-select-trigger"
                      onClick={() => {
                        setActiveSelection({ dayId: day.day_of_week, taskIndex: idx });
                        setIsModalOpen(true);
                      }}
                    >
                      <span>{task.discipline || 'Selecionar...'}</span>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  {day.tasks.length > 1 && (
                    <button className="remove-task-btn" onClick={() => removeTask(day.day_of_week, idx)}>
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button className="add-task-btn" onClick={() => addTask(day.day_of_week)}>
              <Plus size={16} /> Adicionar Disciplina
            </button>
          </div>
        ))}
      </div>

      {/* Discipline Selection Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Selecionar Disciplina</h3>
                <p>Escolha a disciplina para o seu cronograma</p>
              </div>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
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

            <div className="disciplines-list">
              {filteredDisciplines.map((d, i) => (
                <button 
                  key={i} 
                  className={`discipline-option ${activeSelection && plans.find(p => p.day_of_week === activeSelection.dayId).tasks[activeSelection.taskIndex].discipline === d.disciplina ? 'selected' : ''}`}
                  onClick={() => handleDisciplineSelect(d.disciplina)}
                >
                  <span className="discipline-text">{d.disciplina}</span>
                </button>
              ))}
              {filteredDisciplines.length === 0 && (
                <div className="no-results">Nenhuma disciplina encontrada.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .planning-container { display: flex; flex-direction: column; gap: 32px; }
        .planning-header { display: flex; justify-content: space-between; align-items: center; }
        .planning-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .day-card { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .day-header { display: flex; align-items: center; gap: 12px; color: var(--accent-primary); }
        .tasks-list { display: flex; flex-direction: column; gap: 12px; }
        .task-row { display: flex; gap: 10px; align-items: flex-end; position: relative; }
        .select-group { flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .select-group label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
        
        .remove-task-btn { 
          position: absolute; top: -10px; right: -10px; width: 28px; height: 28px; border-radius: 50%;
          border: 1px solid var(--border-color); background: var(--accent-secondary); color: #ff4757;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: var(--card-shadow); z-index: 5;
        }

        .add-task-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: var(--input-bg); border: 1px dashed var(--border-color); color: var(--text-secondary);
          padding: 12px; border-radius: 12px; cursor: pointer; font-size: 0.85rem;
          min-height: 44px;
        }
        .add-task-btn:hover { background: var(--accent-secondary); color: var(--text-primary); }
        .loading { display: flex; justify-content: center; align-items: center; height: 300px; color: var(--text-primary); }

        .discipline-select-trigger {
          background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 10px;
          padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
          color: var(--text-primary); cursor: pointer; transition: all 0.2s; font-size: 0.85rem;
          min-height: 40px;
        }
        .discipline-select-trigger:hover { border-color: var(--accent-primary); background: rgba(255, 71, 87, 0.03); }

        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
        }
        .modal-content {
          width: 100%; max-width: 500px; max-height: 80vh;
          display: flex; flex-direction: column; overflow: hidden;
          padding: 0; border: 1px solid var(--border-color);
          background: var(--bg-color);
        }
        .modal-header { padding: 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; }
        .modal-title-group h3 { margin: 0; font-size: 1.2rem; color: var(--text-primary); }
        .modal-title-group p { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        .close-modal-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
        .close-modal-btn:hover { color: var(--accent-primary); transform: rotate(90deg); }

        .modal-search { padding: 16px 24px; display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color); }
        .modal-search input { flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 0.95rem; outline: none; }
        .modal-search svg { color: var(--text-muted); }

        .disciplines-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .discipline-option {
          padding: 12px 16px; text-align: left; background: transparent; border: 1px solid transparent;
          border-radius: 10px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
        }
        .discipline-option:hover { background: rgba(255, 71, 87, 0.05); color: var(--accent-primary); }
        .discipline-option.selected { background: var(--accent-primary); color: white; }
        .discipline-text { font-size: 0.9rem; }
        .no-results { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }

        @media (max-width: 600px) {
          .modal-overlay { align-items: stretch; padding: 0; background: var(--bg-color); z-index: 99999; }
          .modal-content { height: 100% !important; max-height: 100% !important; width: 100%; border-radius: 0; border: none; background: var(--bg-color); }
          .modal-header { padding: 24px 20px; }
          .modal-title-group h3 { font-size: 1.3rem; }
          .modal-title-group p { display: block; font-size: 0.9rem; }
          .modal-search { padding: 16px 20px; }
          .planning-header { display: none; }
        }

      `}</style>
    </div>
  );
};

export default Planning;
