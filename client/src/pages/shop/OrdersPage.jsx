// OrdersPage.jsx - the shopkeeper's order dashboard (must-have feature #6).
//
// - All orders, newest first, with customer name, total and status
// - Open an order to see the customer's ORIGINAL MESSAGE next to the items we parsed,
//   so mistakes are easy to spot
// - Move an order New -> Packed -> Delivered, or Cancel it (its items go back to stock)
// - A strip of products running low (low-stock stretch goal)
// - Refreshes every 20 seconds so new orders show up on their own

import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { api } from '../../api/client.js';
import StatusPill from '../../components/StatusPill.jsx';
import { ChevronDown, ClipboardList, IndianRupee, PackageOpen, TriangleAlert } from 'lucide-react';
import { btn, card, heading, iconChip } from '../../components/ui.js';
import { LOW_STOCK_THRESHOLD, quantity as formatQty, rupees } from '../../utils/format.js';

const REFRESH_MS = 20000;
const FILTERS = ['All', 'New', 'Packed', 'Delivered', 'Cancelled'];

// The next step(s) the shopkeeper can take for each status (matches the server's rules).
const NEXT_ACTION = {
  New: { status: 'Packed', label: 'Mark packed' },
  Packed: { status: 'Delivered', label: 'Mark delivered' },
};
const CAN_CANCEL = ['New', 'Packed'];

const timeFormat = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };
const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [openId, setOpenId] = useState(null); // which order is expanded

  async function load() {
    try {
      const [o, p] = await Promise.all([api.get('/orders'), api.get('/products')]);
      setOrders(o);
      setProducts(p);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load now, then every 20 seconds. The "return" function stops the timer when we leave the page.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  async function changeStatus(order, status) {
    try {
      const updated = await api.patch(`/orders/${order._id}/status`, { status });
      setOrders((current) => current.map((o) => (o._id === updated._id ? updated : o)));
      if (status === 'Cancelled') load(); // stock went back up: refresh the low-stock strip
    } catch (err) {
      setError(err.message); // e.g. "This order was just changed by someone else"
      load();
    }
  }

  const counts = Object.fromEntries(FILTERS.map((f) => [f, f === 'All' ? orders.length : orders.filter((o) => o.status === f).length]));
  const visible = filter === 'All' ? orders : orders.filter((o) => o.status === filter);
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock);

  // Today at a glance (cancelled orders don't count towards sales)
  const today = orders.filter((o) => isToday(o.createdAt));
  const todaySales = today.filter((o) => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className={heading}>Orders</h1>
        <p className="text-xs text-muted">Updates automatically</p>
      </div>

      {/* Today at a glance */}
      <dl className="tabular mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <Stat label="To pack" value={counts.New} icon={PackageOpen} chip={counts.New > 0 ? iconChip.accent : iconChip.muted} />
        <Stat label="Orders today" value={today.length} icon={ClipboardList} chip={iconChip.brand} />
        <Stat label="Sales today" value={rupees(todaySales)} icon={IndianRupee} chip={iconChip.brand} />
      </dl>

      {/* Low-stock alert */}
      {lowStock.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-warn-soft px-4 py-3 text-sm text-warn">
          <TriangleAlert size={16} className="shrink-0" />
          <span className="font-semibold">Running low:</span>
          <span className="text-ink/80">
            {lowStock.map((p) => `${p.name.replace(/\s*\(.*\)$/, '')} (${p.stock})`).join(', ')}
          </span>
          <Link to="/shop/catalog" className="ml-auto font-semibold underline underline-offset-4">Restock</Link>
        </div>
      )}

      {/* Status filter */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              filter === f ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {f} <span className={filter === f ? 'text-white/70' : 'text-muted/70'}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {loading && <p className="py-10 text-center text-muted">Loading…</p>}
      {!loading && visible.length === 0 && (
        <p className={`${card} px-4 py-10 text-center text-muted`}>
          {filter === 'All' ? 'No orders yet. They’ll appear here as customers place them.' : `No ${filter.toLowerCase()} orders.`}
        </p>
      )}

      <ul className="space-y-2">
        {visible.map((order) => (
          <OrderRow
            key={order._id}
            order={order}
            open={openId === order._id}
            onToggle={() => setOpenId(openId === order._id ? null : order._id)}
            onChangeStatus={(status) => changeStatus(order, status)}
          />
        ))}
      </ul>
    </div>
  );
}

// One stat card: coloured icon chip, small label, big number.
function Stat({ label, value, icon: Icon, chip }) {
  return (
    <div className={`${card} p-3 sm:flex sm:items-center sm:gap-4 sm:p-5`}>
      <span className={`${chip} hidden sm:grid`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <dt className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted sm:text-xs">{label}</dt>
        <dd className="mt-0.5 truncate text-lg font-semibold sm:text-2xl">{value}</dd>
      </div>
    </div>
  );
}

// One order: a summary row that expands to show the message, the items and the actions.
function OrderRow({ order, open, onToggle, onChangeStatus }) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const next = NEXT_ACTION[order.status];

  async function act(status) {
    setBusy(true);
    await onChangeStatus(status);
    setBusy(false);
    setConfirmingCancel(false);
  }

  return (
    <li className={`${card} overflow-hidden ${order.status === 'Cancelled' ? 'opacity-70' : ''}`}>
      {/* Summary row (click to open) */}
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 px-4 py-3.5 text-left hover:bg-paper/50 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="font-semibold">{order.customerName}</span>
            <span className="font-mono text-[11px] text-muted">#{order._id.slice(-6).toUpperCase()}</span>
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {new Date(order.createdAt).toLocaleString('en-IN', timeFormat)} · {order.items.length} item{order.items.length > 1 ? 's' : ''}
          </p>
        </div>
        {/* Total and status: stacked on phones, side by side on bigger screens */}
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
          <span className="tabular font-semibold">{rupees(order.total)}</span>
          <span className="sm:w-20 sm:text-right"><StatusPill status={order.status} /></span>
        </div>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          {/* Original message next to what we understood */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Customer wrote</p>
              {order.originalMessage ? (
                <p className="rounded-md bg-paper px-3 py-2.5 text-[15px] leading-relaxed">“{order.originalMessage}”</p>
              ) : (
                <p className="text-sm italic text-muted">Picked by hand (no message).</p>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">We understood</p>
              <table className="tabular w-full text-sm">
                <tbody className="divide-y divide-line">
                  {order.items.map((item) => (
                    <tr key={item.product}>
                      <td className="py-1.5 pr-3">{item.name}</td>
                      <td className="whitespace-nowrap py-1.5 pr-3 text-muted">{formatQty(item.quantity, item.unit)} × {rupees(item.unitPrice)}</td>
                      <td className="py-1.5 text-right font-semibold">{rupees(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-ink/20">
                    <td colSpan={2} className="pt-2 font-semibold">Total</td>
                    <td className="pt-2 text-right font-semibold">{rupees(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          {(next || CAN_CANCEL.includes(order.status)) && (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              {confirmingCancel ? (
                <>
                  <span className="text-sm">Cancel this order? Its items go back into stock.</span>
                  <button className={btn.danger} disabled={busy} onClick={() => act('Cancelled')}>Yes, cancel</button>
                  <button className={btn.ghost} onClick={() => setConfirmingCancel(false)}>Keep order</button>
                </>
              ) : (
                <>
                  {next && <button className={btn.primary} disabled={busy} onClick={() => act(next.status)}>{next.label}</button>}
                  {CAN_CANCEL.includes(order.status) && (
                    <button className={btn.ghost} onClick={() => setConfirmingCancel(true)}>Cancel order</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
