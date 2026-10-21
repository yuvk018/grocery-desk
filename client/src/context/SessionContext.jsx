// SessionContext.jsx - remembers WHO is using the app, and shares it with every page.
//
// - Customer:   just a name (no password). Used to label orders and find "my past orders".
// - Shopkeeper: a login token from POST /api/auth/login.
//
// "Context" is React's way to share data without passing it through every component by hand.
// Any component can call useSession() to read or change the session.

import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../api/client.js';

const SessionContext = createContext(null);
const NAME_KEY = 'customerName';

function readName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function SessionProvider({ children }) {
  const [customerName, setCustomerNameState] = useState(readName);
  const [isShopkeeper, setIsShopkeeper] = useState(() => Boolean(getToken()));

  // Save the customer's name in the browser so they don't retype it after a refresh.
  function setCustomerName(name) {
    setCustomerNameState(name);
    try {
      if (name) localStorage.setItem(NAME_KEY, name);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      // ignore
    }
  }

  async function loginShopkeeper(password) {
    const { token } = await api.post('/auth/login', { password }); // throws ApiError on a wrong password
    setToken(token);
    setIsShopkeeper(true);
  }

  function logoutShopkeeper() {
    setToken(null);
    setIsShopkeeper(false);
  }

  // If any request comes back 401 (token expired), log the shopkeeper out automatically.
  useEffect(() => {
    setUnauthorizedHandler(logoutShopkeeper);
  }, []);

  const value = { customerName, setCustomerName, isShopkeeper, loginShopkeeper, logoutShopkeeper };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
