import { executeQuery } from './config/database.js';

const setupARTables = async () => {
  try {
    console.log('🗑️  Removing old receivables tables...');
    
    // Drop old receivables tables if they exist
    await executeQuery('DROP TABLE IF EXISTS create_invoice');
    await executeQuery('DROP TABLE IF EXISTS receipts');
    console.log('✅ Old receivables tables removed');
    
    console.log('📋 Creating new AR tables...');
    
    // Create ar_sequences table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_sequences (
        sequence_name VARCHAR(50) PRIMARY KEY,
        current_value BIGINT DEFAULT 1,
        increment_by INT DEFAULT 1,
        min_value BIGINT DEFAULT 1,
        max_value BIGINT DEFAULT 999999999999,
        cycle BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Insert default sequences
    await executeQuery(`
      INSERT IGNORE INTO ar_sequences (sequence_name, current_value) VALUES
      ('AR_CUSTOMER_ID_SEQ', 1),
      ('AR_CUSTOMER_SITE_ID_SEQ', 1),
      ('AR_INVOICE_ID_SEQ', 1),
      ('AR_INVOICE_LINE_ID_SEQ', 1),
      ('AR_RECEIPT_ID_SEQ', 1),
      ('AR_RECEIPT_APPLICATION_ID_SEQ', 1)
    `);
    
    // Create ar_customers table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_customers (
        customer_id BIGINT PRIMARY KEY,
        customer_number VARCHAR(30) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_type ENUM('INDIVIDUAL', 'CORPORATE', 'GOVERNMENT') DEFAULT 'CORPORATE',
        tax_id VARCHAR(50),
        credit_limit DECIMAL(15,2) DEFAULT 0.00,
        credit_hold_flag BOOLEAN DEFAULT FALSE,
        payment_terms_id INT DEFAULT 30,
        currency_code VARCHAR(10) DEFAULT 'USD',
        status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_customer_number (customer_number),
        INDEX idx_customer_name (customer_name),
        INDEX idx_customer_type (customer_type),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);
    
    // Create ar_customer_sites table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_customer_sites (
        site_id BIGINT PRIMARY KEY,
        customer_id BIGINT NOT NULL,
        site_name VARCHAR(255) NOT NULL,
        site_type ENUM('BILL_TO', 'SHIP_TO', 'BOTH') DEFAULT 'BILL_TO',
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        contact_person VARCHAR(255),
        is_primary BOOLEAN DEFAULT FALSE,
        status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES ar_customers(customer_id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_site_type (site_type),
        INDEX idx_is_primary (is_primary),
        INDEX idx_status (status)
      )
    `);
    
    // Create ar_invoices table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_invoices (
        invoice_id BIGINT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id BIGINT NOT NULL,
        bill_to_site_id BIGINT NOT NULL,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        payment_terms_id INT DEFAULT 30,
        currency_code VARCHAR(10) DEFAULT 'USD',
        exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
        subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_paid DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
        status ENUM('DRAFT', 'OPEN', 'PAID', 'CANCELLED', 'VOID') DEFAULT 'DRAFT',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES ar_customers(customer_id) ON DELETE RESTRICT,
        FOREIGN KEY (bill_to_site_id) REFERENCES ar_customer_sites(site_id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_customer_id (customer_id),
        INDEX idx_bill_to_site_id (bill_to_site_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_due_date (due_date),
        INDEX idx_status (status),
        INDEX idx_amount_due (amount_due),
        INDEX idx_created_by (created_by)
      )
    `);
    
    // Create ar_invoice_lines table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_invoice_lines (
        line_id BIGINT PRIMARY KEY,
        invoice_id BIGINT NOT NULL,
        line_number INT NOT NULL,
        item_code VARCHAR(50),
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        line_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        tax_rate DECIMAL(5,2) DEFAULT 0.00,
        tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        total_line_amount DECIMAL(15,2) GENERATED ALWAYS AS (line_amount + tax_amount) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES ar_invoices(invoice_id) ON DELETE CASCADE,
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_line_number (line_number),
        INDEX idx_item_code (item_code),
        UNIQUE KEY uk_invoice_line (invoice_id, line_number)
      )
    `);
    
    // Create ar_receipts table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_receipts (
        receipt_id BIGINT PRIMARY KEY,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id BIGINT NOT NULL,
        receipt_date DATE NOT NULL,
        currency_code VARCHAR(10) DEFAULT 'USD',
        exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_applied DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_unapplied DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_applied) STORED,
        payment_method VARCHAR(50),
        bank_account VARCHAR(100),
        reference_number VARCHAR(100),
        status ENUM('DRAFT', 'CONFIRMED', 'CLEARED', 'REVERSED', 'CANCELLED') DEFAULT 'DRAFT',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES ar_customers(customer_id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_receipt_number (receipt_number),
        INDEX idx_customer_id (customer_id),
        INDEX idx_receipt_date (receipt_date),
        INDEX idx_status (status),
        INDEX idx_amount_unapplied (amount_unapplied),
        INDEX idx_created_by (created_by)
      )
    `);
    
    // Create ar_receipt_applications table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS ar_receipt_applications (
        application_id BIGINT PRIMARY KEY,
        receipt_id BIGINT NOT NULL,
        invoice_id BIGINT NOT NULL,
        applied_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        applied_date DATE NOT NULL,
        status ENUM('ACTIVE', 'REVERSED', 'CANCELLED') DEFAULT 'ACTIVE',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (receipt_id) REFERENCES ar_receipts(receipt_id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES ar_invoices(invoice_id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_receipt_id (receipt_id),
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_applied_date (applied_date),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);
    
    console.log('✅ All AR tables created successfully');
    
    // Create sample data
    console.log('📝 Creating sample data...');
    
    // Create a sample customer
    await executeQuery(`
      INSERT IGNORE INTO ar_customers (customer_id, customer_number, customer_name, customer_type, created_by)
      VALUES (1, 'CUST000001', 'Sample Customer', 'CORPORATE', 1)
    `);
    
    // Create a sample customer site
    await executeQuery(`
      INSERT IGNORE INTO ar_customer_sites (site_id, customer_id, site_name, site_type, is_primary, address_line1, city, state, postal_code, country)
      VALUES (1, 1, 'Sample Customer - Main Office', 'BILL_TO', true, '123 Main St', 'Sample City', 'CA', '12345', 'USA')
    `);
    
    console.log('✅ Sample data created');
    console.log('🎉 AR tables setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up AR tables:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupARTables()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupARTables; 