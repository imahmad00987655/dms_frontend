import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const setupAPTables = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fluent_financial_flow'
  });

  try {
    console.log('Setting up AP tables...');

    // Create AP sequences table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_sequences (
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
    await connection.execute(`
      INSERT INTO ap_sequences (sequence_name, current_value) VALUES
      ('AP_SUPPLIER_ID_SEQ', 1),
      ('AP_SUPPLIER_SITE_ID_SEQ', 1),
      ('AP_INVOICE_ID_SEQ', 1),
      ('AP_INVOICE_LINE_ID_SEQ', 1),
      ('AP_PAYMENT_ID_SEQ', 1),
      ('AP_PAYMENT_APPLICATION_ID_SEQ', 1)
      ON DUPLICATE KEY UPDATE current_value = current_value
    `);

    // Create AP suppliers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_suppliers (
        supplier_id BIGINT PRIMARY KEY,
        supplier_number VARCHAR(30) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        supplier_type ENUM('VENDOR', 'CONTRACTOR', 'SERVICE_PROVIDER') DEFAULT 'VENDOR',
        tax_id VARCHAR(50),
        payment_terms_id INT DEFAULT 30,
        currency_code VARCHAR(10) DEFAULT 'USD',
        credit_limit DECIMAL(15,2) DEFAULT 0.00,
        hold_flag BOOLEAN DEFAULT FALSE,
        status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_supplier_number (supplier_number),
        INDEX idx_supplier_name (supplier_name),
        INDEX idx_status (status)
      )
    `);

    // Create AP supplier sites table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_supplier_sites (
        site_id BIGINT PRIMARY KEY,
        supplier_id BIGINT NOT NULL,
        site_name VARCHAR(255) NOT NULL,
        site_type ENUM('BILL_TO', 'SHIP_TO', 'BOTH') DEFAULT 'BILL_TO',
        address_line1 VARCHAR(255),
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
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_site_type (site_type),
        INDEX idx_is_primary (is_primary)
      )
    `);

    // Create AP invoices table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_invoices (
        invoice_id BIGINT PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id BIGINT NOT NULL,
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
        approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
        status ENUM('DRAFT', 'OPEN', 'PAID', 'CANCELLED', 'VOID') DEFAULT 'DRAFT',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_bill_to_site_id (bill_to_site_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_due_date (due_date),
        INDEX idx_status (status),
        INDEX idx_amount_due (amount_due)
      )
    `);

    // Create AP invoice lines table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_invoice_lines (
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
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_line_number (line_number),
        UNIQUE KEY uk_invoice_line (invoice_id, line_number)
      )
    `);

    // Create AP payments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_payments (
        payment_id BIGINT PRIMARY KEY,
        payment_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id BIGINT NOT NULL,
        payment_date DATE NOT NULL,
        currency_code VARCHAR(10) DEFAULT 'USD',
        exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
        payment_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        amount_applied DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        unapplied_amount DECIMAL(15,2) GENERATED ALWAYS AS (payment_amount - amount_applied) STORED,
        payment_method VARCHAR(50),
        bank_account VARCHAR(100),
        reference_number VARCHAR(100),
        status ENUM('DRAFT', 'APPROVED', 'PROCESSED', 'CANCELLED', 'VOID') DEFAULT 'DRAFT',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_number (payment_number),
        INDEX idx_supplier_id (supplier_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_status (status),
        INDEX idx_unapplied_amount (unapplied_amount)
      )
    `);

    // Create AP payment applications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ap_payment_applications (
        application_id BIGINT PRIMARY KEY,
        payment_id BIGINT NOT NULL,
        invoice_id BIGINT NOT NULL,
        application_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        application_date DATE NOT NULL,
        status ENUM('ACTIVE', 'CANCELLED', 'VOID') DEFAULT 'ACTIVE',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_payment_id (payment_id),
        INDEX idx_invoice_id (invoice_id),
        INDEX idx_application_date (application_date),
        INDEX idx_status (status),
        UNIQUE KEY uk_payment_invoice (payment_id, invoice_id)
      )
    `);

    console.log('✅ AP tables created successfully!');
    console.log('📋 Tables created:');
    console.log('  - ap_sequences');
    console.log('  - ap_suppliers');
    console.log('  - ap_supplier_sites');
    console.log('  - ap_invoices');
    console.log('  - ap_invoice_lines');
    console.log('  - ap_payments');
    console.log('  - ap_payment_applications');

  } catch (error) {
    console.error('❌ Error setting up AP tables:', error);
  } finally {
    await connection.end();
  }
};

setupAPTables(); 