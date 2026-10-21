// OrderPage.jsx - where a customer places an order. Three stages:
//
//   1. compose: type the order as a text message -> POST /api/orders/parse
//   2. review:  check every line, fix anything flagged, add/remove items, see the total
//               (if the assistant fails, this stage starts empty and the customer picks products by hand: Rule 1)
//   3. done:    the order is confirmed (POST /api/orders) and stock has been reserved
//
// The bill summary sits on the right on big screens, and in a bar fixed to the bottom on phones.

import { useEffect, useState } from 'react';

import { api } from '../../api/client.js';
import { useSession } from '../../context/SessionContext.jsx';
import PastOrders from '../../components/PastOrders.jsx';
import ProductPicker from '../../components/ProductPicker.jsx';
import ReviewLine from '../../components/ReviewLine.jsx';
import StatusPill from '../../components/StatusPill.jsx';
import { ArrowRight, Check, ReceiptText, Sparkles, TriangleAlert } from 'lucide-react';
import { btn, card, iconChip, label } from '../../components/ui.js';
import { quantity as formatQty, rupees } from '../../utils/format.js';
import { checkLine, fromPreviewLine, fromProduct, lineTotal, stepFor } from '../../utils/orderLines.js';

// Sample messages from the assignment, one click to try them.
const EXAMPLES = [
  'bhaiya 2 kilo atta, ek dozen ande aur 2 packet doodh bhej do',
  'half kg toor dal, 500 gm moong dal, 250g tea',
  '2 kg aloo, 1 kg pyaaz, 1 kg tamatar aur thoda dhaniya',
];

export default function OrderPage() {
  const { customerName } = useSession();

  const [products, setProducts] = useState([]); // the catalog, for picking products by hand
  const [step, setStep] = useState('compose'); // 'compose' | 'review' | 'done'
  const [message, setMessage] = useState('');
  const [parsing, setParsing] = useState(false);
  const [composeError, setComposeError] = useState(''); // e.g. "This desk only takes grocery orders."
  const [mode, setMode] = useState(null); // how the review started: { source: 'llm' | 'manual' | 'reorder', llmError, note }
  const [lines, setLines] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  function loadProducts() {
    api.get('/products').then(setProducts).catch(() => {});
  }
  useEffect(loadProducts, []);

  // ---- Stage 1: send the message to be understood ----
  async function handleParse(event) {
    event.preventDefault();
    setComposeError('');
    setParsing(true);
    try {
      const preview = await api.post('/orders/parse', { message });
      if (!preview.isOrder) {
        // e.g. "hi, do you deliver on Sunday?": nothing to order, stay on this stage
        setComposeError(preview.note || 'We couldn’t find any items in that message.');
        return;
      }
      setMode({ source: preview.source, llmError: preview.llmError, note: preview.note });
      setLines(preview.lines.map(fromPreviewLine));
      setStep('review');
    } catch (err) {
      setComposeError(err.message);
    } finally {
      setParsing(false);
    }
  }

  function startManual() {
    setMode({ source: 'manual' });
    setLines([]);
    setStep('review');
  }

  function reorder(order) {
    // Rebuild the lines from a past order using TODAY's catalog (current prices and stock).
    const byId = new Map(products.map((p) => [p._id, p]));
    setLines(
      order.items.map((item) =>
        byId.has(item.product)
          ? fromProduct(byId.get(item.product), item.quantity)
          : { ...fromProduct({ id: null, name: item.name }), product: null, text: item.name, serverStatus: 'unmatched', serverMessage: `${item.name} is no longer sold.` }
      )
    );
    setMode({ source: 'reorder' });
    setMessage('');
    setConfirmError('');
    setStep('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- Stage 2: editing lines ----
  function updateLine(key, patch) {
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setConfirmError('');
  }

  function removeLine(key) {
    setLines((current) => current.filter((l) => l.key !== key));
    setConfirmError('');
  }

  function addProduct(product) {
    setLines((current) => {
      // Already in the order? Add one more step to it instead of a second row.
      const existing = current.find((l) => l.product?.id === product._id);
      if (existing) {
        const next = Math.round(((Number(existing.quantity) || 0) + stepFor(product.unit)) * 1000) / 1000;
        return current.map((l) => (l === existing ? { ...l, quantity: next } : l));
      }
      return [...current, fromProduct(product)];
    });
    setConfirmError('');
  }

  // ---- Stage 3: confirm ----
  async function handleConfirm() {
    setConfirming(true);
    setConfirmError('');
    try {
      const order = await api.post('/orders', {
        customerName,
        message: mode?.source === 'llm' ? message : '', // keep the original text so the shopkeeper can compare
        items: lines.map((l) => ({ productId: l.product.id, quantity: Number(l.quantity) })), // NO prices: the server decides
      });
      setPlacedOrder(order);
      setStep('done');
      setOrdersRefreshKey((k) => k + 1);
      loadProducts(); // stock has changed
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // Someone else bought the last units meanwhile: update that line's stock so it shows "Only X left".
      if (err.status === 409 && err.details?.productId) {
        setLines((current) =>
          current.map((l) => (l.product?.id === err.details.productId ? { ...l, product: { ...l.product, stock: err.details.available } } : l))
        );
      }
      setConfirmError(err.message);
    } finally {
      setConfirming(false);
    }
  }

  function startOver() {
    setStep('compose');
    setMessage('');
    setLines([]);
    setMode(null);
    setPlacedOrder(null);
    setConfirmError('');
  }

  // ---- Bill summary (shared by the sidebar and the phone bottom bar) ----
  const issues = lines.filter((l) => checkLine(l).status !== 'ok').length;
  const total = Math.round(lines.reduce((sum, l) => sum + (checkLine(l).status === 'ok' ? lineTotal(l) : 0), 0) * 100) / 100;
  const bill = { count: lines.length, issues, total, canConfirm: lines.length > 0 && issues === 0 && !confirming, confirming, confirmError, onConfirm: handleConfirm };

  return (
    <>
      {/* On phones during review, leave room at the bottom for the fixed bill bar */}
      <div className={`grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] ${step === 'review' ? 'pb-28 lg:pb-0' : ''}`}>
        <div className="min-w-0 space-y-6">
          {step === 'compose' && (
            <Compose
              customerName={customerName}
              message={message}
              setMessage={setMessage}
              parsing={parsing}
              error={composeError}
              onSubmit={handleParse}
              onManual={startManual}
            />
          )}

          {step === 'review' && (
            <Review
              mode={mode}
              message={message}
              lines={lines}
              products={products}
              onEditMessage={() => setStep('compose')}
              onChangeLine={updateLine}
              onRemoveLine={removeLine}
              onAddProduct={addProduct}
            />
          )}

          {step === 'done' && <OrderPlaced order={placedOrder} onNewOrder={startOver} />}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {step === 'review' && <BillSummary {...bill} className="hidden lg:block" />}
          <PastOrders customerName={customerName} refreshKey={ordersRefreshKey} onReorder={reorder} />
        </aside>
      </div>

      {step === 'review' && <MobileBillBar {...bill} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stage 1: the message box
// ---------------------------------------------------------------------------
function Compose({ customerName, message, setMessage, parsing, error, onSubmit, onManual }) {
  const firstName = customerName.split(' ')[0];

  return (
    <form onSubmit={onSubmit} className={`${card} p-5 sm:p-8`}>
      <div className="flex items-start gap-4">
        <span className={`${iconChip.accent} h-11 w-11 rounded-xl`}>
          <Sparkles size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">What do you need today, {firstName}?</h1>
          <p className="mt-1 text-muted">Type it like a text message. English, Hindi or both.</p>
        </div>
      </div>

      <label htmlFor="order-message" className="sr-only">Your order</label>
      <textarea
        id="order-message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="e.g. 2 kg atta, 1 kg sugar aur 2 packet toned milk"
        className="mt-6 w-full resize-y rounded-xl border border-line bg-paper/50 px-4 py-3.5 text-[15px] leading-relaxed transition placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/10"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setMessage(example)}
            className="max-w-full truncate rounded-full border border-line bg-surface px-3 py-1 text-left text-muted transition hover:border-accent/50 hover:bg-accent-soft hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onManual} className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
          or pick products yourself
        </button>
        <button type="submit" className={`${btn.primary} py-2.5`} disabled={!message.trim() || parsing}>
          {parsing ? 'Reading your message…' : <>Prepare my bill <ArrowRight size={16} /></>}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Stage 2: review the lines
// ---------------------------------------------------------------------------
function Review({ mode, message, lines, products, onEditMessage, onChangeLine, onRemoveLine, onAddProduct }) {
  const title = { llm: 'Check your order', manual: 'Build your order', reorder: 'Reorder' }[mode.source];

  return (
    <section className={`${card} p-5 sm:p-7`}>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <button type="button" onClick={onEditMessage} className={`${btn.link} mt-2 shrink-0`}>
          {mode.source === 'llm' ? 'Edit message' : 'Type a message instead'}
        </button>
      </div>

      {mode.source === 'llm' && <p className="mt-2 border-l-2 border-line pl-3 text-muted">“{message}”</p>}

      {/* Rule 1: the assistant failed -> say so clearly, and let them pick products below */}
      {mode.llmError && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-warn-soft px-3 py-2.5 text-sm text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>{mode.llmError}</span>
        </div>
      )}
      {mode.source === 'reorder' && <p className="mt-2 text-sm text-muted">Same items as before, at today’s prices.</p>}
      {mode.note && <p className="mt-3 text-sm text-muted">{mode.note}</p>}

      {lines.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <ReviewLine
              key={line.key}
              line={line}
              products={products}
              onChange={(patch) => onChangeLine(line.key, patch)}
              onRemove={() => onRemoveLine(line.key)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          No items yet. Search below to add what you need.
        </p>
      )}

      <div className="mt-5">
        <p className={label}>Add an item</p>
        <ProductPicker products={products} onPick={onAddProduct} autoFocus={mode.source === 'manual'} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The bill: sidebar card (desktop) and bottom bar (phone)
// ---------------------------------------------------------------------------
// The confirm button on the dark bill: saffron, so it's the one thing the eye goes to.
const confirmButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-ink shadow-sm ' +
  'transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none';

function BillSummary({ count, issues, total, canConfirm, confirming, confirmError, onConfirm, className = '' }) {
  return (
    <section className={`relative isolate overflow-hidden rounded-xl bg-ink p-6 text-white shadow-lift ${className}`}>
      <div className="dot-texture absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
        <ReceiptText size={16} className="text-accent" /> Your bill
      </div>

      <dl className="tabular mt-4 space-y-2 text-sm">
        <div className="flex justify-between text-white/60">
          <dt>Items</dt>
          <dd>{count}</dd>
        </div>
        {issues > 0 && (
          <div className="flex justify-between text-accent">
            <dt>Need your attention</dt>
            <dd>{issues}</dd>
          </div>
        )}
        {/* Dashed line, like a printed receipt */}
        <div className="flex items-baseline justify-between border-t border-dashed border-white/20 pt-4">
          <dt className="text-white/80">Total</dt>
          <dd className="text-3xl font-semibold tracking-tight text-accent">{rupees(total)}</dd>
        </div>
      </dl>

      {confirmError && <p className="mt-4 rounded-lg bg-danger/20 px-3 py-2 text-sm text-red-200">{confirmError}</p>}

      <button type="button" onClick={onConfirm} disabled={!canConfirm} className={`${confirmButton} mt-5 w-full`}>
        {confirming ? 'Placing order…' : <>Confirm order <ArrowRight size={16} /></>}
      </button>
      <p className="mt-3 text-center text-xs text-white/50">
        {issues > 0 ? 'Fix the highlighted items to continue.' : 'Stock is reserved for you once you confirm.'}
      </p>
    </section>
  );
}

function MobileBillBar({ issues, total, canConfirm, confirming, confirmError, onConfirm }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 bg-ink px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 text-white shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.4)] lg:hidden">
      {confirmError && <p className="mb-2 text-sm text-red-200">{confirmError}</p>}
      <div className="flex items-center justify-between gap-4">
        <div className="tabular">
          <p className="text-xl font-semibold leading-tight text-accent">{rupees(total)}</p>
          <p className={`text-xs ${issues > 0 ? 'text-accent' : 'text-white/60'}`}>
            {issues > 0 ? `${issues} item${issues > 1 ? 's' : ''} need${issues > 1 ? '' : 's'} attention` : 'Ready to confirm'}
          </p>
        </div>
        <button type="button" onClick={onConfirm} disabled={!canConfirm} className={`${confirmButton} px-6`}>
          {confirming ? 'Placing…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage 3: confirmation
// ---------------------------------------------------------------------------
function OrderPlaced({ order, onNewOrder }) {
  return (
    <section className={`${card} p-5 sm:p-7`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand">
          <Check size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order placed</h1>
          <p className="text-sm text-muted">
            Order <span className="font-mono">#{order._id.slice(-6).toUpperCase()}</span> · <StatusPill status={order.status} />
          </p>
        </div>
      </div>

      <ul className="tabular mt-6 divide-y divide-line border-y border-line text-sm">
        {order.items.map((item) => (
          <li key={item.product} className="flex items-center justify-between gap-4 py-3">
            <span>
              {item.name} <span className="text-muted">· {formatQty(item.quantity, item.unit)}</span>
            </span>
            <span className="font-semibold">{rupees(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <div className="tabular mt-3 flex items-baseline justify-between">
        <span className="font-semibold">Total</span>
        <span className="text-2xl font-semibold">{rupees(order.total)}</span>
      </div>

      <p className="mt-6 text-sm text-muted">We’ll pack it shortly. You can track it under “Your past orders”.</p>
      <button type="button" onClick={onNewOrder} className={`${btn.secondary} mt-4`}>
        Place another order
      </button>
    </section>
  );
}
