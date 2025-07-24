-- Create database
CREATE DATABASE IF NOT EXISTS fluent_financial_flow;
USE fluent_financial_flow;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company VARCHAR(100),
    role ENUM('admin', 'user', 'manager') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
);

-- OTP table for email verification and password reset
CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    type ENUM('email_verification', 'password_reset') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email_type (email, type),
    INDEX idx_expires_at (expires_at)
);

-- User sessions table for tracking login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);

-- Audit log table for tracking user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, company, role, is_verified) 
VALUES ('Admin', 'User', 'admin@accuflow.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'AccuFlow', 'admin', TRUE)
ON DUPLICATE KEY UPDATE id=id;

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(20) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense') NOT NULL,
    parent_account_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_account_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
    INDEX idx_account_code (account_code),
    INDEX idx_account_type (account_type),
    INDEX idx_is_active (is_active)
);

-- Journal Entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id VARCHAR(20) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    status ENUM('draft', 'posted', 'void') DEFAULT 'draft',
    total_debit DECIMAL(15,2) DEFAULT 0.00,
    total_credit DECIMAL(15,2) DEFAULT 0.00,
    created_by INT NOT NULL,
    posted_by INT NULL,
    posted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_entry_id (entry_id),
    INDEX idx_entry_date (entry_date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Journal Entry Line Items table
CREATE TABLE IF NOT EXISTS journal_entry_line_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_entry_id INT NOT NULL,
    account_id INT NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    line_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    INDEX idx_journal_entry_id (journal_entry_id),
    INDEX idx_account_id (account_id),
    INDEX idx_line_order (line_order)
);

-- Insert default chart of accounts
INSERT INTO chart_of_accounts (account_code, account_name, account_type) VALUES
('1000', 'Cash', 'Asset'),
('1100', 'Accounts Receivable', 'Asset'),
('1200', 'Inventory', 'Asset'),
('1500', 'Equipment', 'Asset'),
('2000', 'Accounts Payable', 'Liability'),
('2100', 'Notes Payable', 'Liability'),
('3000', 'Owner''s Equity', 'Equity'),
('4000', 'Sales Revenue', 'Revenue'),
('5000', 'Cost of Goods Sold', 'Expense'),
('6000', 'Operating Expenses', 'Expense')
ON DUPLICATE KEY UPDATE account_name=VALUES(account_name), account_type=VALUES(account_type);

-- Inventory Items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    quantity INT DEFAULT 0,
    unit_price DECIMAL(15,2) DEFAULT 0.00,
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_item_code (item_code),
    INDEX idx_category (category)
);

-- Bin Card table
CREATE TABLE IF NOT EXISTS bin_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    bin_location VARCHAR(50),
    warehouse VARCHAR(100),
    unit_of_measure VARCHAR(50),
    current_stock INT DEFAULT 0,
    minimum_level INT DEFAULT 0,
    reorder_level INT DEFAULT 0,
    maximum_level INT DEFAULT 0,
    transaction_type ENUM('IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    transaction_quantity INT DEFAULT 0,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_item_code (item_code),
    INDEX idx_warehouse (warehouse)
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    sub_category VARCHAR(100),
    value DECIMAL(12,2) NOT NULL,
    purchase_date DATE NOT NULL,
    location VARCHAR(255),
    department VARCHAR(100),
    depreciation_method VARCHAR(50),
    useful_life INT,
    salvage_value DECIMAL(12,2),
    vendor VARCHAR(255),
    serial_number VARCHAR(100),
    warranty_expiry DATE,
    `condition` VARCHAR(50),
    description TEXT,
    insurance_value DECIMAL(12,2),
    maintenance_schedule TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_asset_id (asset_id),
    INDEX idx_category (category),
    INDEX idx_department (department),
    INDEX idx_purchase_date (purchase_date),
    INDEX idx_vendor (vendor),
    INDEX idx_condition (`condition`),
    INDEX idx_created_at (created_at)
);



-- ============================================================================
-- NORMALIZED RECEIVABLES SYSTEM (Oracle E-Business Suite R12 Model)
-- ============================================================================

-- Sequences for Receivables System
CREATE TABLE IF NOT EXISTS ar_sequences (
    sequence_name VARCHAR(50) PRIMARY KEY,
    current_value BIGINT DEFAULT 1,
    increment_by INT DEFAULT 1,
    min_value BIGINT DEFAULT 1,
    max_value BIGINT DEFAULT 999999999999,
    cycle BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default sequences
INSERT INTO ar_sequences (sequence_name, current_value) VALUES
('AR_CUSTOMER_ID_SEQ', 1),
('AR_CUSTOMER_SITE_ID_SEQ', 1),
('AR_INVOICE_ID_SEQ', 1),
('AR_INVOICE_LINE_ID_SEQ', 1),
('AR_RECEIPT_ID_SEQ', 1),
('AR_RECEIPT_APPLICATION_ID_SEQ', 1),
('AP_SUPPLIER_ID_SEQ', 1),
('AP_SUPPLIER_SITE_ID_SEQ', 1),
('AP_INVOICE_ID_SEQ', 1),
('AP_INVOICE_LINE_ID_SEQ', 1),
('AP_PAYMENT_ID_SEQ', 1),
('AP_PAYMENT_APPLICATION_ID_SEQ', 1)
ON DUPLICATE KEY UPDATE current_value = current_value;

-- Customers table (AR_CUSTOMERS)
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
);

-- Customer Sites table (AR_CUSTOMER_SITES)
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
);

-- Invoices table (AR_INVOICES)
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
);

-- Invoice Lines table (AR_INVOICE_LINES)
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
);

-- Receipts table (AR_RECEIPTS)
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
);

-- Receipt Applications table (AR_RECEIPT_APPLICATIONS)
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
);

-- ============================================================================
-- NORMALIZED PAYABLES SYSTEM (Oracle E-Business Suite R12 Model)
-- ============================================================================

-- Suppliers table (AP_SUPPLIERS)
CREATE TABLE IF NOT EXISTS ap_suppliers (
    supplier_id BIGINT PRIMARY KEY,
    supplier_number VARCHAR(30) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_type ENUM('VENDOR', 'CONTRACTOR', 'SERVICE_PROVIDER', 'GOVERNMENT') DEFAULT 'VENDOR',
    tax_id VARCHAR(50),
    payment_terms_id INT DEFAULT 30,
    currency_code VARCHAR(10) DEFAULT 'USD',
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    hold_flag BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_supplier_number (supplier_number),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_supplier_type (supplier_type),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Supplier Sites table (AP_SUPPLIER_SITES)
CREATE TABLE IF NOT EXISTS ap_supplier_sites (
    site_id BIGINT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    site_type ENUM('PAYMENT', 'PURCHASING', 'BOTH') DEFAULT 'PAYMENT',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    contact_person VARCHAR(255),
    payment_method VARCHAR(50),
    bank_account VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE CASCADE,
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_site_type (site_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- Invoices table (AP_INVOICES)
CREATE TABLE IF NOT EXISTS ap_invoices (
    invoice_id BIGINT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id BIGINT NOT NULL,
    pay_to_site_id BIGINT NOT NULL,
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
    status ENUM('DRAFT', 'PENDING', 'APPROVED', 'PAID', 'CANCELLED', 'VOID') DEFAULT 'DRAFT',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (pay_to_site_id) REFERENCES ap_supplier_sites(site_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_pay_to_site_id (pay_to_site_id),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status),
    INDEX idx_approval_status (approval_status),
    INDEX idx_amount_due (amount_due),
    INDEX idx_created_by (created_by)
);

-- Invoice Lines table (AP_INVOICE_LINES)
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
    po_line_id BIGINT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES ap_invoices(invoice_id) ON DELETE CASCADE,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_line_number (line_number),
    INDEX idx_item_code (item_code),
    INDEX idx_po_line_id (po_line_id),
    UNIQUE KEY uk_invoice_line (invoice_id, line_number)
);

-- Payments table (AP_PAYMENTS)
CREATE TABLE IF NOT EXISTS ap_payments (
    payment_id BIGINT PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id BIGINT NOT NULL,
    payment_date DATE NOT NULL,
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
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_payment_number (payment_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status),
    INDEX idx_amount_unapplied (amount_unapplied),
    INDEX idx_created_by (created_by)
);

-- Payment Applications table (AP_PAYMENT_APPLICATIONS)
CREATE TABLE IF NOT EXISTS ap_payment_applications (
    application_id BIGINT PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    invoice_id BIGINT NOT NULL,
    applied_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    applied_date DATE NOT NULL,
    status ENUM('ACTIVE', 'REVERSED', 'CANCELLED') DEFAULT 'ACTIVE',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES ap_payments(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES ap_invoices(invoice_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_payment_id (payment_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_applied_date (applied_date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- ============================================================================
-- CUSTOMER/SUPPLIER MANAGEMENT SYSTEM (Oracle Apps R12 Structure)
-- ============================================================================

-- Customer/Supplier Master table (HZ_PARTIES)
CREATE TABLE IF NOT EXISTS hz_parties (
    party_id BIGINT PRIMARY KEY,
    party_number VARCHAR(30) UNIQUE NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    party_type ENUM('PERSON', 'ORGANIZATION', 'GROUP') DEFAULT 'ORGANIZATION',
    tax_id VARCHAR(50),
    tax_registration_number VARCHAR(50),
    duns_number VARCHAR(20),
    sic_code VARCHAR(10),
    naics_code VARCHAR(10),
    website VARCHAR(255),
    industry VARCHAR(100),
    annual_revenue DECIMAL(20,2),
    employee_count INT,
    year_established INT,
    legal_status VARCHAR(50),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_party_number (party_number),
    INDEX idx_party_name (party_number),
    INDEX idx_party_type (party_type),
    INDEX idx_tax_id (tax_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Party Contact Information (HZ_PARTY_SITES)
CREATE TABLE IF NOT EXISTS hz_party_sites (
    site_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    site_type ENUM('BILL_TO', 'SHIP_TO', 'PAYMENT', 'PURCHASING', 'BOTH') DEFAULT 'BOTH',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    address_line3 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    country_code VARCHAR(10),
    phone VARCHAR(50),
    fax VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    contact_person VARCHAR(255),
    contact_title VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    INDEX idx_party_id (party_id),
    INDEX idx_site_type (site_type),
    INDEX idx_city (city),
    INDEX idx_state (state),
    INDEX idx_country (country),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- Party Relationships (HZ_RELATIONSHIPS)
CREATE TABLE IF NOT EXISTS hz_relationships (
    relationship_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    related_party_id BIGINT NOT NULL,
    relationship_type ENUM('CUSTOMER', 'SUPPLIER', 'BOTH', 'PARTNER', 'AFFILIATE') NOT NULL,
    relationship_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    status ENUM('ACTIVE', 'INACTIVE', 'PENDING') DEFAULT 'ACTIVE',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (related_party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_party_id (party_id),
    INDEX idx_related_party_id (related_party_id),
    INDEX idx_relationship_type (relationship_type),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Customer Profile (HZ_CUSTOMER_PROFILES)
CREATE TABLE IF NOT EXISTS hz_customer_profiles (
    profile_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    customer_number VARCHAR(30) UNIQUE NOT NULL,
    customer_type ENUM('INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'NON_PROFIT') DEFAULT 'CORPORATE',
    customer_class VARCHAR(50),
    customer_category VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    credit_hold_flag BOOLEAN DEFAULT FALSE,
    payment_terms_id INT DEFAULT 30,
    currency_code VARCHAR(10) DEFAULT 'USD',
    sales_rep_id INT,
    territory_id VARCHAR(50),
    price_list_id VARCHAR(50),
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    tax_exempt_flag BOOLEAN DEFAULT FALSE,
    tax_exemption_number VARCHAR(50),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_customer_number (customer_number),
    INDEX idx_customer_type (customer_type),
    INDEX idx_customer_class (customer_class),
    INDEX idx_credit_limit (credit_limit),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Supplier Profile (HZ_SUPPLIER_PROFILES)
CREATE TABLE IF NOT EXISTS hz_supplier_profiles (
    profile_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    supplier_number VARCHAR(30) UNIQUE NOT NULL,
    supplier_type ENUM('VENDOR', 'CONTRACTOR', 'SERVICE_PROVIDER', 'GOVERNMENT') DEFAULT 'VENDOR',
    supplier_class VARCHAR(50),
    supplier_category VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    hold_flag BOOLEAN DEFAULT FALSE,
    payment_terms_id INT DEFAULT 30,
    currency_code VARCHAR(10) DEFAULT 'USD',
    purchasing_rep_id INT,
    payment_method VARCHAR(50),
    bank_account VARCHAR(100),
    tax_exempt_flag BOOLEAN DEFAULT FALSE,
    tax_exemption_number VARCHAR(50),
    minority_owned_flag BOOLEAN DEFAULT FALSE,
    women_owned_flag BOOLEAN DEFAULT FALSE,
    veteran_owned_flag BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_supplier_number (supplier_number),
    INDEX idx_supplier_type (supplier_type),
    INDEX idx_supplier_class (supplier_class),
    INDEX idx_credit_limit (credit_limit),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Party Contact Points (HZ_CONTACT_POINTS)
CREATE TABLE IF NOT EXISTS hz_contact_points (
    contact_point_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    contact_point_type ENUM('PHONE', 'EMAIL', 'FAX', 'WEB', 'MOBILE') NOT NULL,
    contact_point_value VARCHAR(255) NOT NULL,
    contact_point_purpose VARCHAR(50),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    INDEX idx_party_id (party_id),
    INDEX idx_contact_point_type (contact_point_type),
    INDEX idx_contact_point_purpose (contact_point_purpose),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- Party Classifications (HZ_PARTY_CLASSIFICATIONS)
CREATE TABLE IF NOT EXISTS hz_party_classifications (
    classification_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    classification_type VARCHAR(50) NOT NULL,
    classification_code VARCHAR(50) NOT NULL,
    classification_value VARCHAR(255),
    start_date DATE,
    end_date DATE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_party_id (party_id),
    INDEX idx_classification_type (classification_type),
    INDEX idx_classification_code (classification_code),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Party Notes (HZ_PARTY_NOTES)
CREATE TABLE IF NOT EXISTS hz_party_notes (
    note_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    note_type VARCHAR(50),
    note_text TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES hz_parties(party_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_party_id (party_id),
    INDEX idx_note_type (note_type),
    INDEX idx_is_public (is_public),
    INDEX idx_created_by (created_by)
);

-- Insert default sequences for Customer/Supplier Management
INSERT INTO ar_sequences (sequence_name, current_value) VALUES
('HZ_PARTY_ID_SEQ', 1),
('HZ_PARTY_SITE_ID_SEQ', 1),
('HZ_RELATIONSHIP_ID_SEQ', 1),
('HZ_CUSTOMER_PROFILE_ID_SEQ', 1),
('HZ_SUPPLIER_PROFILE_ID_SEQ', 1),
('HZ_CONTACT_POINT_ID_SEQ', 1),
('HZ_CLASSIFICATION_ID_SEQ', 1),
('HZ_NOTE_ID_SEQ', 1)
ON DUPLICATE KEY UPDATE current_value = current_value;