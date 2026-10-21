// format.js - small helpers to show numbers nicely.

// 1234.5 -> "₹1,234.50" (Indian number format). Whole rupees show no decimals: 96 -> "₹96".
export function rupees(amount) {
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

// 0.5 + "kg" -> "0.5 kg", 12 + "piece" -> "12 pieces", 1 + "packet" -> "1 packet"
export function quantity(amount, unit) {
  const plural = amount !== 1 && ['piece', 'packet', 'dozen'].includes(unit) ? `${unit}s` : unit;
  return `${amount} ${plural}`;
}

// Products at or below this stock are highlighted for the shopkeeper (low-stock alert).
export const LOW_STOCK_THRESHOLD = 10;
