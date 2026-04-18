import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, eachDayOfInterval, isSameDay, subDays, startOfWeek } from 'date-fns';
import { TrendingUp, Flame, Clock, Calendar, ChevronRight, CheckCircle2, Circle, BarChart2, LogOut } from 'lucide-react';
import conteudo from '../../conteudo.json';

const Dashboard = ({ onStartPomodoro }) => {
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const daysOfWeekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const todayIndex = new Date().getDay();

  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [sessions, setSessions] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [stats, setStats] = useState({ streak: 0, totalHours: 0, weekPomodoros: 0, today: 0, totalSessions: 0 });
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const cleanName = (name) => {
    if (!name) return '';
    const base = name.replace(/\s*\[cite:\s*\d+\]/g, '').trim();
    if (base === base.toUpperCase()) {
      return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    }
    return base;
  };

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: sessionData } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .order('completed_at', { ascending: true });

    const normalizedSessions = (sessionData || []).map(s => ({
      ...s,
      discipline: cleanName(s.discipline)
    }));
    setSessions(normalizedSessions);

    const { data: planData } = await supabase
      .from('study_plans')
      .select('*')
      .order('day_of_week', { ascending: true });

    const normalizedPlans = (planData || []).map(p => ({
      ...p,
      discipline: cleanName(p.discipline)
    }));
    setAllPlans(normalizedPlans);
    calculateStats(normalizedSessions);
  };

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({ streak: 0, totalHours: 0, weekPomodoros: 0, today: 0, totalSessions: 0 });
      return;
    }

    const totalMinutes = data.reduce((acc, s) => acc + s.duration_minutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    
    // Today's count
    const todayStr = getLocalDateString();
    const todayCount = data.filter(s => s.completed_at.startsWith(todayStr)).length;

    // Week count logic
    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sun-Sat
    const weekCount = data.filter(s => new Date(s.completed_at) >= startOfCurrentWeek).length;

    let currentStreak = 0;
    let checkDate = new Date();
    
    while (true) {
      const dateStr = getLocalDateString(checkDate);
      const hasSession = data.some(s => s.completed_at.startsWith(dateStr));
      
      if (hasSession) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        if (currentStreak === 0 && isSameDay(checkDate, new Date())) {
          checkDate = subDays(checkDate, 1);
          continue;
        }
        break;
      }
    }

    setStats({ 
      streak: currentStreak, 
      totalHours, 
      weekPomodoros: weekCount, 
      today: todayCount,
      totalSessions: data.length 
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleQuickCheck = async (plan, index) => {
    setLoadingAction(index);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadingAction(null);
      return;
    }

    const todayStr = getLocalDateString();
    const currentDiscipline = cleanName(plan.discipline);
    const isDone = isTaskCompletedToday(currentDiscipline);

    if (isDone) {
      // Undo: remove sessions for this discipline today
      const sessionsToRemove = sessions.filter(s => 
        s.completed_at.startsWith(todayStr) && 
        cleanName(s.discipline) === currentDiscipline
      );

      if (sessionsToRemove.length > 0) {
        const ids = sessionsToRemove.map(s => s.id);
        const { error } = await supabase
          .from('pomodoro_sessions')
          .delete()
          .in('id', ids);
        
        if (!error) fetchData();
      }
    } else {
      // Mark as done
      const { error } = await supabase.from('pomodoro_sessions').insert({
        user_id: user.id,
        duration_minutes: 25,
        completed_at: new Date().toISOString(),
        discipline: currentDiscipline,
        topic: 'Estudo Geral'
      });

      if (!error) fetchData();
    }
    setLoadingAction(null);
  };

  const isTaskCompletedToday = (discipline) => {
    const todayStr = getLocalDateString();
    const currentDiscipline = cleanName(discipline);
    return sessions.some(s => 
      s.completed_at.startsWith(todayStr) && 
      cleanName(s.discipline) === currentDiscipline
    );
  };

  const currentDisplayPlans = allPlans.filter(p => p.day_of_week === selectedDay);

  const heatmapDays = eachDayOfInterval({
    start: subDays(new Date(), 91),
    end: new Date()
  });

  const getHeatColor = (date) => {
    const dateStr = getLocalDateString(date);
    const count = sessions.filter(s => s.completed_at.startsWith(dateStr)).length;
    if (count === 0) return 'var(--accent-secondary)';
    if (count < 2) return 'rgba(255, 71, 87, 0.2)';
    if (count < 4) return 'rgba(255, 71, 87, 0.4)';
    if (count < 6) return 'rgba(255, 71, 87, 0.7)';
    return 'rgba(255, 71, 87, 1)';
  };

  const disciplineStats = React.useMemo(() => {
    const statsMap = {};
    let totalMinutes = 0;
    const excluded = [
      'Revisão do dia anterior',
      'Bateria de questões',
      'Simulado',
      'Atualidades do mercado financeiro'
    ].map(name => cleanName(name));

    // Initialize with all disciplines from conteudo.json (excluding the specific ones)
    (conteudo.cronograma || []).forEach(item => {
      const name = cleanName(item.disciplina);
      if (name && !excluded.includes(name)) statsMap[name] = 0;
    });

    // Add sessions and account for any custom disciplines not in conteudo.json (excluding specific ones)
    sessions.forEach(s => {
      const name = s.discipline;
      if (name && name.trim() !== '' && !excluded.includes(name)) {
        statsMap[name] = (statsMap[name] || 0) + s.duration_minutes;
        totalMinutes += s.duration_minutes;
      }
    });

    const entries = Object.entries(statsMap);
    if (totalMinutes === 0) {
      return entries
        .map(([name, minutes]) => ({ name, minutes, percentage: 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return entries
      .map(([name, minutes]) => ({
        name,
        minutes,
        percentage: parseFloat(((minutes / totalMinutes) * 100).toFixed(1))
      }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  }, [sessions]);

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="glass-card section-card stats-overview-card">
        <div className="section-header">
          <h3>Resumo de Estudos</h3>
          <button className="logout-action-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon red"><span style={{ fontSize: '1.2rem' }}>🍅</span></div>
            <div className="stat-info">
              <h3>{stats.today}</h3>
              <p>Hoje</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Flame size={22} fill="currentColor" /></div>
            <div className="stat-info">
              <h3>{stats.streak}</h3>
              <p>Dias Seguidos</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><BarChart2 size={22} /></div>
            <div className="stat-info">
              <h3>{stats.totalSessions}</h3>
              <p>Total Sessões</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><Clock size={22} /></div>
            <div className="stat-info">
              <h3>{stats.totalHours}h</h3>
              <p>Tempo Total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="glass-card section-card">
          <div className="section-header">
            <h3>Planejamento</h3>
            <span className="subtitle">Hoje</span>
          </div>
          <div className="plans-list">
            {currentDisplayPlans.length > 0 ? currentDisplayPlans.map((plan, i) => {
              const isDone = isTaskCompletedToday(plan.discipline);
              return (
                <div key={i} className={`plan-item ${isDone ? 'completed' : ''}`}>
                  <button className={`check-btn ${isDone ? 'checked' : ''}`} onClick={() => handleQuickCheck(plan, i)} disabled={loadingAction === i}>
                    {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  <div className="plan-topic">
                    <span className="discipline-full-name">{plan.discipline}</span>
                  </div>
                  {!isDone && (
                    <button className="btn btn-primary start-btn-sm" onClick={() => onStartPomodoro({ discipline: plan.discipline })}>
                      Focar <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              );
            }) : (
              <div className="no-plan"><p>Nada planejado.</p></div>
            )}
          </div>
        </div>

        <div className="glass-card section-card">
          <div className="section-header"><h3>Evolução</h3><span className="subtitle">Últimos 90 dias</span></div>
          <div className="heatmap-wrapper">
            <div className="heatmap">
              {heatmapDays.map((day, i) => (
                <div key={i} className="heatmap-cell" style={{ backgroundColor: getHeatColor(day) }} title={`${format(day, 'dd/MM/yyyy')}`} />
              ))}
            </div>
          </div>
          <div className="heatmap-legend">
            <span>Pouco</span>
            <div className="legend-cells"><div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.2)' }} /><div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.5)' }} /><div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.8)' }} /></div>
            <span>Muito</span>
          </div>

          <div className="discipline-ranking">
            <div className="section-header" style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
              <h3>Distribuição</h3>
              <span className="subtitle">Ranking de estudos</span>
            </div>
            <div className="stats-list">
              {disciplineStats.length > 0 ? disciplineStats.map((stat, i) => (
                <div key={i} className="stat-row">
                  <div className="stat-info-row">
                    <span className="stat-name">{stat.name}</span>
                    <span className="stat-percentage">{stat.percentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${stat.percentage}%` }}></div>
                  </div>
                </div>
              )) : (
                <div className="no-data">Inicie um pomodoro para ver as estatísticas.</div>
              )}
            </div>
          </div>
        </div>
      </div>
       <style jsx>{`
        .dashboard-container { display: flex; flex-direction: column; gap: 24px; padding-bottom: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .stat-card { 
          padding: 16px; display: flex; align-items: center; gap: 14px; border-radius: 20px; 
          background: var(--surface-color); border: 1px solid var(--border-color);
        }
        .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stat-info h3 { font-size: 1.2rem; margin: 0; font-weight: 700; color: var(--text-primary); }
        .stat-info p { font-size: 0.7rem; margin: 0; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        
        .stat-icon.red { background: rgba(255, 71, 87, 0.1); color: #ff4757; }
        .stat-icon.blue { background: rgba(30, 144, 255, 0.1); color: #1e90ff; }
        .stat-icon.green { background: rgba(46, 213, 115, 0.1); color: #2ed573; }
        .stat-icon.yellow { background: rgba(255, 165, 2, 0.1); color: #ffa502; }
        
        .dashboard-main { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 1100px) { .dashboard-main { grid-template-columns: 1.5fr 1fr; gap: 24px; } }
        
        .section-card { padding: 20px; border-radius: 24px; }
        .section-header h3 { color: var(--text-primary); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .subtitle { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        
        .heatmap-wrapper { overflow-x: auto; margin-bottom: 16px; padding-bottom: 8px; scrollbar-width: none; }
        .heatmap-wrapper::-webkit-scrollbar { display: none; }
        .heatmap { display: grid; grid-template-columns: repeat(13, 14px); grid-template-rows: repeat(7, 14px); grid-auto-flow: column; gap: 4px; }
        .heatmap-cell { width: 14px; height: 14px; border-radius: 3px; }
        
        .plans-list { display: flex; flex-direction: column; gap: 10px; }
        .plan-item { 
          padding: 12px; background: var(--surface-color); 
          border: 1px solid var(--border-color); border-radius: 18px; 
          display: flex; align-items: center; gap: 12px;
          min-height: 72px;
        }
        .plan-item.completed { opacity: 0.6; background: rgba(46, 213, 115, 0.05); }
        
        .check-btn { 
          width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
          background: var(--accent-secondary); border: none; color: var(--text-muted); border-radius: 12px; cursor: pointer; 
        }
        .check-btn.checked { color: var(--success); background: rgba(46, 213, 115, 0.1); }
        
        .plan-topic { flex: 1; overflow: hidden; }
        .discipline-full-name { font-size: 1rem; font-weight: 600; color: var(--text-primary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .completed .discipline-full-name { text-decoration: line-through; color: var(--text-muted); }
        
        .start-btn-sm { padding: 10px 16px; font-size: 0.8rem; border-radius: 12px; font-weight: 700; flex-shrink: 0; }
        .no-plan { text-align: center; color: var(--text-muted); padding: 20px; }
        .no-data { text-align: center; color: var(--text-muted); padding: 20px; }

        .logout-action-btn {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          background: rgba(255, 71, 87, 0.1); border: 1px solid rgba(255, 71, 87, 0.2);
          color: #ff4757; border-radius: 100px; cursor: pointer; transition: all 0.2s;
          font-size: 0.85rem; font-weight: 600;
        }
        .logout-action-btn:hover { background: rgba(255, 71, 87, 0.2); transform: translateY(-1px); }
        .logout-action-btn span { color: #ff4757; }

        .discipline-ranking { margin-top: 10px; }
        .stats-list { display: flex; flex-direction: column; gap: 16px; }
        .stat-row { display: flex; flex-direction: column; gap: 8px; }
        .stat-info-row { display: flex; justify-content: space-between; align-items: center; }
        .stat-name { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
        .stat-percentage { font-size: 0.9rem; color: #ff4757; font-weight: 700; }
        .progress-bar-bg { height: 8px; background: var(--accent-secondary); border-radius: 4px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #ff4757, #ff6b81); border-radius: 4px; }
        .no-data { text-align: center; color: var(--text-muted); padding: 10px; font-size: 0.85rem; }

        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-card { padding: 12px; gap: 10px; }
          .stat-info h3 { font-size: 1.1rem; }
          .section-card { padding: 16px; }
          .plan-item { gap: 8px; }
          .discipline-full-name { font-size: 0.95rem; }
        }
      `}</style>

    </div>
  );
};

export default Dashboard;
