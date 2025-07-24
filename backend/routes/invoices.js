import express from 'express';
import { executeQuery } from '../config/database.js';
import pool from '../config/database.js';

const router = express.Router();

function safe(val) {
  return val === undefined ? null : val;
}

// Helper function to get next sequence value
async function getNextSequenceValue(sequenceName) {
  await pool.query(
    'UPDATE ar_sequences SET current_value = current_value + increment_by WHERE sequence_name = ?',
    [sequenceName]
  );
  const [nextVal] = await pool.query(
    'SELECT current_value FROM ar_sequences WHERE sequence_name = ?',
    [sequenceName]
  );
  return nextVal[0].current_value;
}

// Create invoice
router.post('/', async (req, res) => {
  const {
    invoice_number, customer_name, invoice_date, due_date,
    payment_terms, notes, status, subtotal, tax_amount, total, line_items
  } = req.body;

  try {
    // Start transaction
    await pool.query('START TRANSACTION');

    // Get or create customer
    let customerId;
    let siteId;
    
    const existingCustomer = await executeQuery(
      'SELECT customer_id FROM ar_customers WHERE customer_name = ?',
      [customer_name]
    );

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].customer_id;
      // Get primary bill-to site
      const site = await executeQuery(
        'SELECT site_id FROM ar_customer_sites WHERE customer_id = ? AND site_type = "BILL_TO" AND is_primary = TRUE',
        [customerId]
      );
      siteId = site[0].site_id;
    } else {
      // Create new customer
      customerId = await getNextSequenceValue('AR_CUSTOMER_ID_SEQ');
      await executeQuery(
        'INSERT INTO ar_customers (customer_id, customer_number, customer_name, customer_type, created_by) VALUES (?, ?, ?, ?, ?)',
        [customerId, `CUST${customerId.toString().padStart(6, '0')}`, customer_name, 'CORPORATE', 1]
      );

      // Create default bill-to site
      siteId = await getNextSequenceValue('AR_CUSTOMER_SITE_ID_SEQ');
      await executeQuery(
        'INSERT INTO ar_customer_sites (site_id, customer_id, site_name, site_type, is_primary) VALUES (?, ?, ?, ?, ?)',
        [siteId, customerId, `${customer_name} - Main Office`, 'BILL_TO', true]
      );
    }

    // Create invoice
    const invoiceId = await getNextSequenceValue('AR_INVOICE_ID_SEQ');
    await executeQuery(
      `INSERT INTO ar_invoices
      (invoice_id, invoice_number, customer_id, bill_to_site_id, invoice_date, due_date, 
       payment_terms_id, subtotal, tax_amount, total_amount, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoiceId, safe(invoice_number), customerId, siteId, safe(invoice_date), safe(due_date),
        safe(payment_terms), safe(subtotal), safe(tax_amount), safe(total), 
        safe(status) || 'DRAFT', safe(notes), 1
      ]
    );

    // Create invoice lines
    if (line_items && Array.isArray(line_items)) {
      for (let i = 0; i < line_items.length; i++) {
        const line = line_items[i];
        const lineId = await getNextSequenceValue('AR_INVOICE_LINE_ID_SEQ');
        
        await executeQuery(
          `INSERT INTO ar_invoice_lines
          (line_id, invoice_id, line_number, item_name, description, quantity, 
           unit_price, line_amount, tax_rate, tax_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lineId, invoiceId, i + 1, safe(line.item_name) || 'Item', safe(line.description),
            safe(line.quantity) || 1, safe(line.unit_price) || 0, safe(line.line_amount) || 0,
            safe(line.tax_rate) || 0, safe(line.tax_amount) || 0
          ]
        );
      }
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'Invoice created', invoice_id: invoiceId });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Fetch invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoiceRows = await executeQuery(`
      SELECT i.*, c.customer_name, c.customer_number, s.site_name
      FROM ar_invoices i
      JOIN ar_customers c ON i.customer_id = c.customer_id
      JOIN ar_customer_sites s ON i.bill_to_site_id = s.site_id
      WHERE i.invoice_id = ?
    `, [req.params.id]);

    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = invoiceRows[0];

    // Get invoice lines
    const lineRows = await executeQuery(
      'SELECT * FROM ar_invoice_lines WHERE invoice_id = ? ORDER BY line_number',
      [req.params.id]
    );

    invoice.line_items = lineRows;
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch all invoices
router.get('/', async (req, res) => {
  try {
    const rows = await executeQuery(`
      SELECT i.*, c.customer_name, c.customer_number
      FROM ar_invoices i
      JOIN ar_customers c ON i.customer_id = c.customer_id
      ORDER BY i.invoice_id DESC
    `);

    // For each invoice, get the line items
    const invoices = await Promise.all(rows.map(async (invoice) => {
      const lineRows = await executeQuery(
        'SELECT * FROM ar_invoice_lines WHERE invoice_id = ? ORDER BY line_number',
        [invoice.invoice_id]
      );
      return {
        ...invoice,
        line_items: lineRows
      };
    }));

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  
  try {
    await executeQuery(
      'UPDATE ar_invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE invoice_id = ?',
      [status, req.params.id]
    );
    res.json({ message: 'Invoice status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 