// Header.jsx - the bar at the top: shop name, who is using the app, and a way to switch role.
// It stays at the top while scrolling ("sticky") with a frosted-glass background.

import { Link, useLocation, useNavigate } from 'react-router';
import { LogOut, ShoppingBasket, Store, UserRound } from 'lucide-react';
import { useSession } from '../context/SessionContext.jsx';

export default function Header() {
  const { customerName, setCustomerName, isShopkeeper, logoutShopkeeper } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Which role is active depends on the page we're on.
  const onShopPages = pathname.startsWith('/shop') && isShopkeeper;
  const onCustomerPages = pathname.startsWith('/customer') && customerName;

  function switchRole() {
    if (onShopPages) logoutShopkeeper();
    if (onCustomerPages) setCustomerName('');
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          {/* Logo: a basket icon on a green gradient, with a small saffron dot */}
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-brand to-brand-dark text-white shadow-sm shadow-brand/30">
            <ShoppingBasket size={18} strokeWidth={2} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-semibold tracking-tight text-ink">Sharma General Store</span>
            <span className="hidden text-xs text-muted sm:block">Order desk</span>
          </span>
        </Link>

        {(onShopPages || onCustomerPages) && (
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <span className="hidden items-center gap-2 rounded-full border border-line bg-paper/60 py-1 pl-1 pr-3 sm:inline-flex">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-soft text-brand">
                {onShopPages ? <Store size={13} /> : <UserRound size={13} />}
              </span>
              <span className="font-medium">{onShopPages ? 'Shopkeeper' : customerName}</span>
            </span>
            <button
              onClick={switchRole}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-muted transition hover:bg-ink/5 hover:text-ink"
            >
              <LogOut size={15} /> {onShopPages ? 'Log out' : 'Switch'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
