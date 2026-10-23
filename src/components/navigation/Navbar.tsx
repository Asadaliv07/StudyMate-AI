import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Sparkles,
  Menu,
  X,
  Flame,
  LayoutDashboard,
  Calendar,
  FileText,
  HelpCircle,
  TrendingUp,
  User,
} from 'lucide-react';
import { MAIN_NAV_ITEMS, APP_CONFIG } from '../../utils/constants';
import { Badge } from '../common/Badge';
import { ProfileModal } from '../common/ProfileModal';
import { getUserProfile } from '../../services/storageService';
import type { StudentProfile } from '../../types';
import './Navbar.css';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<StudentProfile>(getUserProfile);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();

  const syncProfile = useCallback(() => {
    setProfile(getUserProfile());
  }, []);

  useEffect(() => {
    window.addEventListener('studymate_data_changed', syncProfile);
    window.addEventListener('storage', syncProfile);

    return () => {
      window.removeEventListener('studymate_data_changed', syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, [syncProfile]);

  const getRouteIcon = (path: string) => {
    switch (path) {
      case '/dashboard':
        return <LayoutDashboard size={18} />;
      case '/planner':
        return <Calendar size={18} />;
      case '/summarizer':
        return <FileText size={18} />;
      case '/quiz':
        return <HelpCircle size={18} />;
      case '/progress':
        return <TrendingUp size={18} />;
      default:
        return <GraduationCap size={18} />;
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <header className="navbar-root">
        <div className="navbar-container">
          {/* Brand Logo */}
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <div className="brand-icon-box">
              <GraduationCap className="brand-icon-primary" size={22} />
              <Sparkles className="brand-icon-sparkle" size={12} />
            </div>
            <div className="brand-text">
              <span className="brand-title">{APP_CONFIG.name}</span>
              <span className="brand-edition">✏️ DOODLE NOTEBOOK</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="navbar-nav" aria-label="Main Navigation">
            {MAIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                <span className="nav-link-icon">{getRouteIcon(item.path)}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <Badge variant="violet" className="nav-link-badge">
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Student Utilities */}
          <div className="navbar-actions">
            <div className="streak-indicator" title="Current Daily Study Streak">
              <Flame size={16} className="streak-icon" />
              <span>{profile.currentStreak || 14}d streak</span>
            </div>

            {location.pathname === '/' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="student-profile-badge"
                  onClick={() => setIsProfileModalOpen(true)}
                  title={`Account: ${profile.name} - Click to customize`}
                  aria-label="Edit student profile"
                >
                  <div className="student-avatar">
                    {getInitials(profile.name)}
                  </div>
                  <div className="student-info">
                    <span className="student-name">{profile.name}</span>
                    <span className="student-institution">{profile.institution || 'My Account'}</span>
                  </div>
                </button>
                <Link to="/dashboard" className="btn btn-primary btn-sm">
                  <Sparkles size={14} />
                  <span>Enter Workspace</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                className="student-profile-badge"
                onClick={() => setIsProfileModalOpen(true)}
                title={`Account: ${profile.name} (${profile.email}) - Click to customize`}
                aria-label="Edit student profile"
              >
                <div className="student-avatar">
                  {getInitials(profile.name)}
                </div>
                <div className="student-info">
                  <span className="student-name">{profile.name}</span>
                  <span className="student-institution">{profile.institution || 'My Account'}</span>
                </div>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-backdrop" onClick={closeMobileMenu}>
            <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <span className="mobile-menu-title">Navigation</span>
                <button
                  type="button"
                  className="mobile-close-btn"
                  onClick={closeMobileMenu}
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="mobile-nav-list">
                {MAIN_NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''}`
                    }
                  >
                    <div className="mobile-nav-link-left">
                      <span className="mobile-nav-icon">{getRouteIcon(item.path)}</span>
                      <div>
                        <div className="mobile-nav-label">{item.label}</div>
                        {item.description && (
                          <div className="mobile-nav-desc">{item.description}</div>
                        )}
                      </div>
                    </div>
                    {item.badge && <Badge variant="violet">{item.badge}</Badge>}
                  </NavLink>
                ))}
              </nav>
              <div className="mobile-drawer-footer">
                <button
                  type="button"
                  className="btn btn-outline btn-md"
                  style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    closeMobileMenu();
                    setIsProfileModalOpen(true);
                  }}
                >
                  <User size={16} />
                  <span>Account: {profile.name}</span>
                </button>
                <div className="streak-indicator mobile-streak">
                  <Flame size={16} className="streak-icon" />
                  <span>{profile.currentStreak || 14} Day Study Streak Active</span>
                </div>
                <Link
                  to="/dashboard"
                  onClick={closeMobileMenu}
                  className="btn btn-accent btn-lg"
                  style={{ width: '100%' }}
                >
                  Open Study Workspace
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Account & Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={(updated) => setProfile(updated)}
      />
    </>
  );
};

