// catalog.js - the 20 sample products from the assignment PDF.
// IMPORTANT: code, name, unit, price and stock must stay exactly as in the PDF,
// because the interviewers test against them. Only "aliases" and "packSize" are our additions.
//
// Note on aliases: generic words are shared on purpose so ambiguity is detected, not guessed:
//   "rice"/"chawal" -> both rices, "dal" -> both dals, "milk"/"doodh" -> both milks, "oil"/"tel" -> both oils.

const catalog = [
  { code: 'P01', name: 'Wheat Atta', unit: 'kg', price: 48, stock: 50, aliases: ['atta', 'aata', 'wheat flour', 'gehu atta'] },
  { code: 'P02', name: 'Basmati Rice', unit: 'kg', price: 120, stock: 30, aliases: ['basmati', 'rice', 'chawal'] },
  { code: 'P03', name: 'Sona Masoori Rice', unit: 'kg', price: 62, stock: 40, aliases: ['sona masoori', 'sona masuri', 'rice', 'chawal'] },
  { code: 'P04', name: 'Toor Dal', unit: 'kg', price: 160, stock: 20, aliases: ['toor', 'tur dal', 'arhar dal', 'dal'] },
  { code: 'P05', name: 'Moong Dal', unit: 'kg', price: 140, stock: 15, aliases: ['moong', 'mung dal', 'dal'] },
  { code: 'P06', name: 'Sugar', unit: 'kg', price: 46, stock: 40, aliases: ['cheeni', 'chini', 'shakkar'] },
  { code: 'P07', name: 'Salt (1 kg packet)', unit: 'packet', price: 28, stock: 25, aliases: ['salt', 'namak'], packSize: { amount: 1000, unit: 'g' } },
  { code: 'P08', name: 'Toned Milk (500 ml)', unit: 'packet', price: 28, stock: 60, aliases: ['toned milk', 'milk', 'doodh'], packSize: { amount: 500, unit: 'ml' } },
  { code: 'P09', name: 'Full Cream Milk (500 ml)', unit: 'packet', price: 34, stock: 40, aliases: ['full cream milk', 'milk', 'doodh'], packSize: { amount: 500, unit: 'ml' } },
  { code: 'P10', name: 'Eggs', unit: 'piece', price: 7, stock: 120, aliases: ['egg', 'anda', 'ande', 'unda'] },
  { code: 'P11', name: 'White Bread (400 g)', unit: 'packet', price: 45, stock: 12, aliases: ['bread', 'double roti'], packSize: { amount: 400, unit: 'g' } },
  { code: 'P12', name: 'Butter (100 g)', unit: 'piece', price: 58, stock: 20, aliases: ['butter', 'makhan', 'makkhan'], packSize: { amount: 100, unit: 'g' } },
  { code: 'P13', name: 'Paneer (200 g)', unit: 'packet', price: 90, stock: 8, aliases: ['paneer', 'panir'], packSize: { amount: 200, unit: 'g' } },
  { code: 'P14', name: 'Mustard Oil', unit: 'litre', price: 175, stock: 25, aliases: ['sarson tel', 'sarso ka tel', 'oil', 'tel'] },
  { code: 'P15', name: 'Sunflower Oil', unit: 'litre', price: 160, stock: 25, aliases: ['sunflower', 'oil', 'tel'] },
  { code: 'P16', name: 'Tea Leaves (250 g)', unit: 'packet', price: 135, stock: 15, aliases: ['tea', 'chai', 'chai patti', 'chaipatti'], packSize: { amount: 250, unit: 'g' } },
  { code: 'P17', name: 'Onion', unit: 'kg', price: 40, stock: 60, aliases: ['pyaaz', 'pyaz', 'pyaj', 'kanda'] },
  { code: 'P18', name: 'Potato', unit: 'kg', price: 30, stock: 80, aliases: ['aloo', 'alu', 'batata'] },
  { code: 'P19', name: 'Tomato', unit: 'kg', price: 36, stock: 30, aliases: ['tamatar', 'tamater'] },
  { code: 'P20', name: 'Bath Soap', unit: 'piece', price: 38, stock: 30, aliases: ['soap', 'sabun'] },
];

module.exports = catalog;
