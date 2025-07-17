import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all vendor invoices
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM vendor_invoices 
            ORDER BY created_at DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching vendor invoices:', error);
        res.status(500).json({ error: 'Failed to fetch vendor invoices' });
    }
});

// Get vendor invoice by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM vendor_invoices 
            WHERE id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Vendor invoice not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching vendor invoice:', error);
        res.status(500).json({ error: 'Failed to fetch vendor invoice' });
    }
});

// Create new vendor invoice
router.post('/', async (req, res) => {
    try {
        const {
            invoice_number,
            vendor_name,
            vendor_id,
            invoice_date,
            due_date,
            payment_terms,
            subtotal,
            tax_amount,
            total,
            currency,
            status,
            notes,
            line_items
        } = req.body;

        // Validate required fields
        if (!invoice_number || !vendor_name || !invoice_date) {
            return res.status(400).json({ 
                error: 'Invoice number, vendor name, and invoice date are required' 
            });
        }

        // Check if invoice number already exists
        const [existing] = await pool.execute(`
            SELECT id FROM vendor_invoices WHERE invoice_number = ?
        `, [invoice_number]);
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Invoice number already exists' });
        }

        // Insert new vendor invoice
        const [result] = await pool.execute(`
            INSERT INTO vendor_invoices (
                invoice_number, vendor_name, vendor_id, invoice_date, due_date,
                payment_terms, subtotal, tax_amount, total, currency, status, notes, line_items
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            invoice_number, vendor_name, vendor_id || null, invoice_date, due_date || null,
            payment_terms || 30, subtotal || 0, tax_amount || 0, total || 0,
            currency || 'USD', status || 'draft', notes || null, JSON.stringify(line_items || [])
        ]);
        
        // Fetch the created invoice
        const [newInvoice] = await pool.execute(`
            SELECT * FROM vendor_invoices WHERE id = ?
        `, [result.insertId]);
        
        res.status(201).json(newInvoice[0]);
    } catch (error) {
        console.error('Error creating vendor invoice:', error);
        res.status(500).json({ error: 'Failed to create vendor invoice' });
    }
});

// Update vendor invoice
router.put('/:id', async (req, res) => {
    try {
        const {
            invoice_number,
            vendor_name,
            vendor_id,
            invoice_date,
            due_date,
            payment_terms,
            subtotal,
            tax_amount,
            total,
            currency,
            status,
            notes,
            line_items
        } = req.body;

        // Check if invoice exists
        const [existing] = await pool.execute(`
            SELECT id FROM vendor_invoices WHERE id = ?
        `, [req.params.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Vendor invoice not found' });
        }

        // Check if invoice number already exists (excluding current invoice)
        if (invoice_number) {
            const [duplicate] = await pool.execute(`
                SELECT id FROM vendor_invoices WHERE invoice_number = ? AND id != ?
            `, [invoice_number, req.params.id]);
            
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Invoice number already exists' });
            }
        }

        // Update vendor invoice
        await pool.execute(`
            UPDATE vendor_invoices SET
                invoice_number = COALESCE(?, invoice_number),
                vendor_name = COALESCE(?, vendor_name),
                vendor_id = ?,
                invoice_date = COALESCE(?, invoice_date),
                due_date = ?,
                payment_terms = COALESCE(?, payment_terms),
                subtotal = COALESCE(?, subtotal),
                tax_amount = COALESCE(?, tax_amount),
                total = COALESCE(?, total),
                currency = COALESCE(?, currency),
                status = COALESCE(?, status),
                notes = ?,
                line_items = COALESCE(?, line_items),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            invoice_number, vendor_name, vendor_id || null, invoice_date, due_date || null,
            payment_terms, subtotal, tax_amount, total, currency, status, notes || null,
            line_items ? JSON.stringify(line_items) : null, req.params.id
        ]);
        
        // Fetch the updated invoice
        const [updatedInvoice] = await pool.execute(`
            SELECT * FROM vendor_invoices WHERE id = ?
        `, [req.params.id]);
        
        res.json(updatedInvoice[0]);
    } catch (error) {
        console.error('Error updating vendor invoice:', error);
        res.status(500).json({ error: 'Failed to update vendor invoice' });
    }
});

// Delete vendor invoice
router.delete('/:id', async (req, res) => {
    try {
        // Check if invoice exists
        const [existing] = await pool.execute(`
            SELECT id FROM vendor_invoices WHERE id = ?
        `, [req.params.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Vendor invoice not found' });
        }

        // Delete the invoice
        await pool.execute(`
            DELETE FROM vendor_invoices WHERE id = ?
        `, [req.params.id]);
        
        res.json({ message: 'Vendor invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting vendor invoice:', error);
        res.status(500).json({ error: 'Failed to delete vendor invoice' });
    }
});

export default router; 