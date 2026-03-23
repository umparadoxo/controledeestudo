import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import conteudo from '../../conteudo.json';
import { Save, Calendar, BookOpen, Plus, X } from 'lucide-react';

const Planning = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
                    <select 
                      className="discipline-select-card"
                      value={task.discipline} 
                      onChange={(e) => handleTaskChange(day.day_of_week, idx, e.target.value)}
                    >
                      <option value="" style={{backgroundColor: '#0c0d10', color: 'white'}}>Selecione...</option>
                      {conteudo.cronograma.map((bg, i) => (
                        <option key={i} value={bg.disciplina} style={{backgroundColor: '#0c0d10', color: 'white'}}>{bg.disciplina}</option>
                      ))}
                    </select>
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
          border: 1px solid var(--border-color); background: #1a1b1e; color: #ff4757;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 5;
        }

        .add-task-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); color: var(--text-secondary);
          padding: 12px; border-radius: 12px; cursor: pointer; font-size: 0.85rem;
          min-height: 44px;
        }
        .add-task-btn:hover { background: rgba(255, 255, 255, 0.05); color: white; }
        .loading { display: flex; justify-content: center; align-items: center; height: 300px; color: white; }

      `}</style>
    </div>
  );
};

export default Planning;
