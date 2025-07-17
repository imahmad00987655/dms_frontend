import pool from './config/database.js';

const createPaymentsTable = async () => {
  try {
    console.log('🔧 Creating payments table...');
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_number VARCHAR(50) NOT NULL UNIQUE,
        payment_date DATE NOT NULL,
        vendor_name VARCHAR(255) NOT NULL,
        vendor_id VARCHAR(50),
        invoice_number VARCHAR(50),
        amount_paid DECIMAL(15,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_method VARCHAR(50),
        bank_account VARCHAR(100),
        reference_number VARCHAR(100),
        status ENUM('pending', 'processed', 'failed', 'cancelled') DEFAULT 'pending',
        description TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_number (payment_number),
        INDEX idx_vendor_name (vendor_name),
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_payment_date (payment_date),
        INDEX idx_status (status)
      )
    `;
    
    await pool.execute(createTableQuery);
    console.log('✅ payments table created successfully');
    
    // Check if table exists and show current data
    const [tables] = await pool.execute(`
      SHOW TABLES LIKE 'payments'
    `);
    
    if (tables.length > 0) {
      console.log('✅ payments table exists');
      
      // Show current data
      const [rows] = await pool.execute(`
        SELECT * FROM payments ORDER BY created_at DESC
      `);
      
      console.log(`📊 Current payments in database: ${rows.length}`);
      if (rows.length > 0) {
        console.log('📋 Payments:');
        rows.forEach((payment, index) => {
          console.log(`${index + 1}. ${payment.payment_number} - ${payment.vendor_name} - $${payment.amount_paid} - ${payment.status}`);
        });
      } else {
        console.log('📭 No payments found in database');
      }
    } else {
      console.log('❌ payments table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error creating payments table:', error);
  } finally {
    process.exit(0);
  }
};

createPaymentsTable(); 