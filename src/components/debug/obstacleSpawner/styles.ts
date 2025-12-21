import type { CSSProperties } from 'react';

export const styles: Record<string, CSSProperties> = {
  panel: {
    background: 'rgba(8, 10, 22, 0.82)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#e9ecff',
    padding: 12,
    borderRadius: 10,
    maxWidth: 360,
    boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
  },
  label: { fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  input: {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.06)',
    color: '#f8f9ff',
    fontSize: 12,
  },
  button: {
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: 'linear-gradient(135deg, #4c7bff, #7cd2ff)',
    color: '#0b1024',
    fontWeight: 700,
  },
};
