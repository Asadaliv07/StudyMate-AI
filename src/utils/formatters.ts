import type { TaskPriority, TaskStatus } from '../types';

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function getPriorityBadgeColor(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return 'badge-amber';
    case 'high':
      return 'badge-violet';
    case 'medium':
      return 'badge-navy';
    case 'low':
    default:
      return 'badge-outline';
  }
}

export function getStatusBadgeColor(status: TaskStatus): string {
  switch (status) {
    case 'completed':
      return 'badge-emerald';
    case 'in_progress':
      return 'badge-violet';
    case 'todo':
    default:
      return 'badge-outline';
  }
}
