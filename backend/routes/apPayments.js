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
        
        // Calculate applied amount from applications and ensure amount_applied is correct
        const [rows] = await pool.execute(`
            SELECT p.*, 
                   s.supplier_name, s.supplier_number,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ap_payment_applications pa 
                       WHERE pa.payment_id = p.payment_id AND pa.status = 'ACTIVE'
                   ), 0) as application_count,
                   COALESCE((
                       SELECT SUM(pa.applied_amount) 
                       FROM ap_payment_applications pa 
                       WHERE pa.payment_id = p.payment_id AND pa.status = 'ACTIVE'
                   ), 0) as calculated_applied
            FROM ap_payments p
            LEFT JOIN ap_suppliers s ON p.supplier_id = s.supplier_id
            ${whereClause}
            ORDER BY p.payment_date DESC, p.payment_id DESC
        `, params);
        
        // Update amount_applied in the payment record if it doesn't match calculated_applied
        // This ensures data consistency. unapplied_amount is auto-calculated by database.
        for (const row of rows) {
            const calculatedApplied = Number(row.calculated_applied) || 0;
            const currentApplied = Number(row.amount_applied) || 0;
            
            // If there's a mismatch, update the payment record
            // The unapplied_amount will be automatically recalculated by the database
            if (Math.abs(calculatedApplied - currentApplied) > 0.01) {
                try {
                    await pool.execute(`
                        UPDATE ap_payments 
                        SET amount_applied = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE payment_id = ?
                    `, [calculatedApplied, row.payment_id]);
                    // Fetch updated row to get the auto-calculated unapplied_amount
                    const [updatedRow] = await pool.execute(`
                        SELECT payment_amount, amount_applied, unapplied_amount 
                        FROM ap_payments 
                        WHERE payment_id = ?
                    `, [row.payment_id]);
                    if (updatedRow[0]) {
                        row.amount_applied = Number(updatedRow[0].amount_applied) || 0;
                        row.unapplied_amount = Number(updatedRow[0].unapplied_amount) || 0;
                    }
                } catch (updateError) {
                    console.error(`Error updating amount_applied for payment ${row.payment_id}:`, updateError);
                    // Use calculated values as fallback
                    row.amount_applied = calculatedApplied;
                    row.unapplied_amount = Number(row.payment_amount) - calculatedApplied;
                }
            } else {
                // Use database values (unapplied_amount is auto-calculated)
                row.amount_applied = Number(row.amount_applied) || 0;
                row.unapplied_amount = Number(row.unapplied_amount) || 0;
            }
        }
        
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
            ORDER BY pa.application_date
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
            payment_amount, // Accept both for backward compatibility
            payment_method,
            bank_account,
            reference_number,
            notes,
            applications
        } = req.body;

        // Use payment_amount if provided, otherwise use total_amount
        const paymentAmount = payment_amount || total_amount;

        // Validate required fields
        if (!supplier_id || !payment_date || !paymentAmount) {
            return res.status(400).json({ 
                error: 'Supplier ID, payment date, and payment amount are required' 
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

        // Start transaction (must use query, not execute, for transaction commands)
        await pool.query('START TRANSACTION');

        try {
            // Generate payment ID and number
            const paymentId = await APSequenceManager.getNextPaymentId();
            if (!paymentId) {
                throw new Error('Failed to generate payment ID');
            }
            
            const generatedPaymentNumber = payment_number || APSequenceManager.generatePaymentNumber(paymentId);
            if (!generatedPaymentNumber) {
                throw new Error('Failed to generate payment number');
            }

            // Ensure all values are properly defined (no undefined values)
            const safeSupplierId = Number(supplier_id) || null;
            const safePaymentDate = payment_date || null;
            const safeCurrencyCode = currency_code || 'USD';
            const safePaymentAmount = Number(paymentAmount) || 0;
            const safePaymentMethod = payment_method ? String(payment_method) : null;
            const safeBankAccount = bank_account ? String(bank_account) : null;
            const safeReferenceNumber = reference_number ? String(reference_number) : null;
            const safeNotes = notes ? String(notes) : null;

            // Validate critical fields
            if (!safeSupplierId) {
                throw new Error('Supplier ID is required and must be a valid number');
            }
            if (!safePaymentDate) {
                throw new Error('Payment date is required');
            }
            if (!safePaymentAmount || safePaymentAmount <= 0) {
                throw new Error('Payment amount is required and must be greater than 0');
            }

            // Insert payment header - using payment_amount column (actual database column name)
            await pool.execute(`
                INSERT INTO ap_payments (
                    payment_id, payment_number, supplier_id, payment_date,
                    currency_code, payment_amount, payment_method, bank_account,
                    reference_number, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                paymentId, 
                generatedPaymentNumber, 
                safeSupplierId, 
                safePaymentDate,
                safeCurrencyCode, 
                safePaymentAmount, 
                safePaymentMethod,
                safeBankAccount, 
                safeReferenceNumber, 
                safeNotes, 
                1
            ]);

            // Process applications if provided
            if (applications && applications.length > 0) {
                let totalApplied = 0;
                
                for (const app of applications) {
                    // Log the application for debugging
                    console.log('Processing application:', JSON.stringify(app));
                    
                    // Validate and convert required fields
                    // Handle both applied_amount and application_amount field names (frontend sends application_amount)
                    const invoiceIdRaw = app.invoice_id;
                    const appliedAmountRaw = app.applied_amount !== undefined ? app.applied_amount : 
                                           (app.application_amount !== undefined ? app.application_amount : null);
                    const appliedDateRaw = app.applied_date || app.application_date;
                    
                    if (invoiceIdRaw === undefined || invoiceIdRaw === null) {
                        throw new Error(`Application missing invoice_id: ${JSON.stringify(app)}`);
                    }
                    if (appliedAmountRaw === undefined || appliedAmountRaw === null) {
                        throw new Error(`Application missing applied_amount/application_amount: ${JSON.stringify(app)}`);
                    }
                    
                    // Convert to numbers
                    const invoiceId = Number(invoiceIdRaw);
                    const appliedAmount = Number(appliedAmountRaw);
                    const appliedDate = appliedDateRaw || safePaymentDate;
                    const appNotes = app.notes ? String(app.notes) : null;
                    
                    // Validate converted values
                    if (isNaN(invoiceId) || invoiceId <= 0 || !Number.isInteger(invoiceId)) {
                        throw new Error(`Application invalid invoice_id (must be a positive integer): ${JSON.stringify(app)}`);
                    }
                    if (isNaN(appliedAmount) || appliedAmount <= 0) {
                        throw new Error(`Application invalid applied_amount (must be a positive number, got: ${appliedAmountRaw}): ${JSON.stringify(app)}`);
                    }
                    if (!appliedDate) {
                        throw new Error(`Application missing applied_date: ${JSON.stringify(app)}`);
                    }
                    
                    const applicationId = await APSequenceManager.getNextPaymentApplicationId();
                    if (!applicationId) {
                        throw new Error('Failed to generate application ID');
                    }
                    
                    await pool.execute(`
                        INSERT INTO ap_payment_applications (
                            application_id, payment_id, invoice_id, applied_amount,
                            application_date, status, notes
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                        applicationId, 
                        paymentId, 
                        invoiceId, 
                        appliedAmount,
                        appliedDate, 
                        'ACTIVE', 
                        appNotes
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
                    `, [appliedAmount, appliedAmount, invoiceId]);

                    totalApplied += appliedAmount;
                }

                // Update payment amount_applied
                await pool.execute(`
                    UPDATE ap_payments 
                    SET amount_applied = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE payment_id = ?
                `, [totalApplied, paymentId]);
            }

            await pool.query('COMMIT');

            // Fetch the created payment with applications
            const [newPayment] = await pool.execute(`
                SELECT * FROM ap_payments WHERE payment_id = ?
            `, [paymentId]);

            const [paymentApplications] = await pool.execute(`
                SELECT pa.*, i.invoice_number
                FROM ap_payment_applications pa
                LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
                WHERE pa.payment_id = ?
            `, [paymentId]);

            const resultPayment = newPayment[0];
            resultPayment.applications = paymentApplications;

            res.status(201).json(resultPayment);
        } catch (error) {
            await pool.query('ROLLBACK');
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
            payment_amount, // Accept both for backward compatibility
            payment_method,
            bank_account,
            reference_number,
            notes
        } = req.body;

        // Use payment_amount if provided, otherwise use total_amount
        const paymentAmount = payment_amount || total_amount;

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

        // Update payment (using payment_amount column which exists in database)
        await pool.execute(`
            UPDATE ap_payments SET
                supplier_id = COALESCE(?, supplier_id),
                payment_number = COALESCE(?, payment_number),
                payment_date = COALESCE(?, payment_date),
                currency_code = COALESCE(?, currency_code),
                payment_amount = COALESCE(?, payment_amount),
                payment_method = ?,
                bank_account = ?,
                reference_number = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE payment_id = ?
        `, [
            supplier_id, payment_number, payment_date, currency_code,
            paymentAmount, payment_method, bank_account, reference_number,
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
            ORDER BY pa.application_date
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

        // Check if payment exists (using payment_amount column which exists in database)
        const [payment] = await pool.execute(`
            SELECT payment_id, payment_amount, amount_applied FROM ap_payments WHERE payment_id = ?
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
        const remainingPaymentAmount = payment[0].payment_amount - payment[0].amount_applied;
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

        // Start transaction (must use query, not execute, for transaction commands)
        await pool.query('START TRANSACTION');

        try {
            const applicationId = await APSequenceManager.getNextPaymentApplicationId();
            
            // Insert application
            await pool.execute(`
                INSERT INTO ap_payment_applications (
                    application_id, payment_id, invoice_id, applied_amount,
                    application_date, status, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                applicationId, id, invoice_id, applied_amount,
                applied_date || new Date().toISOString().split('T')[0],
                'ACTIVE', notes || null
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

            await pool.query('COMMIT');

            // Fetch the created application
            const [newApplication] = await pool.execute(`
                SELECT pa.*, i.invoice_number
                FROM ap_payment_applications pa
                LEFT JOIN ap_invoices i ON pa.invoice_id = i.invoice_id
                WHERE pa.application_id = ?
            `, [applicationId]);

            res.status(201).json(newApplication[0]);
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating payment application:', error);
        res.status(500).json({ error: 'Failed to create payment application' });
    }
});

export default router; 