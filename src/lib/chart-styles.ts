/**
 * Unified tooltip styles for Recharts
 * Provides opaque, high-contrast tooltips with proper readability
 */

export const rechartsTooltipStyle = {
  backgroundColor: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 1000,
};

export const rechartsTooltipLabelStyle = {
  color: 'hsl(var(--popover-foreground))',
  fontWeight: 600,
  marginBottom: '4px',
};

export const rechartsTooltipItemStyle = {
  color: 'hsl(var(--popover-foreground))',
};
