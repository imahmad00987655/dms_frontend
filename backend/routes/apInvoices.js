import express from 'express';
import pool from '../config/database.js';
import APSequenceManager from '../utils/apSequenceManager.js';

const router = express.Router();

// Get all invoices with supplier and site information
router.get('/', async (req, res) => {
    try {
        const { status, supplier_id, due_date_from, due_date_to } = req.query;
        
        let whereClause = 'WHERE 1=1';
        const params = [];
        
        if (status) {
            whereClause += ' AND i.status = ?';
            params.push(status);
        }
        
        if (supplier_id) {
            whereClause += ' AND i.supplier_id = ?';
            params.push(supplier_id);
        }
        
        if (due_date_from) {
            whereClause += ' AND i.due_date >= ?';
            params.push(due_date_from);
        }
        
        if (due_date_to) {
            whereClause += ' AND i.due_date <= ?';
            params.push(due_date_to);
        }
        
        const [rows] = await pool.execute(`
            SELECT i.*, 
                   s.supplier_name, s.supplier_number, s.supplier_type,
                   si.site_name as pay_to_site_name,
                   COUNT(il.line_id) as line_count,
                   SUM(il.total_line_amount) as calculated_total
            FROM ap_invoices i
            LEFT JOIN ap_suppliers s ON i.supplier_id = s.supplier_id
            LEFT JOIN ap_supplier_sites si ON i.pay_to_site_id = si.site_id
            LEFT JOIN ap_invoice_lines il ON i.invoice_id = il.invoice_id
            ${whereClause}
            GROUP BY i.invoice_id
            ORDER BY i.invoice_date DESC, i.invoice_id DESC
        `, params);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Get invoice by ID with line items
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get invoice header
        const [invoiceRows] = await pool.execute(`
            SELECT i.*, 
                   s.supplier_name, s.supplier_number, s.supplier_type,
                   si.site_name as pay_to_site_name, si.address_line1, si.city, si.state
            FROM ap_invoices i
            LEFT JOIN ap_suppliers s ON i.supplier_id = s.supplier_id
            LEFT JOIN ap_supplier_sites si ON i.pay_to_site_id = si.site_id
            WHERE i.invoice_id = ?
        `, [id]);
        
        if (invoiceRows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Get line items
        const [lineRows] = await pool.execute(`
            SELECT * FROM ap_invoice_lines 
            WHERE invoice_id = ? 
            ORDER BY line_number
        `, [id]);
        
        // Get payment applications
        const [paymentRows] = await pool.execute(`
            SELECT pa.*, p.payment_number, p.payment_date
            FROM ap_payment_applications pa
            LEFT JOIN ap_payments p ON pa.payment_id = p.payment_id
            WHERE pa.invoice_id = ? AND pa.status = 'ACTIVE'
            ORDER BY pa.applied_date
        `, [id]);
        
        const invoice = invoiceRows[0];
        invoice.line_items = lineRows;
        invoice.payment_applications = paymentRows;
        
        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Create new invoice
router.post('/', async (req, res) => {
    try {
        const {
            supplier_id,
            pay_to_site_id,
            invoice_number,
            invoice_date,
            due_date,
            payment_terms_id,
            currency_code,
            subtotal,
            tax_amount,
            total_amount,
            notes,
            line_items
        } = req.body;

        // Validate required fields
        if (!supplier_id || !pay_to_site_id || !invoice_date || !line_items || line_items.length === 0) {
            return res.status(400).json({ 
                error: 'Supplier ID, pay-to site ID, invoice date, and line items are required' 
            });
        }

        // Check if invoice number already exists
        if (invoice_number) {
            const [existing] = await pool.execute(`
                SELECT invoice_id FROM ap_invoices WHERE invoice_number = ?
            `, [invoice_number]);
            
            if (existing.length > 0) {
                return res.status(400).json({ error: 'Invoice number already exists' });
            }
        }

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            // Generate invoice ID and number
            const invoiceId = await APSequenceManager.getNextInvoiceId();
            const generatedInvoiceNumber = invoice_number || APSequenceManager.generateInvoiceNumber(invoiceId);

            // Calculate due date if not provided
            const calculatedDueDate = due_date || 
                new Date(new Date(invoice_date).getTime() + (payment_terms_id || 30) * 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0];

            // Insert invoice header
            await pool.execute(`
                INSERT INTO ap_invoices (
                    invoice_id, invoice_number, supplier_id, pay_to_site_id,
                    invoice_date, due_date, payment_terms_id, currency_code,
                    subtotal, tax_amount, total_amount, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                invoiceId, generatedInvoiceNumber, supplier_id, pay_to_site_id,
                invoice_date, calculatedDueDate, payment_terms_id || 30,
                currency_code || 'USD', subtotal || 0, tax_amount || 0,
                total_amount || 0, notes || null, 1
            ]);

            // Insert line items
            for (let i = 0; i < line_items.length; i++) {
                const line = line_items[i];
                const lineId = await APSequenceManager.getNextInvoiceLineId();
                
                await pool.execute(`
                    INSERT INTO ap_invoice_lines (
                        line_id, invoice_id, line_number, item_code, item_name,
                        description, quantity, unit_price, line_amount,
                        tax_rate, tax_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    lineId, invoiceId, i + 1, line.item_code || null,
                    line.item_name, line.description || null, line.quantity || 1,
                    line.unit_price || 0, line.line_amount || 0,
                    line.tax_rate || 0, line.tax_amount || 0
                ]);
            }

            await pool.execute('COMMIT');

            // Fetch the created invoice with line items
            const [newInvoice] = await pool.execute(`
                SELECT * FROM ap_invoices WHERE invoice_id = ?
            `, [invoiceId]);

            const [lines] = await pool.execute(`
                SELECT * FROM ap_invoice_lines WHERE invoice_id = ?
            `, [invoiceId]);

            const resultInvoice = newInvoice[0];
            resultInvoice.line_items = lines;

            res.status(201).json(resultInvoice);
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Update invoice
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            supplier_id,
            pay_to_site_id,
            invoice_number,
            invoice_date,
            due_date,
            payment_terms_id,
            currency_code,
            subtotal,
            tax_amount,
            total_amount,
            notes,
            line_items
        } = req.body;

        // Check if invoice exists
        const [existing] = await pool.execute(`
            SELECT invoice_id, status FROM ap_invoices WHERE invoice_id = ?
        `, [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Don't allow updates to paid invoices
        if (existing[0].status === 'PAID') {
            return res.status(400).json({ error: 'Cannot update paid invoice' });
        }

        // Check if invoice number already exists (excluding current invoice)
        if (invoice_number) {
            const [nameExists] = await pool.execute(`
                SELECT invoice_id FROM ap_invoices 
                WHERE invoice_number = ? AND invoice_id != ?
            `, [invoice_number, id]);
            
            if (nameExists.length > 0) {
                return res.status(400).json({ error: 'Invoice number already exists' });
            }
        }

        // Start transaction
        await pool.execute('START TRANSACTION');

        try {
            // Update invoice header
            await pool.execute(`
                UPDATE ap_invoices SET
                    supplier_id = COALESCE(?, supplier_id),
                    pay_to_site_id = COALESCE(?, pay_to_site_id),
                    invoice_number = COALESCE(?, invoice_number),
                    invoice_date = COALESCE(?, invoice_date),
                    due_date = COALESCE(?, due_date),
                    payment_terms_id = COALESCE(?, payment_terms_id),
                    currency_code = COALESCE(?, currency_code),
                    subtotal = COALESCE(?, subtotal),
                    tax_amount = COALESCE(?, tax_amount),
                    total_amount = COALESCE(?, total_amount),
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE invoice_id = ?
            `, [
                supplier_id, pay_to_site_id, invoice_number, invoice_date,
                due_date, payment_terms_id, currency_code, subtotal,
                tax_amount, total_amount, notes, id
            ]);

            // Update line items if provided
            if (line_items && line_items.length > 0) {
                // Delete existing line items
                await pool.execute(`
                    DELETE FROM ap_invoice_lines WHERE invoice_id = ?
                `, [id]);

                // Insert new line items
                for (let i = 0; i < line_items.length; i++) {
                    const line = line_items[i];
                    const lineId = await APSequenceManager.getNextInvoiceLineId();
                    
                    await pool.execute(`
                        INSERT INTO ap_invoice_lines (
                            line_id, invoice_id, line_number, item_code, item_name,
                            description, quantity, unit_price, line_amount,
                            tax_rate, tax_amount
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        lineId, id, i + 1, line.item_code || null,
                        line.item_name, line.description || null, line.quantity || 1,
                        line.unit_price || 0, line.line_amount || 0,
                        line.tax_rate || 0, line.tax_amount || 0
                    ]);
                }
            }

            await pool.execute('COMMIT');

            // Fetch updated invoice
            const [updatedInvoice] = await pool.execute(`
                SELECT * FROM ap_invoices WHERE invoice_id = ?
            `, [id]);

            const [lines] = await pool.execute(`
                SELECT * FROM ap_invoice_lines WHERE invoice_id = ?
            `, [id]);

            const resultInvoice = updatedInvoice[0];
            resultInvoice.line_items = lines;

            res.json(resultInvoice);
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).json({ error: 'Failed to update invoice' });
    }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approval_status } = req.body;

        // Check if invoice exists
        const [existing] = await pool.execute(`
            SELECT invoice_id FROM ap_invoices WHERE invoice_id = ?
        `, [id]);
        
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        // Update status
        const updateFields = [];
        const params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);
        }

        if (approval_status) {
            updateFields.push('approval_status = ?');
            params.push(approval_status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No status fields provided' });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        await pool.execute(`
            UPDATE ap_invoices SET ${updateFields.join(', ')} WHERE invoice_id = ?
        `, params);

        // Fetch updated invoice
        const [updatedInvoice] = await pool.execute(`
            SELECT * FROM ap_invoices WHERE invoice_id = ?
        `, [id]);

        res.json(updatedInvoice[0]);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

// Delete invoice (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if invoice has payments
        const [payments] = await pool.execute(`
            SELECT COUNT(*) as count FROM ap_payment_applications 
            WHERE invoice_id = ? AND status = 'ACTIVE'
        `, [id]);

        if (payments[0].count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete invoice with payment applications' 
            });
        }

        // Soft delete invoice and line items
        await pool.execute(`
            UPDATE ap_invoices SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
            WHERE invoice_id = ?
        `, [id]);

        res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    }
});

// Get invoice line items
router.get('/:id/lines', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT * FROM ap_invoice_lines 
            WHERE invoice_id = ? 
            ORDER BY line_number
        `, [id]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching invoice lines:', error);
        res.status(500).json({ error: 'Failed to fetch invoice lines' });
    }
});

// Get invoice payment applications
router.get('/:id/payments', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(`
            SELECT pa.*, p.payment_number, p.payment_date, p.payment_method
            FROM ap_payment_applications pa
            LEFT JOIN ap_payments p ON pa.payment_id = p.payment_id
            WHERE pa.invoice_id = ? AND pa.status = 'ACTIVE'
            ORDER BY pa.applied_date
        `, [id]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching invoice payments:', error);
        res.status(500).json({ error: 'Failed to fetch invoice payments' });
    }
});

export default router; 