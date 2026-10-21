// ReviewLine.jsx - one row on the customer's review screen.
//
// Every row shows the product, quantity and price. If the row needs attention,
// a tinted box underneath explains why and offers the fix:
//   ambiguous  -> buttons to choose between the possible products ("Toned Milk" / "Full Cream Milk")
//   unmatched  -> we don't sell it: remove it, or search for something else
//   invalid    -> the amount doesn't fit ("3 litre eggs"): enter an amount in the product's unit
//   over_stock -> more than we have: one click to use the maximum available

import { useState } from 'react';

import ProductPicker from './ProductPicker.jsx';
import QuantityStepper from './QuantityStepper.jsx';
import { TriangleAlert, X } from 'lucide-react';
import { checkLine, lineTotal } from '../utils/orderLines.js';
import { quantity as formatQty, rupees } from '../utils/format.js';

export default function ReviewLine({ line, products, onChange, onRemove }) {
  const { status, message } = checkLine(line);
  const [replacing, setReplacing] = useState(false);
  const needsAttention = status !== 'ok';

  // Choosing a product (from candidates or the search) fills in the product and a sensible quantity.
  function choose(product, quantity) {
    onChange({ product, quantity: quantity ?? line.quantity ?? 1, serverMessage: '', serverStatus: 'ok' });
    setReplacing(false);
  }

  return (
    <li className={`relative py-4 ${needsAttention ? 'pl-4' : ''}`}>
      {/* A thin coloured bar on the left marks rows that need attention */}
      {needsAttention && (
        <span className={`absolute inset-y-4 left-0 w-0.5 rounded ${status === 'unmatched' ? 'bg-danger' : 'bg-warn'}`} aria-hidden="true" />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Name + what the customer originally wrote */}
        <div className="min-w-0 flex-1 basis-48">
          <p className="font-semibold">{line.product ? line.product.name : `“${line.text}”`}</p>
          <p className="tabular text-sm text-muted">
            {line.product ? `${rupees(line.product.price)} / ${line.product.unit}` : 'Not added yet'}
            {line.product && line.text && <span className="hidden sm:inline"> · you wrote “{line.text}”</span>}
          </p>
        </div>

        {/* Quantity (only once we know the product) */}
        {line.product && (
          <QuantityStepper
            value={line.quantity}
            unit={line.product.unit}
            onChange={(quantity) => onChange({ quantity, serverMessage: '' })}
            label={`Quantity of ${line.product.name}`}
          />
        )}

        {/* Line total + remove */}
        <div className="ml-auto flex items-center gap-3">
          {line.product && (
            <span className={`tabular w-20 text-right font-semibold ${status === 'ok' ? '' : 'text-muted/60'}`}>
              {rupees(lineTotal(line))}
            </span>
          )}
          <button type="button" onClick={onRemove} className="rounded p-1 text-muted hover:bg-paper hover:text-danger" aria-label="Remove item">
            <X size={16} />
          </button>
        </div>
      </div>

      {needsAttention && (
        <div className={`mt-3 rounded-md px-3 py-2.5 text-sm ${status === 'unmatched' ? 'bg-danger-soft' : 'bg-warn-soft'}`}>
          <p className={`flex items-start gap-2 font-medium ${status === 'unmatched' ? 'text-danger' : 'text-warn'}`}>
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            {message}
          </p>

          {status === 'ambiguous' && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {line.candidates.map((c) => (
                <button
                  key={c.product.id}
                  type="button"
                  disabled={c.product.stock <= 0}
                  onClick={() => choose(c.product, c.quantity)}
                  className="tabular rounded-md border border-line bg-surface px-3 py-1.5 text-left hover:border-brand disabled:opacity-50"
                >
                  <span className="font-semibold">{c.product.name}</span>
                  <span className="ml-2 text-muted">{rupees(c.product.price)}/{c.product.unit}</span>
                </button>
              ))}
            </div>
          )}

          {status === 'over_stock' && line.product.stock > 0 && (
            <button type="button" onClick={() => onChange({ quantity: line.product.stock })} className="mt-2 font-semibold text-ink underline underline-offset-4">
              Use {formatQty(line.product.stock, line.product.unit)}
            </button>
          )}

          {status === 'invalid' && line.suggestion && (
            <button type="button" onClick={() => onChange({ quantity: line.suggestion, serverMessage: '' })} className="mt-2 font-semibold text-ink underline underline-offset-4">
              Use {formatQty(line.suggestion, line.product.unit)}
            </button>
          )}

          {status === 'unmatched' && (
            <div className="mt-2.5">
              {replacing ? (
                <ProductPicker products={products} onPick={(p) => choose(p, 1)} autoFocus placeholder="Search for something similar" />
              ) : (
                <div className="flex gap-4">
                  <button type="button" onClick={onRemove} className="font-semibold text-ink underline underline-offset-4">Remove it</button>
                  <button type="button" onClick={() => setReplacing(true)} className="font-semibold text-ink underline underline-offset-4">Pick a product instead</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
