import express from 'express';
import pool from '../config/database.js';
import APSequenceManager from '../utils/apSequenceManager.js';

const router = express.Router();

// Get all payments with supplier information
router.get('/', async (req, res) => {
    try {
        const { status, supplier_id, payment_date_from, payment_date_to } = req.query;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND p.status = ?';
            params.push(status);
        }
        
        if (supplier_id) {
            whereClause += ' AND p.supplier_id = ?';
            params.push(supplier_id);
        }
        
        if (payment_date_from) {
            whereClause += ' AND p.payment_date >= ?';
            params.push(payment_date_from);
        }
        
        if (payment_date_to) {
            whereClause += ' AND p.payment_date <= ?';
            params.push(payment_date_to);
        }
        
        const [rows] = await pool.execute(`
            SELECT p.*, 
                   s.supplier_name, s.supplier_number,
                   COUNT(pa.application_id) as application_count,
                   SUM(pa.applied_amount) as total_applied
            FROM ap_payments p
            LEFT JOIN ap_suppliers s ON p.supplier_id = s.supplier_id
            LEFT JOIN ap_payment_applications pa ON p.payment_id = pa.payment_id AND pa.status = 'ACTIVE'
            ${whereClause}
            GROUP BY p.payment_id
            ORDER BY p.payment_date DESC, p.payment_id DESC
        `, params);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get payment by ID with applications
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get payment header
        const [paymentRows] = await pool.execute(`
            SELECT p.*, s.supplier_name, s.supplier_number
            FROM ap_payments p
            LEFT JOIN ap_suppliers s ON p.supplier_id = s.supplier_id
            WHERE p.payment_id = ?
        `, [id]);
        
        if (paymentRows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        // Get payment applications
        const [applicationRows] = await pool.execute(`
            SELECT pa.*, i.invoice_number, i.invoice_date, i.total_amount as invoice_total
            FROM ap_payment_applications pa
            LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
            WHERE pa.payment_id = ?
            ORDER BY pa.applied_date
        `, [id]);
        
        const payment = paymentRows[0];
        payment.applications = applicationRows;
        
        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ error: 'Failed to fetch payment' });
    }
});

// Create new payment
router.post('/', async (req, res) => {
    try {
        const {
            supplier_id,
            payment_number,
            payment_date,
            currency_code,
            total_amount,
            payment_method,
            bank_account,
            reference_number,
            notes,
            applications
        } = req.body;

        // Validate required fields
        if (!supplier_id || !payment_date || !total_amount) {
            return res.status(400).json({ 
                error: 'Supplier ID, payment date, and total amount are required' 
            });
        }

        // Check if payment number already exists
        if (payment_number) {
            const [existing] = await pool.execute(`
                SELECT payment_id FROM ap_payments WHERE payment_number = ?
            `, [payment_number]);
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Payment number already exists' });
            }
        }

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            // Generate payment ID and number
            const paymentId = await APSequenceManager.getNextPaymentId();
            const generatedPaymentNumber = payment_number || APSequenceManager.generatePaymentNumber(paymentId);

            // Insert payment header
            await pool.execute(`
                INSERT INTO ap_payments (
                    payment_id, payment_number, supplier_id, payment_date,
                    currency_code, total_amount, payment_method, bank_account,
                    reference_number, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                paymentId, generatedPaymentNumber, supplier_id, payment_date,
                currency_code || 'USD', total_amount, payment_method || null,
                bank_account || null, reference_number || null, notes || null, 1
            ]);

            // Process applications if provided
            if (applications && applications.length > 0) {
                let totalApplied = 0;
                
                for (const app of applications) {
                    const applicationId = await APSequenceManager.getNextPaymentApplicationId();
                    
                    await pool.execute(`
                        INSERT INTO ap_payment_applications (
                            application_id, payment_id, invoice_id, applied_amount,
                            applied_date, status, notes, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        applicationId, paymentId, app.invoice_id, app.applied_amount,
                        app.applied_date || payment_date, 'ACTIVE', app.notes || null, 1
                    ]);

                    // Update invoice amount_paid
                    await pool.execute(`
                        UPDATE ap_invoices 
                        SET amount_paid = amount_paid + ?,
                            status = CASE 
                                WHEN (amount_paid + ?) >= total_amount THEN 'PAID'
                                ELSE 'PENDING'
                            END,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE invoice_id = ?
                    `, [app.applied_amount, app.applied_amount, app.invoice_id]);

                    totalApplied += app.applied_amount;
                }

                // Update payment amount_applied
                await pool.execute(`
                    UPDATE ap_payments 
                    SET amount_applied = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE payment_id = ?
                `, [totalApplied, paymentId]);
            }

            await pool.execute('COMMIT');

            // Fetch the created payment with applications
            const [newPayment] = await pool.execute(`
                SELECT * FROM ap_payments WHERE payment_id = ?
            `, [paymentId]);

            const [applications] = await pool.execute(`
                SELECT pa.*, i.invoice_number
                FROM ap_payment_applications pa
                LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
                WHERE pa.payment_id = ?
            `, [paymentId]);

            const resultPayment = newPayment[0];
            resultPayment.applications = applications;

            res.status(201).json(resultPayment);
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Update payment
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            supplier_id,
            payment_number,
            payment_date,
            currency_code,
            total_amount,
            payment_method,
            bank_account,
            reference_number,
            notes
        } = req.body;

        // Check if payment exists
        const [existing] = await pool.execute(`
            SELECT payment_id, status FROM ap_payments WHERE payment_id = ?
        `, [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Don't allow updates to cleared payments
        if (existing[0].status === 'CLEARED') {
            return res.status(400).json({ error: 'Cannot update cleared payment' });
        }

        // Check if payment number already exists (excluding current payment)
        if (payment_number) {
            const [nameExists] = await pool.execute(`
                SELECT payment_id FROM ap_payments 
                WHERE payment_number = ? AND payment_id != ?
            `, [payment_number, id]);
            
            if (nameExists.length > 0) {
                return res.status(400).json({ error: 'Payment number already exists' });
            }
        }

        // Update payment
        await pool.execute(`
            UPDATE ap_payments SET
                supplier_id = COALESCE(?, supplier_id),
                payment_number = COALESCE(?, payment_number),
                payment_date = COALESCE(?, payment_date),
                currency_code = COALESCE(?, currency_code),
                total_amount = COALESCE(?, total_amount),
                payment_method = ?,
                bank_account = ?,
                reference_number = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = ?
        `, [
            supplier_id, payment_number, payment_date, currency_code,
            total_amount, payment_method, bank_account, reference_number,
            notes, id
        ]);

        // Fetch updated payment
        const [updatedPayment] = await pool.execute(`
            SELECT * FROM ap_payments WHERE payment_id = ?
        `, [id]);

        res.json(updatedPayment[0]);
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    }
});

// Update payment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Check if payment exists
        const [existing] = await pool.execute(`
            SELECT payment_id FROM ap_payments WHERE payment_id = ?
        `, [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update status
        await pool.execute(`
            UPDATE ap_payments SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE payment_id = ?
        `, [status, id]);

        // Fetch updated payment
        const [updatedPayment] = await pool.execute(`
            SELECT * FROM ap_payments WHERE payment_id = ?
        `, [id]);

        res.json(updatedPayment[0]);
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Failed to update payment status' });
    }
});

// Delete payment (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if payment has applications
        const [applications] = await pool.execute(`
            SELECT COUNT(*) as count FROM ap_payment_applications 
            WHERE payment_id = ? AND status = 'ACTIVE'
        `, [id]);

        if (applications[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete payment with active applications' 
            });
        }

        // Soft delete payment
        await pool.execute(`
            UPDATE ap_payments SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
            WHERE payment_id = ?
        `, [id]);

        res.json({ message: 'Payment deleted successfully' });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    }
});

// Get payment applications
router.get('/:id/applications', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT pa.*, i.invoice_number, i.invoice_date, i.total_amount as invoice_total
            FROM ap_payment_applications pa
            LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
            WHERE pa.payment_id = ?
            ORDER BY pa.applied_date
        `, [id]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching payment applications:', error);
        res.status(500).json({ error: 'Failed to fetch payment applications' });
    }
});

// Add payment application
router.post('/:id/applications', async (req, res) => {
    try {
        const { id } = req.params;
        const { invoice_id, applied_amount, applied_date, notes } = req.body;

        // Check if payment exists
        const [payment] = await pool.execute(`
            SELECT payment_id, total_amount, amount_applied FROM ap_payments WHERE payment_id = ?
        `, [id]);
        
        if (payment.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Check if invoice exists
        const [invoice] = await pool.execute(`
            SELECT invoice_id, total_amount, amount_paid FROM ap_invoices WHERE invoice_id = ?
        `, [invoice_id]);
        
        if (invoice.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Validate application amount
        const remainingPaymentAmount = payment[0].total_amount - payment[0].amount_applied;
        const remainingInvoiceAmount = invoice[0].total_amount - invoice[0].amount_paid;
        
        if (applied_amount > remainingPaymentAmount) {
            return res.status(400).json({ 
                error: 'Applied amount exceeds remaining payment amount' 
            });
        }
        
        if (applied_amount > remainingInvoiceAmount) {
            return res.status(400).json({ 
                error: 'Applied amount exceeds remaining invoice amount' 
            });
        }

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            const applicationId = await APSequenceManager.getNextPaymentApplicationId();
            
            // Insert application
            await pool.execute(`
                INSERT INTO ap_payment_applications (
                    application_id, payment_id, invoice_id, applied_amount,
                    applied_date, status, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                applicationId, id, invoice_id, applied_amount,
                applied_date || new Date().toISOString().split('T')[0],
                'ACTIVE', notes || null, 1
            ]);

            // Update payment amount_applied
            await pool.execute(`
                UPDATE ap_payments 
                SET amount_applied = amount_applied + ?, updated_at = CURRENT_TIMESTAMP
                WHERE payment_id = ?
            `, [applied_amount, id]);

            // Update invoice amount_paid and status
            await pool.execute(`
                UPDATE ap_invoices 
                SET amount_paid = amount_paid + ?,
                    status = CASE 
                        WHEN (amount_paid + ?) >= total_amount THEN 'PAID'
                        ELSE 'PENDING'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE invoice_id = ?
            `, [applied_amount, applied_amount, invoice_id]);

            await pool.execute('COMMIT');

            // Fetch the created application
            const [newApplication] = await pool.execute(`
                SELECT pa.*, i.invoice_number
                FROM ap_payment_applications pa
                LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
                WHERE pa.application_id = ?
            `, [applicationId]);

            res.status(201).json(newApplication[0]);
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating payment application:', error);
        res.status(500).json({ error: 'Failed to create payment application' });
    }
});

export default router; 