import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, LayoutDashboard, Calendar, TrendingUp, History as HistoryIcon, LogOut, Flame, Clock, User, Sun, Moon } from 'lucide-react';
import { isSameDay, subDays } from 'date-fns';
import { useTheme } from '../App';

const Navbar = ({ activeTab, setActiveTab, userEmail }) => {
  const { theme, toggleTheme } = useTheme();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const navItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'timer', label: 'Pomodoro', icon: Timer },
    { id: 'planning', label: 'Cronograma', icon: Calendar },
    { id: 'stats', label: 'Estatísticas', icon: TrendingUp },
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="navbar glass-card mobile-hide">
        <div className="nav-left" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {/* Espaço reservado ou logo se houver */}
        </div>

        <div className="nav-center" style={{ flex: 2, display: 'flex', justifyContent: 'center' }}>
          <div className="nav-center-wrapper" style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: '100px' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="nav-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Alternar Tema" style={{ width: '36px', height: '36px' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="user-info">
            <User size={16} />
            <span className="user-email">{userEmail}</span>
          </div>
          <button onClick={handleLogout} className="nav-logout-btn" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav glass-card desktop-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`mobile-nav-btn ${activeTab === item.id ? 'active' : ''}`}
          >
            <item.icon size={26} color={activeTab === item.id ? '#ff4757' : (theme === 'light' ? '#94a3b8' : '#747d8c')} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </button>
        ))}
        <button onClick={toggleTheme} className="mobile-nav-btn">
          {theme === 'dark' ? <Sun size={26} color="#747d8c" /> : <Moon size={26} color="#94a3b8" />}
        </button>
      </nav>

      <style jsx>{`
        .navbar {
          display: flex; align-items: center; justify-content: space-between;
          margin: 0; padding: 12px 24px; border-radius: 0;
          background: var(--surface-color); border: none;
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: var(--glass-blur);
          position: sticky; top: 0; z-index: 100;
          width: 100%;
        }

        .nav-btn {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          border-radius: 100px; border: none; background: transparent;
          color: var(--text-secondary); cursor: pointer; transition: var(--transition);
          font-size: 0.9rem; font-weight: 500;
        }
        .nav-btn.active { background: var(--accent-primary); color: white; }

        .theme-toggle-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 50%; border: none;
          background: var(--accent-secondary); color: var(--text-primary);
          cursor: pointer; transition: var(--transition);
        }
        .theme-toggle-btn:hover { background: var(--accent-primary); color: white; transform: rotate(15deg); }

        .user-info { display: flex; align-items: center; gap: 8px; background: var(--accent-secondary); padding: 6px 14px; border-radius: 100px; font-size: 0.85rem; color: var(--text-primary); }
        
        .nav-logout-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255, 71, 87, 0.1); color: #ff4757;
          cursor: pointer; transition: var(--transition);
        }
        .nav-logout-btn:hover { background: rgba(255, 71, 87, 0.2); transform: scale(1.05); }
        
        .mobile-bottom-nav {
          position: fixed; bottom: 16px; left: 16px; right: 16px;
          height: 64px; background: var(--surface-color);
          border: 1px solid var(--border-color); border-radius: 20px;
          display: flex; justify-content: space-around; align-items: center;
          z-index: 1000; box-shadow: var(--card-shadow);
          backdrop-filter: var(--glass-blur);
        }

        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; width: 18%;
        }

        .mobile-nav-btn span { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .mobile-nav-btn.active { color: var(--accent-primary); }

        @media (max-width: 767px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
