import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History as HistoryIcon, PlusCircle, Clock, Calendar, Trash2, BookOpen, Edit2, X, Check, Search, ChevronDown, List } from 'lucide-react';
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    duration: 25,
    topic: '',
    discipline: ''
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isEditTopicModalOpen, setIsEditTopicModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRow, setActiveRow] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isEditModalOpen || isTopicModalOpen || isEditTopicModalOpen;
    document.body.style.overflow = isAnyModalOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen, isEditModalOpen, isTopicModalOpen, isEditTopicModalOpen]);

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

  const startEdit = (session) => {
    setEditingId(session.id);
    setEditForm({
      date: format(parseISO(session.completed_at), 'yyyy-MM-dd'),
      duration: session.duration_minutes,
      topic: session.topic || '',
      discipline: session.discipline || ''
    });
  };

  const handleUpdate = async (id) => {
    const [year, month, day] = editForm.date.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);

    const { error } = await supabase
      .from('pomodoro_sessions')
      .update({
        duration_minutes: parseInt(editForm.duration),
        completed_at: date.toISOString(),
        topic: editForm.topic,
        discipline: cleanName(editForm.discipline)
      })
      .eq('id', id);

    if (error) alert('Erro ao atualizar registro');
    else { setEditingId(null); fetchHistory(); }
  };

  const handleDisciplineSelect = (discipline, isEdit = false) => {
    if (isEdit) setEditForm({ ...editForm, discipline, topic: '' });
    else setFormData({ ...formData, discipline, topic: '' });
    setIsModalOpen(false); setIsEditModalOpen(false);
    setSearchTerm('');
  };

  const handleTopicSelect = (topic, isEdit = false) => {
    if (isEdit) setEditForm({ ...editForm, topic: topic === 'Outro...' ? '' : topic });
    else setFormData({ ...formData, topic: topic === 'Outro...' ? '' : topic });
    setIsTopicModalOpen(false); setIsEditTopicModalOpen(false);
    setSearchTerm('');
  };

  const getAvailableTopics = (disciplineName) => {
    if (!disciplineName) return [];
    const discipline = conteudo.cronograma.find(d => d.disciplina === disciplineName);
    return discipline ? discipline.assuntos.flatMap(a => a.topicos) : [];
  };

  const filteredDisciplines = conteudo.cronograma.filter(d => 
    d.disciplina.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTopics = (isEdit = false) => {
    const discipline = isEdit ? editForm.discipline : formData.discipline;
    return getAvailableTopics(discipline).filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const groupedSessions = sessions.reduce((acc, session) => {
    const date = parseISO(session.completed_at);
    const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
    const monthKey = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(session);
    return acc;
  }, {});

  if (loading) return <div className="loading">Carregando histórico...</div>;

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
                <label><Calendar size={12} /> Data</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label><Clock size={12} /> Duração (min)</label>
                <input type="number" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} min="1" required />
              </div>
              <div className="form-group full-width">
                <label><BookOpen size={12} /> Disciplina</label>
                <div className="modal-select-trigger" onClick={() => setIsModalOpen(true)}>
                  <span>{formData.discipline || 'Selecionar disciplina...'}</span>
                  <ChevronDown size={16} />
                </div>
              </div>
              <div className="form-group full-width">
                <label><List size={12} /> Tópico</label>
                <div className={`modal-select-trigger ${!formData.discipline ? 'disabled' : ''}`} onClick={() => formData.discipline && setIsTopicModalOpen(true)}>
                  <span>{formData.topic || (formData.discipline ? 'Selecionar tópico...' : 'Selecione a disciplina primeiro')}</span>
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Registrar Sessão</button>
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
                  <th>Disciplina</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedSessions).map(([month, monthSessions]) => (
                  <React.Fragment key={month}>
                    <tr className="month-row">
                      <td colSpan="3">{month}</td>
                    </tr>
                    {monthSessions.map((session) => (
                      <tr 
                        key={session.id} 
                        className={`${editingId === session.id ? 'editing-row' : ''} ${activeRow === session.id ? 'active-row' : ''}`}
                        onClick={() => setActiveRow(activeRow === session.id ? null : session.id)}
                      >
                        <td>
                          {editingId === session.id ? (
                            <input type="date" className="edit-input" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                          ) : (
                            <div className="date-cell"><Calendar size={14} /> {format(parseISO(session.completed_at), "dd/MM", { locale: ptBR })}</div>
                          )}
                        </td>
                        <td>
                          {editingId === session.id ? (
                            <input type="number" className="edit-input duration-input" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} />
                          ) : (
                            <div className="duration-cell"><Clock size={14} /> {session.duration_minutes} min</div>
                          )}
                        </td>
                        <td>
                          {editingId === session.id ? (
                            <div className="edit-topic-group">
                              <div className="edit-actions-inline">
                                <button className="save-btn" onClick={() => handleUpdate(session.id)} title="Salvar"><Check size={18} /></button>
                                <button className="cancel-btn" onClick={() => setEditingId(null)} title="Cancelar"><X size={18} /></button>
                              </div>
                              <div className="modal-select-trigger edit-select" onClick={() => setIsEditModalOpen(true)}>
                                <span>{editForm.discipline || 'Disciplina...'}</span>
                                <ChevronDown size={14} />
                              </div>
                              <div className={`modal-select-trigger edit-select ${!editForm.discipline ? 'disabled' : ''}`} onClick={() => editForm.discipline && setIsEditTopicModalOpen(true)}>
                                <span>{editForm.topic || 'Tópico...'}</span>
                                <ChevronDown size={14} />
                              </div>
                            </div>
                          ) : (
                            <div className="topic-group-horizontal">
                              <span className="discipline-text">{cleanName(session.discipline) || 'Livre'}</span>
                              <div className="row-actions-overlay">
                                <button className="edit-btn" onClick={(e) => { e.stopPropagation(); startEdit(session); }} title="Editar"><Edit2 size={14} /></button>
                                <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} title="Remover"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan="3" className="no-results">Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Portals for Modals */}
      {(isModalOpen || isEditModalOpen) && createPortal(
        <div className="modal-overlay animate-fade-in" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group"><h3>Selecionar Disciplina</h3><p>Escolha a matéria estudada</p></div>
              <button className="close-modal-btn" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}><X size={20} /></button>
            </div>
            <div className="modal-search"><Search size={18} /><input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus /></div>
            <div className="disciplines-list">
              {filteredDisciplines.map((d, i) => (
                <button key={i} className={`discipline-option ${(isModalOpen ? formData.discipline : editForm.discipline) === d.disciplina ? 'selected' : ''}`} onClick={() => handleDisciplineSelect(d.disciplina, isEditModalOpen)}>
                  <span className="discipline-text">{d.disciplina}</span>
                </button>
              ))}
            </div>
          </div>
        </div>, document.body
      )}

      {(isTopicModalOpen || isEditTopicModalOpen) && createPortal(
        <div className="modal-overlay animate-fade-in" onClick={() => { setIsTopicModalOpen(false); setIsEditTopicModalOpen(false); }}>
          <div className="modal-content glass-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group"><h3>Selecionar Tópico</h3><p>{isEditTopicModalOpen ? editForm.discipline : formData.discipline}</p></div>
              <button className="close-modal-btn" onClick={() => { setIsTopicModalOpen(false); setIsEditTopicModalOpen(false); }}><X size={20} /></button>
            </div>
            <div className="modal-search"><Search size={18} /><input type="text" placeholder="Pesquisar tópico..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus /></div>
            <div className="disciplines-list">
              <button className="discipline-option" onClick={() => { const other = prompt('Digite o tópico:'); if (other) handleTopicSelect(other, isEditTopicModalOpen); }}>
                <span className="discipline-text">Outro...</span>
              </button>
              {filteredTopics(isEditTopicModalOpen).map((t, i) => (
                <button key={i} className={`discipline-option ${(isEditTopicModalOpen ? editForm.topic : formData.topic) === t ? 'selected' : ''}`} onClick={() => handleTopicSelect(t, isEditTopicModalOpen)}>
                  <span className="discipline-text">{t}</span>
                </button>
              ))}
              {filteredTopics(isEditTopicModalOpen).length === 0 && <div className="no-results">Nenhum tópico encontrado.</div>}
            </div>
          </div>
        </div>, document.body
      )}

      <style jsx>{`
        .history-container { display: flex; flex-direction: column; gap: 32px; }
        .history-header h1 { font-size: 2rem; }
        .history-main { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }
        .add-manual-card { padding: 24px; height: fit-content; }
        .add-manual-card h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; color: var(--accent-primary); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .full-width { grid-column: span 2; }
        .form-group label { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; }
        .history-list { padding: 24px; overflow: hidden; }
        .list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .count-badge { background: var(--accent-secondary); padding: 4px 12px; border-radius: 100px; font-size: 0.8rem; color: var(--text-secondary); }
        .sessions-table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 500px; }
        th { text-align: left; padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); }
        td { padding: 16px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        .date-cell, .duration-cell { display: flex; align-items: center; gap: 8px; }
        .topic-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
        .topic-group-horizontal { display: flex; align-items: center; gap: 12px; position: relative; }
        .row-actions-overlay { display: flex; gap: 8px; opacity: 0; transition: all 0.2s; pointer-events: none; }
        .edit-actions-inline { display: flex; gap: 12px; margin-bottom: 8px; }
        .active-row .row-actions-overlay, .editing-row .row-actions-overlay { opacity: 1; pointer-events: unset; }

        .discipline-text { color: var(--text-primary); font-weight: 600; font-size: 0.95rem; white-space: nowrap; }
        .topic-subtext { color: var(--text-muted); font-size: 0.8rem; }
        
        .edit-btn, .delete-btn, .save-btn, .cancel-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; }
        .edit-btn:hover { color: var(--accent-primary); background: rgba(255, 71, 87, 0.05); }
        .delete-btn:hover { color: #ff4757; background: rgba(255, 71, 87, 0.05); }
        .save-btn { color: #2ecc71; }
        .cancel-btn { color: #e74c3c; }
        .editing-row { background: rgba(255, 71, 87, 0.03); }
        .edit-input { width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--surface-color); color: var(--text-primary); font-size: 0.85rem; }
        .duration-input { width: 70px; }
        .edit-topic-group { display: flex; flex-direction: column; gap: 6px; }
        .modal-select-trigger { background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); cursor: pointer; transition: all 0.2s; font-size: 0.9rem; min-height: 44px; }
        .modal-select-trigger:hover { border-color: var(--accent-primary); background: rgba(255, 71, 87, 0.03); }
        .modal-select-trigger.disabled { opacity: 0.5; cursor: not-allowed; background: rgba(0,0,0,0.02); }
        .edit-select { padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; min-height: 32px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 50000; padding: 20px; }
        .modal-content { width: 100%; max-width: 500px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; padding: 0; border: 1px solid var(--border-color); background: var(--bg-color); box-shadow: var(--card-shadow); }
        .modal-header { padding: 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; }
        .modal-title-group h3 { margin: 0; font-size: 1.2rem; color: var(--text-primary); }
        .modal-title-group p { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted); }
        .close-modal-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
        .close-modal-btn:hover { color: var(--accent-primary); transform: rotate(90deg); }
        .modal-search { padding: 16px 24px; display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color); }
        .modal-search input { flex: 1; background: transparent; border: none; color: var(--text-primary); font-size: 0.95rem; outline: none; }
        .modal-search svg { color: var(--text-muted); }
        .disciplines-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .discipline-option { padding: 12px 16px; text-align: left; background: transparent; border: 1px solid transparent; border-radius: 10px; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
        .discipline-option:hover { background: rgba(255, 71, 87, 0.05); color: var(--accent-primary); }
        .discipline-option.selected { background: var(--accent-primary); color: white; }
        .no-results { padding: 40px; text-align: center; color: var(--text-muted); font-style: italic; }
        .loading { display: flex; justify-content: center; align-items: center; height: 300px; color: var(--text-primary); }
        @media (max-width: 600px) {
          .modal-overlay { align-items: stretch; padding: 0; background: var(--bg-color); z-index: 999999; }
          .modal-content { height: 100% !important; max-height: 100% !important; width: 100%; border-radius: 0; border: none; }
          .modal-header { padding: 24px 20px; }
          .modal-title-group h3 { font-size: 1.3rem; }
          .modal-title-group p { display: block; font-size: 0.9rem; }
          .modal-search { padding: 16px 20px; }
          
          tr { position: relative; display: block; margin-bottom: 8px; border-bottom: 1px solid var(--border-color); padding: 8px 12px; }
          tr:last-child { border-bottom: none; }
          
          .history-header { display: none; }
          
          .active-row { background: rgba(255, 71, 87, 0.05); }
          
          td { display: inline-block; padding: 4px 6px; border-bottom: none; }
          td:nth-child(1) { width: 60px; }
          td:nth-child(2) { width: 70px; }
          td:nth-child(3) { width: calc(100% - 130px); vertical-align: middle; }
          
          .topic-group-horizontal { flex-wrap: wrap; }
          .row-actions-overlay { margin-top: 0; margin-bottom: 0; opacity: 0; }
          .active-row .row-actions-overlay { opacity: 1; }
          .row-actions-overlay button { padding: 8px; background: rgba(255, 71, 87, 0.05); }
        }
        @media (max-width: 1000px) { .history-main { grid-template-columns: 1fr; } }
        
        .month-row td {
          background: rgba(255, 71, 87, 0.03);
          color: var(--accent-primary);
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 12px;
          border-left: 3px solid var(--accent-primary);
        }
      `}</style>
    </div>
  );
};

export default History;
