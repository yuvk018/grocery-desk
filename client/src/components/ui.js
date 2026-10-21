// ui.js - Tailwind class combinations reused across the app, so buttons and inputs look the same everywhere.
// Usage: <button className={btn.primary}>Save</button>
// Colours like "brand", "accent", "line" and "ink" are our own tokens, defined in index.css.

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ' +
  'disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export const btn = {
  // Main action: forest green with a soft inner highlight
  primary: `${btnBase} bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark active:translate-y-px`,
  secondary: `${btnBase} border border-line bg-surface text-ink shadow-sm hover:border-ink/25`,
  ghost: `${btnBase} text-muted hover:bg-ink/5 hover:text-ink`,
  danger: `${btnBase} border border-danger/25 bg-surface text-danger hover:bg-danger-soft`,
  // Small text-style buttons used inside tables and lines
  link: 'text-sm font-semibold text-brand underline-offset-4 hover:underline disabled:opacity-45',
  linkDanger: 'text-sm font-semibold text-danger underline-offset-4 hover:underline',
};

export const input =
  'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-xs placeholder:text-muted/70 ' +
  'transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10';

export const card = 'rounded-xl border border-line/70 bg-surface shadow-card';

export const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted';

export const fieldError = 'mt-1 text-xs text-danger';

// Page titles
export const heading = 'text-2xl font-semibold tracking-tight text-ink sm:text-[28px]';

// Small square holding an icon, e.g. <span className={iconChip.accent}><Store size={18} /></span>
const chipBase = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg';
export const iconChip = {
  brand: `${chipBase} bg-brand-soft text-brand`,
  accent: `${chipBase} bg-accent-soft text-accent`,
  warn: `${chipBase} bg-warn-soft text-warn`,
  muted: `${chipBase} bg-ink/5 text-muted`,
};
