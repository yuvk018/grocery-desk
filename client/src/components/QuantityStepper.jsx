// QuantityStepper.jsx - a number box with − and + buttons, e.g.  [−] 2 [+] kg

import { Minus, Plus } from 'lucide-react';
import { stepFor } from '../utils/orderLines.js';

export default function QuantityStepper({ value, unit, onChange, label }) {
  const step = stepFor(unit);
  const current = Number(value) || 0;

  // Round to avoid 0.1 + 0.2 style floating point noise.
  const change = (delta) => onChange(Math.max(step, Math.round((current + delta) * 1000) / 1000));

  const btnClass = 'grid h-8 w-8 place-items-center text-muted hover:bg-paper hover:text-ink disabled:opacity-40';

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center overflow-hidden rounded-md border border-line bg-surface">
        <button type="button" className={btnClass} onClick={() => change(-step)} disabled={current <= step} aria-label="Less">
          <Minus size={14} />
        </button>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="tabular h-8 w-14 border-x border-line text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          aria-label={label}
        />
        <button type="button" className={btnClass} onClick={() => change(step)} aria-label="More">
          <Plus size={14} />
        </button>
      </div>
      <span className="text-sm text-muted">{unit}</span>
    </div>
  );
}
