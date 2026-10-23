import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { APP_CONFIG, MAIN_NAV_ITEMS } from '../../utils/constants';
import './Footer.css';

const CURRENT_YEAR = new Date().getFullYear();

export const Footer: React.FC = () => {
  return (
    <footer className="footer-root">
      <div className="container">
        <div className="footer-grid">
          {/* Brand info */}
          <div className="footer-brand-col">
            <div className="footer-brand">
              <div className="footer-logo-box">
                <GraduationCap size={20} color="#FFFFFF" />
              </div>
              <span className="footer-brand-title">{APP_CONFIG.name}</span>
            </div>
            <p className="footer-description">{APP_CONFIG.description}</p>
            <div className="footer-integrity-badge">
              <ShieldCheck size={16} className="text-violet" />
              <span>Dedicated to Academic Integrity & Ethical AI Learning</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="footer-col">
            <h4 className="footer-heading">Learning Modules</h4>
            <ul className="footer-links">
              {MAIN_NAV_ITEMS.filter((item) => item.path !== '/').map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className="footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Academic Features */}
          <div className="footer-col">
            <h4 className="footer-heading">Capabilities</h4>
            <ul className="footer-links">
              <li>
                <span className="footer-link-static">Spaced Repetition Scheduler</span>
              </li>
              <li>
                <span className="footer-link-static">Cognitive Load Optimization</span>
              </li>
              <li>
                <span className="footer-link-static">OCR & Audio Transcript Notes</span>
              </li>
              <li>
                <span className="footer-link-static">Bloom’s Taxonomy Quiz Engine</span>
              </li>
              <li>
                <span className="footer-link-static">Feynman Technique Tutor</span>
              </li>
            </ul>
          </div>

          {/* System Status & Community */}
          <div className="footer-col">
            <h4 className="footer-heading">Platform</h4>
            <div className="footer-status-box">
              <div className="status-indicator">
                <span className="status-dot" />
                <span className="status-text">Academic AI Engine Online</span>
              </div>
              <p className="status-subtext">Engine: Google Gemini 2.5 Flash &amp; Local Offline Engine</p>
            </div>
            <p className="footer-micro">
              Designed for undergraduate, master, and doctoral researchers worldwide.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom">
          <p className="footer-copy">
            © {CURRENT_YEAR} {APP_CONFIG.name}. Built with{' '}
            <Heart size={13} style={{ verticalAlign: 'middle', color: 'var(--color-rose-600)' }} /> for scholars.
          </p>
          <div className="footer-legal">
            <span className="badge badge-outline">
              <Sparkles size={12} style={{ marginRight: '4px' }} /> v{APP_CONFIG.version}
            </span>
            <span className="footer-legal-item">Privacy Policy</span>
            <span className="footer-legal-item">Honor Code</span>
            <span className="footer-legal-item">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
