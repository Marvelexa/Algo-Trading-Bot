export const glassStyles = {
  panel: {
    backdropFilter: 'blur(24px) saturate(190%)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Luxury white semi-transparent glass
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.06), inset 0 1px 1px rgba(255, 255, 255, 0.6)',
  },
  card: {
    backdropFilter: 'blur(12px)',
    backgroundColor: 'rgba(0, 0, 0, 0.015)', // Soft translucent card layers
    border: '1px solid rgba(0, 0, 0, 0.04)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
  },
  cardHover: {
    backdropFilter: 'blur(14px)',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.04)',
  },
  pill: {
    backdropFilter: 'blur(16px)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
  }
} as const;
