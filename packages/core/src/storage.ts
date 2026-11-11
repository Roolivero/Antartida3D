export const EXPLORED_KEY = 'antartida:explored';
export const VIEW_MODE_KEY = 'antartida:view';

export function loadExplored(): boolean {
  try {
    return localStorage.getItem(EXPLORED_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveExplored(value: boolean): void {
  try {
    localStorage.setItem(EXPLORED_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable (private mode, blocked cookies): keep the in-memory state only.
  }
}

export function loadViewMode(): '2d' | '3d' | null {
  try {
    const val = localStorage.getItem(VIEW_MODE_KEY);
    return val === '2d' || val === '3d' ? val : null;
  } catch {
    return null;
  }
}

export function saveViewMode(mode: '2d' | '3d'): void {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Storage unavailable
  }
}
