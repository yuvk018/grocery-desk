// App.jsx - the page layout and the list of pages (routes).
//
//   /              -> Home: pick a role (customer name, or shopkeeper password)
//   /customer      -> place an order            (needs a customer name)
//   /shop          -> orders dashboard          (needs shopkeeper login)
//   /shop/catalog  -> manage products           (needs shopkeeper login)
//   /shop/usage    -> AI assistant usage log    (needs shopkeeper login)

import { Navigate, Route, Routes } from 'react-router';

import Header from './components/Header.jsx';
import { RequireCustomer, RequireShopkeeper } from './components/Guards.jsx';
import Home from './pages/Home.jsx';
import OrderPage from './pages/customer/OrderPage.jsx';
import ShopLayout from './pages/shop/ShopLayout.jsx';
import OrdersPage from './pages/shop/OrdersPage.jsx';
import CatalogPage from './pages/shop/CatalogPage.jsx';
import UsagePage from './pages/shop/UsagePage.jsx';

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route element={<RequireCustomer />}>
            <Route path="/customer" element={<OrderPage />} />
          </Route>

          <Route element={<RequireShopkeeper />}>
            <Route path="/shop" element={<ShopLayout />}>
              <Route index element={<OrdersPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="usage" element={<UsagePage />} />
            </Route>
          </Route>

          {/* Any other URL -> back to the home page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
