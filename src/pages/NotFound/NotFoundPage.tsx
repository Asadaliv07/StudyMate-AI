import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import './NotFoundPage.css';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="notfound-root">
      <div className="container notfound-container">
        <div className="notfound-card">
          <Badge variant="violet" className="notfound-badge">
            HTTP Error 404
          </Badge>

          <div className="notfound-icon-wrapper">
            <Compass size={48} className="notfound-icon" />
          </div>

          <h1 className="notfound-title">Topic Not in Curriculum</h1>
          <p className="notfound-description">
            The study material, syllabus link, or research paper you are looking for
            cannot be located or might have been relocated to another semester.
          </p>

          <div className="notfound-actions">
            <Link to="/">
              <Button variant="outline" icon={<Home size={16} />}>
                Back to Home
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="accent" icon={<LayoutDashboard size={16} />}>
                Go to Dashboard
              </Button>
            </Link>
          </div>

          <div className="notfound-suggestions">
            <span className="suggestions-label">Recommended Destinations:</span>
            <div className="suggestions-pills">
              <Link to="/planner" className="suggestion-pill">
                Study Planner
              </Link>
              <Link to="/summarizer" className="suggestion-pill">
                Notes Summarizer
              </Link>
              <Link to="/quiz" className="suggestion-pill">
                Quiz Generator
              </Link>
              <Link to="/progress" className="suggestion-pill">
                Progress Analytics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
