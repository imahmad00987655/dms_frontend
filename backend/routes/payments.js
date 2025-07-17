import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all payments
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM payments 
            ORDER BY created_at DESC
        `);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get payment by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM payments 
            WHERE id = ?
        `, [req.params.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
});

// Create new payment
router.post('/', async (req, res) => {
    try {
        const {
            payment_number,
            payment_date,
            vendor_name,
            vendor_id,
            invoice_number,
            amount_paid,
            currency,
            payment_method,
            bank_account,
            reference_number,
            status,
            description,
            notes
        } = req.body;

        // Validate required fields
        if (!payment_number || !payment_date || !vendor_name || !amount_paid) {
            return res.status(400).json({ 
                error: 'Payment number, payment date, vendor name, and amount are required' 
            });
        }

        // Check if payment number already exists
        const [existing] = await pool.execute(`
            SELECT id FROM payments WHERE payment_number = ?
        `, [payment_number]);
        
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Payment number already exists' });
        }

        // Insert new payment
        const [result] = await pool.execute(`
            INSERT INTO payments (
                payment_number, payment_date, vendor_name, vendor_id, invoice_number,
                amount_paid, currency, payment_method, bank_account, reference_number,
                status, description, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payment_number, payment_date, vendor_name, vendor_id || null, invoice_number || null,
            amount_paid, currency || 'USD', payment_method || null, bank_account || null,
            reference_number || null, status || 'pending', description || null, notes || null
        ]);
        
        // Fetch the created payment
        const [newPayment] = await pool.execute(`
            SELECT * FROM payments WHERE id = ?
        `, [result.insertId]);
        
        res.status(201).json(newPayment[0]);
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Update payment
router.put('/:id', async (req, res) => {
    try {
        const {
            payment_number,
            payment_date,
            vendor_name,
            vendor_id,
            invoice_number,
            amount_paid,
            currency,
            payment_method,
            bank_account,
            reference_number,
            status,
            description,
            notes
        } = req.body;

        // Check if payment exists
        const [existing] = await pool.execute(`
            SELECT id FROM payments WHERE id = ?
        `, [req.params.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Check if payment number already exists (excluding current payment)
        if (payment_number) {
            const [duplicate] = await pool.execute(`
                SELECT id FROM payments WHERE payment_number = ? AND id != ?
            `, [payment_number, req.params.id]);
            
            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Payment number already exists' });
            }
        }

        // Update payment
        await pool.execute(`
            UPDATE payments SET
                payment_number = COALESCE(?, payment_number),
                payment_date = COALESCE(?, payment_date),
                vendor_name = COALESCE(?, vendor_name),
                vendor_id = ?,
                invoice_number = ?,
                amount_paid = COALESCE(?, amount_paid),
                currency = COALESCE(?, currency),
                payment_method = ?,
                bank_account = ?,
                reference_number = ?,
                status = COALESCE(?, status),
                description = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            payment_number, payment_date, vendor_name, vendor_id || null, invoice_number || null,
            amount_paid, currency, payment_method || null, bank_account || null,
            reference_number || null, status, description || null, notes || null, req.params.id
        ]);
        
        // Fetch the updated payment
        const [updatedPayment] = await pool.execute(`
            SELECT * FROM payments WHERE id = ?
        `, [req.params.id]);
        
        res.json(updatedPayment[0]);
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    try {
        // Check if payment exists
        const [existing] = await pool.execute(`
            SELECT id FROM payments WHERE id = ?
        `, [req.params.id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Delete the payment
        await pool.execute(`
            DELETE FROM payments WHERE id = ?
        `, [req.params.id]);
        
        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    }
});

export default router; 