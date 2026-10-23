import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Target,
  Download,
  Upload,
  RotateCcw,
  Check,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  getUserProfile,
  saveUserProfile,
  resetUserProfile,
  exportAllStudyData,
  importAllStudyData,
} from '../../services/storageService';
import type { StudentProfile } from '../../types';
import './ProfileModal.css';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: StudentProfile) => void;
}

const ProfileModalInner: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (updated: StudentProfile) => void;
}> = ({ isOpen, onClose, onProfileUpdated }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'backup'>('profile');
  const [formData, setFormData] = useState<StudentProfile>(getUserProfile);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof StudentProfile, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (validationError) setValidationError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setValidationError('Please enter your full name or preferred nickname.');
      return;
    }
    if (!formData.email || !formData.email.trim() || !formData.email.includes('@')) {
      setValidationError('Please provide a valid email address.');
      return;
    }

    const saved = saveUserProfile({
      name: formData.name.trim(),
      email: formData.email.trim(),
      institution: formData.institution?.trim() || 'Academic Institute',
      major: formData.major?.trim() || 'General Studies',
      academicYear: formData.academicYear?.trim() || 'Undergraduate',
      targetDailyHours: Number(formData.targetDailyHours) || 3,
      academicGoal: formData.academicGoal?.trim() || '',
    });

    setSuccessMessage('Profile and study preferences updated successfully! ✏️');
    if (onProfileUpdated) {
      onProfileUpdated(saved);
    }

    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleReset = () => {
    if (window.confirm('Reset your profile back to default template settings?')) {
      const reset = resetUserProfile();
      setFormData(reset);
      setSuccessMessage('Profile reset to default.');
      if (onProfileUpdated) {
        onProfileUpdated(reset);
      }
    }
  };

  const handleExport = () => {
    const jsonStr = exportAllStudyData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (formData.name || 'studymate').toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.href = url;
    link.download = `${safeName}_studymate_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMessage('Workspace backup exported successfully! 📁');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importAllStudyData(content);
      setImportStatus(res);
      if (res.success) {
        setFormData(getUserProfile());
        setSuccessMessage('Data imported and workspace refreshed!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✏️ Student Account & Profile"
      subtitle="Customize your student identity, degree, study targets, and data backups"
      maxWidth="620px"
    >
      <div className="profile-modal-root">
        {/* Live Profile Header Doodle Card */}
        <div className="profile-preview-banner">
          <div className="profile-preview-avatar">
            {getInitials(formData.name || 'User')}
          </div>
          <div className="profile-preview-text">
            <div className="profile-preview-name-row">
              <span className="profile-preview-name">{formData.name || 'Student Scholar'}</span>
              <Badge variant="violet" icon={<Sparkles size={11} />}>
                Active Student
              </Badge>
            </div>
            <div className="profile-preview-sub">
              {formData.major || 'Field of Study'} • {formData.institution || 'University'}
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="profile-modal-tabs">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <Download size={15} />
            <span>Data &amp; Backup</span>
          </button>
        </div>

        {/* Messages */}
        {validationError && (
          <div className="profile-alert profile-alert-error">
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}
        {successMessage && (
          <div className="profile-alert profile-alert-success">
            <Check size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab 1: Profile Details Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSave} className="profile-form">
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="student-name">
                  <User size={14} /> Full Name / Display Name *
                </label>
                <input
                  id="student-name"
                  type="text"
                  className="form-input doodle-input"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Asad Ali, John Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-email">
                  <Mail size={14} /> Student Email *
                </label>
                <input
                  id="student-email"
                  type="email"
                  className="form-input doodle-input"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="e.g. student@university.edu"
                  required
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="student-institution">
                  <GraduationCap size={14} /> College / University / Institute
                </label>
                <input
                  id="student-institution"
                  type="text"
                  className="form-input doodle-input"
                  value={formData.institution}
                  onChange={(e) => handleChange('institution', e.target.value)}
                  placeholder="e.g. MIT, Stanford, Mumbai University"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-major">
                  <BookOpen size={14} /> Major / Specialization
                </label>
                <input
                  id="student-major"
                  type="text"
                  className="form-input doodle-input"
                  value={formData.major}
                  onChange={(e) => handleChange('major', e.target.value)}
                  placeholder="e.g. Computer Science, Neuroscience"
                />
              </div>
            </div>

            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="student-year">
                  <Calendar size={14} /> Academic Standing / Year
                </label>
                <input
                  id="student-year"
                  type="text"
                  className="form-input doodle-input"
                  value={formData.academicYear || ''}
                  onChange={(e) => handleChange('academicYear', e.target.value)}
                  placeholder="e.g. 3rd Year, Sophomore, Senior"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="student-target-hours">
                  <Clock size={14} /> Daily Study Target (Hours)
                </label>
                <input
                  id="student-target-hours"
                  type="number"
                  min="0.5"
                  max="16"
                  step="0.5"
                  className="form-input doodle-input"
                  value={formData.targetDailyHours ?? 3}
                  onChange={(e) => handleChange('targetDailyHours', parseFloat(e.target.value) || 3)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="student-goal">
                <Target size={14} /> Academic Goal or Motto
              </label>
              <textarea
                id="student-goal"
                rows={2}
                className="form-input doodle-input"
                value={formData.academicGoal || ''}
                onChange={(e) => handleChange('academicGoal', e.target.value)}
                placeholder="e.g. Master neural network architectures & score an A+ on finals!"
              />
            </div>

            <div className="profile-form-actions">
              <Button type="button" variant="outline" size="sm" onClick={handleReset} icon={<RotateCcw size={14} />}>
                Reset to Default
              </Button>
              <Button type="submit" variant="accent" size="md" icon={<Check size={16} />}>
                Save Profile
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: Backup & Portability */}
        {activeTab === 'backup' && (
          <div className="profile-backup-section">
            <div className="backup-card">
              <div className="backup-card-info">
                <div className="backup-card-title">
                  <Download size={18} /> Export Workspace Backup
                </div>
                <p className="backup-card-desc">
                  Download a JSON file containing all your customized profile details, study planner subjects, daily study tasks, saved lecture summaries, and quiz scores.
                </p>
              </div>
              <Button variant="accent" size="sm" onClick={handleExport} icon={<Download size={14} />}>
                Export JSON
              </Button>
            </div>

            <div className="backup-card">
              <div className="backup-card-info">
                <div className="backup-card-title">
                  <Upload size={18} /> Import Workspace Backup
                </div>
                <p className="backup-card-desc">
                  Restore or migrate your study plans, notes, and quiz achievements from an existing JSON backup file on any device.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button variant="outline" size="sm" onClick={handleImportClick} icon={<Upload size={14} />}>
                Import JSON
              </Button>
            </div>

            {importStatus && (
              <div className={`profile-alert ${importStatus.success ? 'profile-alert-success' : 'profile-alert-error'}`}>
                {importStatus.success ? <Check size={16} /> : <AlertCircle size={16} />}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div className="backup-privacy-notice">
              <span className="notice-icon">🔒</span>
              <span>
                <strong>100% Client-Side Privacy:</strong> Your account details and study materials are kept safely inside your browser's private local storage. No tracking or external syncing.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  if (!isOpen) return null;

  return (
    <ProfileModalInner
      key={isOpen ? 'open' : 'closed'}
      isOpen={isOpen}
      onClose={onClose}
      onProfileUpdated={onProfileUpdated}
    />
  );
};
