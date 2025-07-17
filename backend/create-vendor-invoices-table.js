import pool from './config/database.js';

const createVendorInvoicesTable = async () => {
  try {
    console.log('🔧 Creating vendor_invoices table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS vendor_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        vendor_name VARCHAR(255) NOT NULL,
        vendor_id VARCHAR(50),
        invoice_date DATE NOT NULL,
        due_date DATE,
        payment_terms INT DEFAULT 30,
        subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'USD',
        status ENUM('draft', 'pending', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
        notes TEXT,
        line_items JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_vendor_name (vendor_name),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_due_date (due_date),
        INDEX idx_status (status)
      )
    `;
    
    await pool.execute(createTableQuery);
    console.log('✅ vendor_invoices table created successfully');
    
    // Check if table exists and show current data
    const [tables] = await pool.execute(`
      SHOW TABLES LIKE 'vendor_invoices'
    `);
    
    if (tables.length > 0) {
      console.log('✅ vendor_invoices table exists');
      
      // Show current data
      const [rows] = await pool.execute(`
        SELECT * FROM vendor_invoices ORDER BY created_at DESC
      `);
      
      console.log(`📊 Current vendor invoices in database: ${rows.length}`);
      if (rows.length > 0) {
        console.log('📋 Vendor invoices:');
        rows.forEach((invoice, index) => {
          console.log(`${index + 1}. ${invoice.invoice_number} - ${invoice.vendor_name} - $${invoice.total} - ${invoice.status}`);
        });
      } else {
        console.log('📭 No vendor invoices found in database');
      }
    } else {
      console.log('❌ vendor_invoices table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error creating vendor_invoices table:', error);
  } finally {
    process.exit(0);
  }
};

createVendorInvoicesTable(); 