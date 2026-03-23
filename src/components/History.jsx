import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History as HistoryIcon, PlusCircle, CheckCircle, Clock, Calendar, Trash2, BookOpen } from 'lucide-react';
import conteudo from '../../conteudo.json';

const History = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    duration: 25, 
    topic: '',
    discipline: '' 
  });

  useEffect(() => {
    fetchHistory();
  }, []);

  const cleanName = (name) => {
    if (!name) return '';
    const base = name.replace(/\s*\[cite:\s*\d+\]/g, '').trim();
    if (base === base.toUpperCase()) {
      return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    }
    return base;
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .order('completed_at', { ascending: false });
    
    setSessions(data || []);
    setLoading(false);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [year, month, day] = formData.date.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    const { error } = await supabase
      .from('pomodoro_sessions')
      .insert({
        user_id: user.id,
        duration_minutes: parseInt(formData.duration),
        completed_at: date.toISOString(),
        topic: formData.topic || 'Sessão Manual',
        discipline: cleanName(formData.discipline)
      });

    if (error) {
      alert('Erro ao adicionar pomodoro');
    } else {
      setFormData({ ...formData, topic: '', discipline: '' });
      fetchHistory();
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Tem certeza que deseja remover este registro?')) return;
    const { error } = await supabase
      .from('pomodoro_sessions')
      .delete()
      .eq('id', id);
    
    if (error) alert('Erro ao remover');
    else fetchHistory();
  };

  return (
    <div className="history-container animate-fade-in">
      <div className="history-header">
        <h1>Histórico</h1>
        <p>Acompanhe suas sessões passadas ou registre pomodoros esquecidos.</p>
      </div>

      <div className="history-main">
        <div className="glass-card add-manual-card">
          <h3><PlusCircle size={20} /> Registrar Pomodoro</h3>
          <form onSubmit={handleManualAdd}>
            <div className="form-grid">
              <div className="form-group">
                <label>Data</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                  required
                />
              </div>
              <div className="form-group">
                <label>Duração (min)</label>
                <input 
                  type="number" 
                  value={formData.duration} 
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })} 
                  min="1"
                  required
                />
              </div>
              <div className="form-group full-width">
                <label><BookOpen size={12} /> Disciplina</label>
                <select 
                  value={formData.discipline}
                  onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {conteudo.cronograma.map((bg, i) => (
                    <option key={i} value={bg.disciplina}>{bg.disciplina}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Tópico / Descrição</label>
                <input 
                  type="text" 
                  placeholder="O que você estudou?" 
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })} 
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              Registrar Sessão
            </button>
          </form>
        </div>

        <div className="history-list glass-card">
          <div className="list-header">
            <h3>Sessões Recentes</h3>
            <span className="count-badge">{sessions.length} total</span>
          </div>
          
          <div className="sessions-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Disciplina / Tópico</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        {format(parseISO(session.completed_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </td>
                    <td>
                      <div className="duration-cell">
                        <Clock size={14} />
                        {session.duration_minutes} min
                      </div>
                    </td>
                    <td>
                      <div className="topic-group">
                        <span className="discipline-text">{cleanName(session.discipline) || 'Livre'}</span>
                        <span className="topic-subtext">{session.topic || '--'}</span>
                      </div>
                    </td>
                    <td>
                      <button className="delete-btn" onClick={() => deleteSession(session.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="empty-state">Nenhuma sessão registrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .history-container { display: flex; flex-direction: column; gap: 32px; }
        .history-header h1 { font-size: 2rem; }
        
        .history-main {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 24px;
        }

        .add-manual-card {
          padding: 24px;
          height: fit-content;
        }

        .add-manual-card h3 {
          display: flex; align-items: center; gap: 10px; margin-bottom: 24px; color: var(--accent-primary);
        }

        .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
        .full-width { grid-column: span 2; }
        .form-group label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }

        .history-list { padding: 24px; overflow: hidden; }
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .count-badge { background: rgba(255, 255, 255, 0.05); padding: 4px 12px; border-radius: 100px; font-size: 0.8rem; color: var(--text-secondary); }

        .sessions-table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 400px; }
        th { text-align: left; padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        td { padding: 16px 12px; color: var(--text-secondary); border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 0.9rem; }
        
        .date-cell, .duration-cell { display: flex; align-items: center; gap: 8px; }
        .topic-group { display: flex; flex-direction: column; gap: 4px; }
        .discipline-text { color: white; font-weight: 600; font-size: 0.95rem; }
        .topic-subtext { color: var(--text-muted); font-size: 0.8rem; }
        
        .delete-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: color 0.2s; }
        .delete-btn:hover { color: #ff4757; }

        .empty-state { text-align: center; padding: 40px; color: var(--text-muted); font-style: italic; }

        @media (max-width: 1000px) {
          .history-main { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default History;
