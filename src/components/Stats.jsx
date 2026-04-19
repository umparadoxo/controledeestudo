import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { format, eachDayOfInterval, subDays, startOfWeek } from 'date-fns';
import { BarChart2, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import conteudo from '../../conteudo.json';

const Stats = () => {
  const [sessions, setSessions] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const cleanName = (name) => {
    if (!name) return '';
    const base = name.replace(/\s*\[cite:\s*\d+\]/g, '').trim();
    if (base === base.toUpperCase()) {
      return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    }
    return base;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
    setLoading(false);
  };

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

  const disciplineStats = useMemo(() => {
    const statsMap = {};
    let totalMinutes = 0;
    const excluded = [
      'Revisão do dia anterior',
      'Bateria de questões',
      'Simulado',
      'Atualidades do mercado financeiro'
    ].map(name => cleanName(name));

    let filteredSessions = sessions;
    if (timeFilter !== 'all') {
      const days = parseInt(timeFilter);
      const cutoff = subDays(new Date(), days);
      filteredSessions = sessions.filter(s => new Date(s.completed_at) >= cutoff);
    }

    (conteudo.cronograma || []).forEach(item => {
      const name = cleanName(item.disciplina);
      if (name && !excluded.includes(name)) statsMap[name] = 0;
    });

    filteredSessions.forEach(s => {
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
  }, [sessions, timeFilter]);

  const chartColors = [
    '#ff4757', '#546de5', '#2ed573', '#ffa502', '#1e90ff', 
    '#ff6b81', '#7d5fff', '#32ff7e', '#ff9f43', '#70a1ff'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip glass-card" style={{ padding: '12px', border: 'none', background: 'var(--surface-color)', backdropFilter: 'blur(20px)' }}>
          <p className="label" style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{payload[0].name}</p>
          <p className="intro" style={{ margin: 0, color: '#ff4757', fontWeight: 600 }}>{payload[0].value} min</p>
          <p className="percentage" style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{payload[0].payload.percentage}% do tempo</p>
        </div>
      );
    }
    return null;
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando estatísticas...</div>;

  return (
    <div className="stats-container animate-fade-in">
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
          <div className="legend-cells">
            <div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.2)' }} />
            <div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.5)' }} />
            <div className="heatmap-cell" style={{ backgroundColor: 'rgba(255, 71, 87, 0.8)' }} />
          </div>
          <span>Muito</span>
        </div>
      </div>

      <div className="glass-card section-card" style={{ marginTop: '24px' }}>
        <div className="section-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Distribuição</h3>
            <p className="subtitle" style={{ marginTop: '4px' }}>Tempo por disciplina</p>
          </div>
          <div className="filter-select-wrapper">
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="time-filter-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
            >
              <option value="all">Desde sempre</option>
              <option value="3">Último 3 dias</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
        </div>

        <div className="chart-container" style={{ width: '100%', height: '350px', marginTop: '20px' }}>
          {disciplineStats.some(s => s.minutes > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={disciplineStats.filter(s => s.minutes > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="minutes"
                >
                  {disciplineStats.filter(s => s.minutes > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data-chart">
              <div className="no-data-icon"><BarChart2 size={40} /></div>
              <p>Inicie um pomodoro para gerar estatísticas</p>
            </div>
          )}
        </div>

        <div className="stats-list" style={{ marginTop: '32px' }}>
          {disciplineStats.length > 0 ? disciplineStats.filter(s => s.minutes > 0).map((stat, i) => (
            <div key={i} className="stat-row">
              <div className="stat-info-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="stat-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: chartColors[i % chartColors.length] }}></div>
                  <span className="stat-name">{stat.name}</span>
                </div>
                <span className="stat-percentage">{stat.percentage}%</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${stat.percentage}%`, backgroundColor: chartColors[i % chartColors.length], background: `linear-gradient(90deg, ${chartColors[i % chartColors.length]}, ${chartColors[i % chartColors.length]}dd)` }}></div>
              </div>
            </div>
          )) : null}
        </div>
      </div>

      <style jsx>{`
        .stats-container { display: flex; flex-direction: column; gap: 24px; padding: 0 0 20px 0; }
        .section-card { padding: 24px; border-radius: 24px; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-header h3 { color: var(--text-primary); margin: 0; }
        .subtitle { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        
        .heatmap-wrapper { overflow-x: auto; margin-bottom: 16px; padding-bottom: 8px; scrollbar-width: none; }
        .heatmap-wrapper::-webkit-scrollbar { display: none; }
        .heatmap { display: grid; grid-template-columns: repeat(13, 14px); grid-template-rows: repeat(7, 14px); grid-auto-flow: column; gap: 4px; }
        .heatmap-cell { width: 14px; height: 14px; border-radius: 3px; }
        
        .heatmap-legend { display: flex; align-items: center; gap: 12px; font-size: 0.75rem; color: var(--text-muted); margin-top: 12px; }
        .legend-cells { display: flex; gap: 4px; }
        
        .no-data-chart {
          height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; color: var(--text-muted); padding: 40px; text-align: center;
        }
        .no-data-icon { opacity: 0.2; }
        
        .stats-list { display: flex; flex-direction: column; gap: 16px; }
        .stat-row { display: flex; flex-direction: column; gap: 8px; }
        .stat-info-row { display: flex; justify-content: space-between; align-items: center; }
        .stat-name { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
        .stat-percentage { font-size: 0.9rem; color: #ff4757; font-weight: 700; }
        .progress-bar-bg { height: 8px; background: var(--accent-secondary); border-radius: 4px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 4px; }
        .stat-dot { flex-shrink: 0; }

        .time-filter-select {
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          outline: none;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          .section-card { padding: 16px; }
          .heatmap { grid-template-columns: repeat(10, 12px); grid-template-rows: repeat(7, 12px); gap: 3px; }
          .heatmap-cell { width: 12px; height: 12px; }
        }
      `}</style>
    </div>
  );
};

export default Stats;
