import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, LayoutDashboard, Calendar, History as HistoryIcon, LogOut, Flame, Clock, User } from 'lucide-react';
import { isSameDay, subDays } from 'date-fns';

const Navbar = ({ activeTab, setActiveTab, userEmail }) => {
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
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <nav className="navbar glass-card mobile-hide">
        <div className="nav-left-placeholder" style={{ flex: 1 }}></div>

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

        <div className="nav-right" style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          <div className="user-info">
            <User size={16} />
            <span className="user-email">{userEmail}</span>
          </div>
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
            <item.icon size={26} color={activeTab === item.id ? '#ff4757' : '#747d8c'} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          </button>
        ))}
      </nav>

      <style jsx>{`
        .navbar {
          display: flex; align-items: center; justify-content: space-between;
          margin: 16px 24px; padding: 8px 16px; border-radius: 100px;
          background: rgba(12, 13, 16, 0.8); border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .nav-btn {
          display: flex; align-items: center; gap: 8px; padding: 8px 16px;
          border-radius: 100px; border: none; background: transparent;
          color: var(--text-secondary); cursor: pointer; transition: var(--transition);
          font-size: 0.9rem; font-weight: 500;
        }
        .nav-btn.active { background: var(--accent-primary); color: white; }

        .user-info { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 6px 14px; border-radius: 100px; font-size: 0.85rem; }
        
        .logout-btn {
          display: flex; align-items: center; gap: 6px; background: transparent;
          border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);
          padding: 6px 12px; border-radius: 100px; cursor: pointer; font-size: 0.85rem;
        }

        .mobile-bottom-nav {
          position: fixed; bottom: 16px; left: 16px; right: 16px;
          height: 64px; background: rgba(18, 19, 23, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px;
          display: flex; justify-content: space-around; align-items: center;
          z-index: 1000; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(20px);
        }

        .mobile-nav-btn {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          background: transparent; border: none; color: var(--text-muted);
          cursor: pointer; width: 20%;
        }

        .mobile-nav-btn span { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
        .mobile-nav-btn.active { color: white; }

        @media (max-width: 767px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
