import express from 'express';
import { executeQuery } from '../config/database.js';

const router = express.Router();

function safe(val) {
  return val === undefined ? null : val;
}

// Create invoice
router.post('/', async (req, res) => {
  const {
    invoice_number, customer_id, customer_name, invoice_date, due_date,
    payment_terms, notes, status, subtotal, tax_amount, total, line_items
  } = req.body;

  try {
    await executeQuery(
      `INSERT INTO create_invoice
      (invoice_number, customer_id, customer_name, invoice_date, due_date, payment_terms, notes, status, subtotal, tax_amount, total, line_items)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safe(invoice_number), safe(customer_id), safe(customer_name), safe(invoice_date), safe(due_date),
        safe(payment_terms), safe(notes), safe(status), safe(subtotal), safe(tax_amount), safe(total), JSON.stringify(line_items)
      ]
    );
    res.status(201).json({ message: 'Invoice created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM create_invoice WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const invoice = rows[0];
    invoice.line_items = JSON.parse(invoice.line_items);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all invoices
router.get('/', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM create_invoice ORDER BY id DESC');
    // Parse line_items JSON for each invoice
    const invoices = rows.map(inv => ({
      ...inv,
      line_items: JSON.parse(inv.line_items)
    }));
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 