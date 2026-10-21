// StatusPill.jsx - a small coloured label for an order's status (New, Packed, Delivered, Cancelled).

const STYLES = {
  New: 'bg-brand-soft text-brand',
  Packed: 'bg-warn-soft text-warn',
  Delivered: 'bg-ink/5 text-muted',
  Cancelled: 'bg-danger-soft text-danger',
};

export default function StatusPill({ status }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${STYLES[status] ?? STYLES.Delivered}`}>
      {status}
    </span>
  );
}
