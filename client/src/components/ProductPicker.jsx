// ProductPicker.jsx - a search box that lists matching products; clicking one "picks" it.
// Used to add items by hand (manual ordering when the assistant fails, or "+ Add item"),
// and to replace an item we couldn't recognise.

import { useState } from 'react';
import { Search } from 'lucide-react';
import { input } from './ui.js';
import { rupees } from '../utils/format.js';

export default function ProductPicker({ products, onPick, placeholder = 'Search products, e.g. atta, eggs, oil', autoFocus = false }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();

  // Match by name, code or alias. With an empty box, show nothing (keeps the page calm).
  const matches = term
    ? products.filter((p) => [p.name, p.code, ...(p.aliases ?? [])].some((t) => t.toLowerCase().includes(term))).slice(0, 8)
    : [];

  function pick(product) {
    onPick(product);
    setQuery('');
  }

  return (
    <div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className={`${input} pl-9`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label="Search products"
        />
      </div>

      {term && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
          {matches.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No products match “{query}”.</li>}
          {matches.map((p) => {
            const out = p.stock <= 0;
            return (
              <li key={p._id ?? p.id}>
                <button
                  type="button"
                  disabled={out}
                  onClick={() => pick(p)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0 truncate font-medium">{p.name}</span>
                  <span className="tabular shrink-0 text-muted">
                    {out ? 'Out of stock' : `${rupees(p.price)} / ${p.unit}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
