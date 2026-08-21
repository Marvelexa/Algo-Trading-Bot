export const motionTokens = {
  transition: {
    micro: { duration: 0.15, ease: 'easeOut' },
    card: { duration: 0.25, ease: 'easeInOut' },
    panel: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }, // premium custom cubic-bezier
    expandCollapse: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
  hoverScale: {
    micro: 1.02,
    button: 1.04,
    card: 1.01,
  },
  animations: {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    slideInRight: {
      initial: { opacity: 0, x: 50 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 50 },
    },
    listItem: {
      initial: { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95 },
    }
  }
} as const;
