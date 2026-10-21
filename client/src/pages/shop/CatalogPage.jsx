// CatalogPage.jsx - the shopkeeper's product list: search, add, edit, delete.
// Desktop shows a table; phones show a list of cards (the table would be too wide).
// Products at or below LOW_STOCK_THRESHOLD are highlighted (low-stock alert stretch goal).

import { useEffect, useState } from 'react';

import { api } from '../../api/client.js';
import ProductForm from '../../components/ProductForm.jsx';
import { Plus, Search } from 'lucide-react';
import { btn, card, heading, input } from '../../components/ui.js';
import { LOW_STOCK_THRESHOLD, rupees } from '../../utils/format.js';

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState(null); // null = form closed, 'new' = adding, or the product being edited

  async function loadProducts() {
    try {
      setProducts(await api.get('/products'));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Load the products once, when the page first opens.
  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDelete(product) {
    if (!window.confirm(`Remove ${product.name} from the catalog? Past orders are not affected.`)) return;
    try {
      await api.delete(`/products/${product._id}`);
      setProducts(products.filter((p) => p._id !== product._id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSaved() {
    setEditing(null);
    loadProducts(); // reload so the list shows the saved values
  }

  // Search by name, code or any alias ("ande" finds Eggs).
  const term = search.trim().toLowerCase();
  const isLow = (p) => p.stock <= LOW_STOCK_THRESHOLD;
  const lowStockCount = products.filter(isLow).length;
  const visible = products.filter(
    (p) => (!onlyLow || isLow(p)) && (!term || [p.name, p.code, ...p.aliases].some((t) => t.toLowerCase().includes(term)))
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className={heading}>Catalog</h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} products
            {lowStockCount > 0 && (
              <>
                {' · '}
                <button onClick={() => setOnlyLow(!onlyLow)} className="font-semibold text-warn underline-offset-4 hover:underline">
                  {onlyLow ? 'Show all' : `${lowStockCount} running low`}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-72 sm:flex-none">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className={`${input} pl-9`}
              placeholder="Search name, code or alias"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <button className={btn.primary} onClick={() => setEditing('new')}>
            <Plus size={16} /> <span className="hidden sm:inline">Add product</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {editing && (
        <ProductForm
          key={editing === 'new' ? 'new' : editing._id} // a fresh form for each product
          product={editing === 'new' ? null : editing}
          onDone={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && <p className="mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {loading && <p className="py-10 text-center text-muted">Loading…</p>}
      {!loading && visible.length === 0 && <p className="py-10 text-center text-muted">No products found.</p>}

      {visible.length > 0 && (
        <>
          {/* Desktop / tablet: table */}
          <div className={`${card} hidden overflow-hidden md:block`}>
            <table className="tabular w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Sold per</th>
                  <th className="px-5 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">In stock</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((p) => (
                  <tr key={p._id} className="hover:bg-paper/50">
                    <td className="px-5 py-3">
                      <div className="font-semibold">
                        {p.name} <span className="ml-1 font-mono text-[11px] font-normal text-muted">{p.code}</span>
                      </div>
                      {p.aliases.length > 0 && <div className="mt-0.5 text-xs text-muted">{p.aliases.join(', ')}</div>}
                    </td>
                    <td className="px-5 py-3 text-muted">{p.unit}</td>
                    <td className="px-5 py-3 text-right">{rupees(p.price)}</td>
                    <td className="px-5 py-3 text-right"><Stock stock={p.stock} /></td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <button className={btn.link} onClick={() => setEditing(p)}>Edit</button>
                      <button className={`${btn.linkDanger} ml-4`} onClick={() => handleDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: cards */}
          <ul className="space-y-2 md:hidden">
            {visible.map((p) => (
              <li key={p._id} className={`${card} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{p.name}</div>
                    <div className="tabular mt-0.5 text-sm text-muted">
                      {rupees(p.price)} / {p.unit} · <span className="font-mono text-[11px]">{p.code}</span>
                    </div>
                  </div>
                  <Stock stock={p.stock} />
                </div>
                <div className="mt-3 flex gap-4 border-t border-line pt-3">
                  <button className={btn.link} onClick={() => setEditing(p)}>Edit</button>
                  <button className={btn.linkDanger} onClick={() => handleDelete(p)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Stock number, flagged red when empty and amber when low.
function Stock({ stock }) {
  if (stock === 0) {
    return <span className="whitespace-nowrap rounded bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">Out of stock</span>;
  }
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <span className="tabular whitespace-nowrap rounded bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">{stock} left</span>;
  }
  return <span className="tabular">{stock}</span>;
}
