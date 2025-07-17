import express from 'express';
import { executeQuery } from '../config/database.js';

const router = express.Router();

// List all receipts
router.get('/', async (req, res) => {
  try {
    const receipts = await executeQuery('SELECT * FROM receipts ORDER BY id DESC');
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const rows = await executeQuery('SELECT * FROM receipts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new receipt
router.post('/', async (req, res) => {
  const {
    receipt_number, receipt_date, customer_name, invoice_number, amount_received,
    currency, payment_method, deposit_account, reference_number, status, description
  } = req.body;
  try {
    await executeQuery(
      `INSERT INTO receipts
      (receipt_number, receipt_date, customer_name, invoice_number, amount_received, currency, payment_method, deposit_account, reference_number, status, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receipt_number, receipt_date, customer_name, invoice_number, amount_received,
        currency, payment_method, deposit_account, reference_number, status, description
      ]
    );
    res.status(201).json({ message: 'Receipt created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 