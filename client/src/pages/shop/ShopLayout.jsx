// ShopLayout.jsx - the shopkeeper area: pill-style tabs at the top, and the chosen page below (<Outlet />).

import { NavLink, Outlet } from 'react-router';
import { ClipboardList, Package, Sparkles } from 'lucide-react';

const TABS = [
  { to: '/shop', label: 'Orders', icon: ClipboardList, end: true }, // "end" = only active on exactly /shop
  { to: '/shop/catalog', label: 'Catalog', icon: Package },
  { to: '/shop/usage', label: 'Assistant', icon: Sparkles },
];

// NavLink knows if its URL is the current page, so we can highlight the active tab.
const tabClass = ({ isActive }) =>
  `inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
  }`;

export default function ShopLayout() {
  return (
    <div>
      <nav className="mb-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-ink/4 p-1 ring-1 ring-line/60">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
