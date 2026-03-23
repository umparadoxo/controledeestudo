import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, eachDayOfInterval, isSameDay, subDays, startOfWeek } from 'date-fns';
import { TrendingUp, Flame, Clock, Calendar, ChevronRight, CheckCircle2, Circle, BarChart2 } from 'lucide-react';

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
  const [stats, setStats] = useState({ streak: 0, totalHours: 0, weekPomodoros: 0 });
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
      setStats({ streak: 0, totalHours: 0, weekPomodoros: 0 });
      return;
    }

    const totalMinutes = data.reduce((acc, s) => acc + s.duration_minutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    
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

    setStats({ streak: currentStreak, totalHours, weekPomodoros: weekCount });
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
    if (count === 0) return 'rgba(255, 255, 255, 0.03)';
    if (count < 2) return 'rgba(255, 71, 87, 0.2)';
    if (count < 4) return 'rgba(255, 71, 87, 0.4)';
    if (count < 6) return 'rgba(255, 71, 87, 0.7)';
    return 'rgba(255, 71, 87, 1)';
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon red"><Flame size={24} fill="currentColor" /></div>
          <div className="stat-info"><h3>{stats.streak} Dias</h3><p>Sequência atual</p></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon blue"><Clock size={24} /></div>
          <div className="stat-info"><h3>{stats.totalHours}h</h3><p>Tempo total</p></div>
        </div>
        <div className="glass-card stat-card">
          <div className="stat-icon green"><BarChart2 size={24} /></div>
          <div className="stat-info"><h3>{stats.weekPomodoros}</h3><p>Pomodoros na semana</p></div>
        </div>
      </div>

      <div className="dashboard-main">
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
        </div>

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
      </div>

      <style jsx>{`
        .dashboard-container { display: flex; flex-direction: column; gap: 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .stat-card { padding: 24px; display: flex; align-items: center; gap: 20px; }
        .stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-icon.red { background: rgba(255, 71, 87, 0.1); color: #ff4757; }
        .stat-icon.blue { background: rgba(30, 144, 255, 0.1); color: #1e90ff; }
        .stat-icon.green { background: rgba(46, 213, 115, 0.1); color: #2ed573; }
        .dashboard-main { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media (min-width: 1100px) { .dashboard-main { grid-template-columns: 1.5fr 1fr; } }
        .section-card { padding: 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .subtitle { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
        .heatmap-wrapper { overflow-x: auto; margin-bottom: 16px; }
        .heatmap { display: grid; grid-template-columns: repeat(13, 14px); grid-template-rows: repeat(7, 14px); grid-auto-flow: column; gap: 4px; }
        .heatmap-cell { width: 14px; height: 14px; border-radius: 2px; }
        .plans-list { display: flex; flex-direction: column; gap: 12px; }
        .plan-item { padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 16px; display: flex; align-items: center; gap: 12px; }
        .plan-item.completed { opacity: 0.6; background: rgba(46, 213, 115, 0.05); }
        .check-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
        .check-btn.checked { color: var(--success); }
        .discipline-full-name { font-size: 1.1rem; font-weight: 600; color: white; }
        .completed .discipline-full-name { text-decoration: line-through; color: var(--text-muted); }
        .start-btn-sm { padding: 8px 16px; font-size: 0.85rem; border-radius: 10px; }
        .no-plan { text-align: center; color: var(--text-muted); }
      `}</style>
    </div>
  );
};

export default Dashboard;
