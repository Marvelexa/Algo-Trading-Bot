export const colors = {
  bg: {
    obsidian: 'rgba(255, 255, 255, 0.75)', // White luxury glassmorphism base
    obsidianSolid: '#ffffff',
    card: 'rgba(0, 0, 0, 0.02)', // Soft dark borders on white cards
    cardHover: 'rgba(0, 0, 0, 0.04)',
    activeGlow: 'rgba(99, 102, 241, 0.08)',
  },
  accent: {
    primary: 'from-violet-600 via-indigo-600 to-indigo-700', // Rich dark brand gradients
    primarySolid: '#4f46e5',
    primaryGlow: 'rgba(99, 102, 241, 0.25)',
    emerald: '#10b981',
    amber: '#d97706', // High-contrast amber for light themes
    crimson: '#dc2626',
  },
  border: {
    translucent: 'rgba(0, 0, 0, 0.08)', // Thin dark edges on light glass
    translucentHover: 'rgba(0, 0, 0, 0.15)',
    brand: 'rgba(99, 102, 241, 0.2)',
    brandHover: 'rgba(99, 102, 241, 0.4)',
  },
  text: {
    primary: '#0f172a', // High-contrast Slate-900 for absolute readability
    secondary: '#475569', // Slate-600 for supporting labels
    muted: '#64748b',
    indigo: '#4f46e5',
    emerald: '#059669',
    amber: '#b45309',
  }
} as const;
