// ProductForm.jsx - the form to add a new product or edit an existing one.
//
// Props:
//   product - the product to edit, or null to add a new one
//   onDone  - called with the saved product after a successful save
//   onCancel- called when the shopkeeper closes the form
//
// The server does the real validation (Zod). If it rejects the data, we show each
// message under the matching field, using the "details" list our API returns.

import { useState } from 'react';
import { api } from '../api/client.js';
import { btn, card, fieldError, input, label } from './ui.js';

const UNITS = ['kg', 'litre', 'piece', 'packet', 'dozen'];

// Turn a product from the API into form values (the form works with text).
function toFormValues(product) {
  return {
    name: product?.name ?? '',
    unit: product?.unit ?? 'kg',
    price: product?.price ?? '',
    stock: product?.stock ?? '',
    aliases: (product?.aliases ?? []).join(', '),
    packAmount: product?.packSize?.amount ?? '',
    packUnit: product?.packSize?.unit ?? 'g',
  };
}

// Turn form values back into what the API expects.
function toRequestBody(values) {
  const body = {
    name: values.name,
    unit: values.unit,
    price: values.price,
    stock: values.stock,
    aliases: values.aliases.split(',').map((a) => a.trim()).filter(Boolean),
  };
  if (values.packAmount !== '') body.packSize = { amount: values.packAmount, unit: values.packUnit };
  return body;
}

export default function ProductForm({ product, onDone, onCancel }) {
  const isEdit = Boolean(product);
  const [values, setValues] = useState(() => toFormValues(product));
  const [errors, setErrors] = useState({}); // { price: 'Price cannot be negative', ... }
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // One change handler for every field: uses the input's "name" to know which value to update.
  function handleChange(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setFormError('');
    setSaving(true);
    try {
      const body = toRequestBody(values);
      const saved = isEdit ? await api.put(`/products/${product._id}`, body) : await api.post('/products', body);
      onDone(saved);
    } catch (err) {
      // Put each server message next to its field ("packSize.amount" -> the pack size box).
      const byField = {};
      for (const d of err.details ?? []) byField[d.field.startsWith('packSize') ? 'packAmount' : d.field] = d.message;
      setErrors(byField);
      if (!err.details) setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} mb-6 p-5 sm:p-6`}>
      <h2 className="mb-5 text-xl font-semibold tracking-tight">{isEdit ? `Edit ${product.code} · ${product.name}` : 'Add a product'}</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pf-name">Name</label>
          <input id="pf-name" name="name" className={input} value={values.name} onChange={handleChange} placeholder="e.g. Ghee (500 ml)" />
          {errors.name && <p className={fieldError}>{errors.name}</p>}
        </div>

        <div>
          <label className={label} htmlFor="pf-unit">Sold per</label>
          <select id="pf-unit" name="unit" className={input} value={values.unit} onChange={handleChange}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          {errors.unit && <p className={fieldError}>{errors.unit}</p>}
        </div>

        <div>
          <label className={label} htmlFor="pf-price">Price per unit (₹)</label>
          <input id="pf-price" name="price" type="number" step="0.01" className={input} value={values.price} onChange={handleChange} />
          {errors.price && <p className={fieldError}>{errors.price}</p>}
        </div>

        <div>
          <label className={label} htmlFor="pf-stock">Stock (units)</label>
          <input id="pf-stock" name="stock" type="number" step="any" className={input} value={values.stock} onChange={handleChange} />
          {errors.stock && <p className={fieldError}>{errors.stock}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="pf-aliases">Other names (comma separated)</label>
          <input id="pf-aliases" name="aliases" className={input} value={values.aliases} onChange={handleChange} placeholder="e.g. ghee, desi ghee" />
          <p className="mt-1 text-xs text-muted">Helps the assistant understand Hindi or short names.</p>
        </div>

        <div>
          <label className={label} htmlFor="pf-pack">Pack size (optional)</label>
          <div className="flex gap-2">
            <input id="pf-pack" name="packAmount" type="number" className={input} value={values.packAmount} onChange={handleChange} placeholder="500" />
            <select name="packUnit" aria-label="Pack size unit" className={`${input} w-20`} value={values.packUnit} onChange={handleChange}>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
          {errors.packAmount && <p className={fieldError}>{errors.packAmount}</p>}
        </div>
      </div>

      {formError && <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn.secondary}>Cancel</button>
        <button type="submit" className={btn.primary} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}
