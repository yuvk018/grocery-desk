// Guards.jsx - "route guards": they decide if a page may be shown.
// If the visitor hasn't picked a role yet, they're sent back to the home page.
// <Outlet /> means "show the page that's inside this route".
//
// Note: this only hides pages in the browser. The REAL protection is on the server
// (requireShopkeeper middleware): without a valid token the API refuses shopkeeper requests.

import { Navigate, Outlet } from 'react-router';
import { useSession } from '../context/SessionContext.jsx';

export function RequireCustomer() {
  const { customerName } = useSession();
  return customerName ? <Outlet /> : <Navigate to="/" replace />;
}

export function RequireShopkeeper() {
  const { isShopkeeper } = useSession();
  return isShopkeeper ? <Outlet /> : <Navigate to="/" replace />;
}
