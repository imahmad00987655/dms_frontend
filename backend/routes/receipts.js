import express from 'express';
import { executeQuery } from '../config/database.js';
import pool from '../config/database.js';

const router = express.Router();

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

// List all receipts
router.get('/', async (req, res) => {
  try {
    const receipts = await executeQuery(`
      SELECT r.*, c.customer_name, c.customer_number
      FROM ar_receipts r
      JOIN ar_customers c ON r.customer_id = c.customer_id
      ORDER BY r.receipt_id DESC
    `);
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single receipt by ID
router.get('/:id', async (req, res) => {
  try {
    const receiptRows = await executeQuery(`
      SELECT r.*, c.customer_name, c.customer_number
      FROM ar_receipts r
      JOIN ar_customers c ON r.customer_id = c.customer_id
      WHERE r.receipt_id = ?
    `, [req.params.id]);
    
    if (receiptRows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const receipt = receiptRows[0];
    
    // Get receipt applications
    const applications = await executeQuery(`
      SELECT ra.*, i.invoice_number
      FROM ar_receipt_applications ra
      JOIN ar_invoices i ON ra.invoice_id = i.invoice_id
      WHERE ra.receipt_id = ? AND ra.status = 'ACTIVE'
    `, [req.params.id]);
    
    receipt.applications = applications;
    res.json(receipt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new receipt
router.post('/', async (req, res) => {
  const {
    receipt_number, receipt_date, customer_name, invoice_number, amount_received,
    currency, payment_method, bank_account, reference_number, status, description
  } = req.body;
  
  try {
    // Start transaction
    await pool.query('START TRANSACTION');
    
    // Get or create customer
    let customerId;
    const existingCustomer = await executeQuery(
      'SELECT customer_id FROM ar_customers WHERE customer_name = ?',
      [customer_name]
    );

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].customer_id;
    } else {
      // Create new customer
      customerId = await getNextSequenceValue('AR_CUSTOMER_ID_SEQ');
      await executeQuery(
        'INSERT INTO ar_customers (customer_id, customer_number, customer_name, customer_type, created_by) VALUES (?, ?, ?, ?, ?)',
        [customerId, `CUST${customerId.toString().padStart(6, '0')}`, customer_name, 'CORPORATE', 1]
      );
    }
    
    // Create receipt
    const receiptId = await getNextSequenceValue('AR_RECEIPT_ID_SEQ');
    await executeQuery(
      `INSERT INTO ar_receipts
      (receipt_id, receipt_number, customer_id, receipt_date, currency_code, 
       total_amount, payment_method, bank_account, reference_number, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptId, receipt_number, customerId, receipt_date, currency || 'USD',
        amount_received, payment_method, bank_account, reference_number, 
        status || 'CONFIRMED', description, 1
      ]
    );
    
    // If invoice number is provided, create receipt application
    if (invoice_number && invoice_number.trim() !== '') {
      const invoiceRows = await executeQuery(
        'SELECT invoice_id, amount_due FROM ar_invoices WHERE invoice_number = ?',
        [invoice_number]
      );
      
      if (invoiceRows.length > 0) {
        const invoice = invoiceRows[0];
        const applicationId = await getNextSequenceValue('AR_RECEIPT_APPLICATION_ID_SEQ');
        
        // Apply the receipt to the invoice
        const appliedAmount = Math.min(amount_received, invoice.amount_due);
        
        await executeQuery(
          `INSERT INTO ar_receipt_applications
          (application_id, receipt_id, invoice_id, applied_amount, applied_date, created_by)
          VALUES (?, ?, ?, ?, ?, ?)`,
          [applicationId, receiptId, invoice.invoice_id, appliedAmount, receipt_date, 1]
        );
        
        // Update receipt amount_applied
        await executeQuery(
          'UPDATE ar_receipts SET amount_applied = ? WHERE receipt_id = ?',
          [appliedAmount, receiptId]
        );
        
        // Update invoice amount_paid
        await executeQuery(
          'UPDATE ar_invoices SET amount_paid = amount_paid + ? WHERE invoice_id = ?',
          [appliedAmount, invoice.invoice_id]
        );
      }
    }
    
    await pool.query('COMMIT');
    res.status(201).json({ message: 'Receipt created', receipt_id: receiptId });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Apply receipt to invoice
router.post('/:receiptId/apply', async (req, res) => {
  const { invoice_id, applied_amount } = req.body;
  
  try {
    // Validate receipt and invoice
    const receiptRows = await executeQuery(
      'SELECT total_amount, amount_applied FROM ar_receipts WHERE receipt_id = ?',
      [req.params.receiptId]
    );
    
    const invoiceRows = await executeQuery(
      'SELECT amount_due FROM ar_invoices WHERE invoice_id = ?',
      [invoice_id]
    );
    
    if (receiptRows.length === 0) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    if (invoiceRows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const receipt = receiptRows[0];
    const invoice = invoiceRows[0];
    
    // Validate application amount
    const availableAmount = receipt.total_amount - receipt.amount_applied;
    if (applied_amount > availableAmount) {
      return res.status(400).json({ error: 'Application amount exceeds available receipt amount' });
    }
    
    if (applied_amount > invoice.amount_due) {
      return res.status(400).json({ error: 'Application amount exceeds invoice amount due' });
    }
    
    // Create receipt application
    const applicationId = await getNextSequenceValue('AR_RECEIPT_APPLICATION_ID_SEQ');
    await executeQuery(
      `INSERT INTO ar_receipt_applications
      (application_id, receipt_id, invoice_id, applied_amount, applied_date, created_by)
      VALUES (?, ?, ?, ?, CURRENT_DATE, ?)`,
      [applicationId, req.params.receiptId, invoice_id, applied_amount, 1]
    );
    
    // Update receipt amount_applied
    await executeQuery(
      'UPDATE ar_receipts SET amount_applied = amount_applied + ? WHERE receipt_id = ?',
      [applied_amount, req.params.receiptId]
    );
    
    // Update invoice amount_paid
    await executeQuery(
      'UPDATE ar_invoices SET amount_paid = amount_paid + ? WHERE invoice_id = ?',
      [applied_amount, invoice_id]
    );
    
    res.json({ message: 'Receipt applied successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router; 