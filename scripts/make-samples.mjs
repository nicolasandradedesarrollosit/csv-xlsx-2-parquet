import { mkdir, writeFile } from 'node:fs/promises';
import { utils, write } from 'xlsx';

const OUT = new URL('../public/samples/', import.meta.url);
const ROWS = 240;

let seed = 20261002;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const pad = (value, length = 2) => String(value).padStart(length, '0');

const CUSTOMERS = [
  ['00042', 'Almacén Don Pepe', 'Rosario'],
  ['00107', 'Ferretería El Tornillo', 'Córdoba'],
  ['00310', 'Librería Atenea', 'Buenos Aires'],
  ['01250', 'Panadería La Espiga', 'Mendoza'],
  ['00008', 'Kiosco 24', 'Rosario'],
  ['04471', 'Vivero Los Ceibos', 'Santa Fe'],
  ['00963', 'Óptica Mirar', 'La Plata'],
  ['02005', 'Bicicletería Pedal', 'Salta'],
];
const PRODUCTS = ['Notebook 14"', 'Monitor 27"', 'Teclado mecánico', 'Mouse inalámbrico', 'Silla ergonómica', 'Webcam HD'];
const NOTES = ['', '', '', 'Entrega urgente', 'Cliente nuevo', 'Pago en dos cuotas; revisar', 'Retira en sucursal'];

const localDate = (date) => `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
const localDecimal = (value) => {
  const [whole, fraction] = value.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction}`;
};
const excelSerial = (date) => date.getTime() / 86400000 + 25569;

const orders = Array.from({ length: ROWS }, (_, index) => {
  const [code, customer, city] = pick(CUSTOMERS);
  const date = new Date(Date.UTC(2025, Math.floor(random() * 12), 1 + Math.floor(random() * 28)));
  const quantity = 1 + Math.floor(random() * 12);
  const unitPrice = Math.round((1500 + random() * 480000) * 100) / 100;
  return {
    id: 1001 + index,
    code,
    customer,
    city,
    product: pick(PRODUCTS),
    date,
    quantity,
    unitPrice,
    discount: random() < 0.3 ? Math.round(random() * 25 * 10) / 10 : null,
    paid: random() < 0.7,
    notes: pick(NOTES),
  };
});

const csvField = (value) => (/[";\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value);
const csvHeader = ['order_id', 'customer_code', 'customer', 'city', 'product', 'order_date', 'quantity', 'unit_price', 'discount_pct', 'paid', 'notes'];
const csvRows = orders.map((order) =>
  [
    String(order.id),
    order.code,
    order.customer,
    order.city,
    order.product,
    localDate(order.date),
    String(order.quantity),
    localDecimal(order.unitPrice),
    order.discount === null ? '' : String(order.discount).replace('.', ','),
    order.paid ? 'true' : 'false',
    order.notes,
  ]
    .map(csvField)
    .join(';'),
);

const text = (v) => ({ t: 's', v });
const number = (v, z) => (z ? { t: 'n', v, z } : { t: 'n', v });

const orderSheet = utils.aoa_to_sheet([
  ['order_id', 'customer_code', 'customer', 'product', 'order_date', 'delivery_date', 'quantity', 'unit_price', 'list_price', 'paid', 'notes'],
  ...orders.map((order) => [
    number(order.id),
    text(order.code),
    text(order.customer),
    text(order.product),
    number(excelSerial(order.date), 'dd/mm/yyyy'),
    text(localDate(new Date(order.date.getTime() + 5 * 86400000))),
    number(order.quantity),
    number(order.unitPrice, '#,##0.00'),
    text(localDecimal(order.unitPrice * 1.15)),
    { t: 'b', v: order.paid },
    order.notes ? text(order.notes) : null,
  ]),
]);
orderSheet['!cols'] = [8, 14, 26, 20, 12, 14, 9, 14, 14, 7, 28].map((wch) => ({ wch }));

const customerSheet = utils.aoa_to_sheet([
  ['customer_code', 'branch_code', 'name', 'city', 'customer_since', 'credit_limit', 'active'],
  ...CUSTOMERS.map(([code, name, city], index) => [
    text(code),
    number(index + 1, '000'),
    text(name),
    text(city),
    text(`${pad(3 + index * 3)}/${pad(1 + index)}/${2015 + index}`),
    text(localDecimal(50000 + index * 37500.5)),
    text(index % 3 === 0 ? 'no' : 'yes'),
  ]),
]);
customerSheet['!cols'] = [14, 12, 26, 16, 15, 14, 8].map((wch) => ({ wch }));

const workbook = utils.book_new();
utils.book_append_sheet(workbook, orderSheet, 'Orders');
utils.book_append_sheet(workbook, customerSheet, 'Customers');
utils.book_append_sheet(workbook, utils.aoa_to_sheet([]), 'Empty');

await mkdir(OUT, { recursive: true });
await writeFile(new URL('sales.csv', OUT), `${csvHeader.join(';')}\n${csvRows.join('\n')}\n`);
await writeFile(new URL('sales.xlsx', OUT), write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }));

console.log(`Wrote sales.csv and sales.xlsx (${ROWS} orders, ${CUSTOMERS.length} customers).`);
