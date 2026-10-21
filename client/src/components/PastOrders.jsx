// PastOrders.jsx - the customer's previous orders, with one-click Reorder (stretch goal).
// It reloads whenever `refreshKey` changes (e.g. right after the customer places an order).

import { useEffect, useState } from 'react';

import { api } from '../api/client.js';
import StatusPill from './StatusPill.jsx';
import { card } from './ui.js';
import { rupees } from '../utils/format.js';

const dateFormat = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };

export default function PastOrders({ customerName, refreshKey, onReorder }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // encodeURIComponent: names with spaces or "&" are sent safely in the URL
    api
      .get(`/orders/mine?customer=${encodeURIComponent(customerName)}`)
      .then((data) => {
        setOrders(data);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [customerName, refreshKey]);

  return (
    <section className={`${card} p-5`}>
      <h2 className="text-base font-semibold">Your past orders</h2>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {!error && orders.length === 0 && <p className="mt-2 text-sm text-muted">Nothing yet. Your orders will show up here.</p>}

      <ul className="mt-2 divide-y divide-line">
        {orders.slice(0, 5).map((order) => {
          const names = order.items.map((i) => i.name.replace(/\s*\(.*\)$/, '')); // "Toned Milk (500 ml)" -> "Toned Milk"
          return (
            <li key={order._id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{new Date(order.createdAt).toLocaleString('en-IN', dateFormat)}</span>
                <StatusPill status={order.status} />
              </div>
              <p className="mt-1 truncate text-sm">
                {names.slice(0, 2).join(', ')}
                {names.length > 2 && <span className="text-muted"> +{names.length - 2} more</span>}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <span className="tabular text-sm font-semibold">{rupees(order.total)}</span>
                <button type="button" onClick={() => onReorder(order)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                  Reorder
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
