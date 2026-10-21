// main.jsx - the starting point of the React app. It puts <App /> into the #root div of index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  // StrictMode: extra warnings during development, no effect in production.
  <StrictMode>
    {/* BrowserRouter: lets us show different pages for different URLs (/customer, /shop...) */}
    <BrowserRouter>
      {/* SessionProvider: shares "who is using the app" with every page */}
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>
);
