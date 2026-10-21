// Home.jsx - the role switch (landing page).
// One panel split in two: the shop's name and what the desk does on the left,
// and a Customer / Shopkeeper form on the right. On phones the two halves stack.

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, History, Lock, MessageSquareText, ReceiptText, ShoppingBasket, UserRound } from 'lucide-react';

import { useSession } from '../context/SessionContext.jsx';
import { btn, fieldError, input, label } from '../components/ui.js';

// The three things a first-time visitor should know, each with an icon.
const POINTS = [
  { icon: MessageSquareText, title: 'Order the way you text', text: 'English, Hindi or a mix of both.' },
  { icon: ReceiptText, title: 'See the bill first', text: 'Every item and price, before you confirm.' },
  { icon: History, title: 'Reorder in one tap', text: 'Your past orders are always a click away.' },
];

// The shop's sections (from the catalog), shown as small tags.
const SECTIONS = ['Atta & rice', 'Dals', 'Milk & eggs', 'Oils', 'Vegetables', 'Daily needs'];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-line/70 bg-surface shadow-lift md:grid md:grid-cols-[1.1fr_1fr] lg:mt-4">
      <BrandPanel />
      <RoleForm />
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="relative isolate overflow-hidden bg-linear-to-br from-brand via-brand-dark to-[#0c2a20] px-6 py-8 text-white sm:px-10 md:py-12">
      {/* Decoration: dot texture and a warm glow in the corner */}
      <div className="dot-texture absolute inset-0 -z-10" aria-hidden="true" />
      <div className="absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
          <ShoppingBasket size={22} strokeWidth={1.75} />
        </span>
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent ring-1 ring-accent/30">
          Order desk
        </span>
      </div>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Sharma General Store</h1>
      <p className="mt-2 max-w-sm text-white/70">Your neighbourhood grocery, now taking orders online.</p>

      <ul className="mt-8 space-y-5 md:mt-10">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-accent ring-1 ring-white/10">
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-sm text-white/65">{text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 hidden flex-wrap gap-2 border-t border-white/10 pt-6 md:mt-12 md:flex">
        {SECTIONS.map((s) => (
          <span key={s} className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/70 ring-1 ring-white/10">{s}</span>
        ))}
      </div>
    </section>
  );
}

function RoleForm() {
  const [role, setRole] = useState('customer');

  return (
    <section className="flex flex-col justify-center px-6 py-8 sm:px-10 md:py-12">
      {/* Segmented control: two buttons acting as one switch */}
      <div className="mb-8 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-semibold ring-1 ring-line/60" role="tablist">
        {[
          ['customer', 'Customer', UserRound],
          ['shop', 'Shopkeeper', Lock],
        ].map(([value, text, Icon]) => (
          <button
            key={value}
            role="tab"
            aria-selected={role === value}
            onClick={() => setRole(value)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 transition ${
              role === value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={15} /> {text}
          </button>
        ))}
      </div>

      {role === 'customer' ? <CustomerForm /> : <ShopkeeperForm />}
    </section>
  );
}

function CustomerForm() {
  const { customerName, setCustomerName } = useSession();
  const [name, setName] = useState(customerName);
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!name.trim()) return;
    setCustomerName(name.trim());
    navigate('/customer');
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold tracking-tight">Welcome</h2>
      <p className="mb-7 mt-1 text-sm text-muted">Tell us your name to start an order.</p>

      <label htmlFor="customer-name" className={label}>Your name</label>
      <input
        id="customer-name"
        className={input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Ravi Kumar"
        maxLength={60}
        autoComplete="name"
      />
      <button type="submit" className={`${btn.primary} mt-5 w-full py-3`} disabled={!name.trim()}>
        Start my order <ArrowRight size={16} />
      </button>
    </form>
  );
}

function ShopkeeperForm() {
  const { isShopkeeper, loginShopkeeper } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginShopkeeper(password);
      navigate('/shop');
    } catch (err) {
      setError(err.message); // e.g. "Wrong password"
    } finally {
      setLoading(false);
    }
  }

  if (isShopkeeper) {
    return (
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">You’re signed in</h2>
        <p className="mb-7 mt-1 text-sm text-muted">Pick up where you left off.</p>
        <button type="button" onClick={() => navigate('/shop')} className={`${btn.primary} w-full py-3`}>
          Open dashboard <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold tracking-tight">Shopkeeper sign in</h2>
      <p className="mb-7 mt-1 text-sm text-muted">Manage orders, stock and prices.</p>

      <label htmlFor="shop-password" className={label}>Password</label>
      <input
        id="shop-password"
        type="password"
        className={input}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p className={fieldError}>{error}</p>}
      <button type="submit" className={`${btn.primary} mt-5 w-full py-3`} disabled={!password || loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
