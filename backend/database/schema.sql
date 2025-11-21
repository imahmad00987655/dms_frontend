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
    phone VARCHAR(20),
    profile_image MEDIUMTEXT,
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

-- ============================================================================
-- CHART OF ACCOUNTS SYSTEM (Flexible Segmented Structure)
-- ============================================================================

-- Chart of Accounts Segments Structure
CREATE TABLE IF NOT EXISTS coa_segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coa_name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_1_name VARCHAR(100),
    segment_1_value VARCHAR(50) DEFAULT '00000',
    segment_2_name VARCHAR(100),
    segment_2_value VARCHAR(50) DEFAULT '00000',
    segment_3_name VARCHAR(100),
    segment_3_value VARCHAR(50) DEFAULT '00000',
    segment_4_name VARCHAR(100),
    segment_4_value VARCHAR(50) DEFAULT '00000',
    segment_5_name VARCHAR(100),
    segment_5_value VARCHAR(50) DEFAULT '00000',
    segment_length INT DEFAULT 5,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_coa_name (coa_name),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- CoA Instances (Chart of Account Definitions)
CREATE TABLE IF NOT EXISTS coa_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coa_code VARCHAR(50) UNIQUE NOT NULL,
    coa_name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_coa_code (coa_code),
    INDEX idx_coa_name (coa_name),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    segment_id VARCHAR(50) UNIQUE NOT NULL,
    segment_code VARCHAR(50) UNIQUE NOT NULL,
    segment_name VARCHAR(255) NOT NULL,
    segment_type ENUM('ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    segment_use TEXT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_segment_id (segment_id),
    INDEX idx_segment_code (segment_code),
    INDEX idx_segment_name (segment_name),
    INDEX idx_segment_type (segment_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Ledger Configurations
CREATE TABLE IF NOT EXISTS ledger_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ledger_name VARCHAR(255) NOT NULL,
    ledger_type ENUM('PRIMARY', 'SECONDARY', 'SUBSIDIARY') DEFAULT 'PRIMARY',
    currency VARCHAR(10) DEFAULT 'USD',
    coa_instance_id INT NOT NULL,
    accounting_method ENUM('ACCRUAL', 'CASH') DEFAULT 'ACCRUAL',
    ar_ap_enabled BOOLEAN DEFAULT TRUE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coa_instance_id) REFERENCES coa_instances(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_ledger_name (ledger_name),
    INDEX idx_ledger_type (ledger_type),
    INDEX idx_currency (currency),
    INDEX idx_coa_instance_id (coa_instance_id),
    INDEX idx_accounting_method (accounting_method),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Header Assignments (CoA headers assigned to ledgers and modules)
CREATE TABLE IF NOT EXISTS header_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_id VARCHAR(50) UNIQUE NOT NULL,
    header_name VARCHAR(255) NOT NULL,
    coa_instance_id INT NOT NULL,
    validation_rules JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coa_instance_id) REFERENCES coa_instances(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_header_id (header_id),
    INDEX idx_header_name (header_name),
    INDEX idx_coa_instance_id (coa_instance_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Junction table for header-to-ledger assignments (many-to-many)
CREATE TABLE IF NOT EXISTS header_ledger_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_assignment_id INT NOT NULL,
    ledger_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (header_assignment_id) REFERENCES header_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (ledger_id) REFERENCES ledger_configurations(id) ON DELETE CASCADE,
    UNIQUE KEY uk_header_ledger (header_assignment_id, ledger_id),
    INDEX idx_header_assignment_id (header_assignment_id),
    INDEX idx_ledger_id (ledger_id),
    INDEX idx_is_active (is_active)
);

-- Junction table for header-to-module assignments (many-to-many)
CREATE TABLE IF NOT EXISTS header_module_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_assignment_id INT NOT NULL,
    module_type ENUM('AR', 'AP', 'JV', 'PO', 'INVENTORY', 'ASSETS', 'GL') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (header_assignment_id) REFERENCES header_assignments(id) ON DELETE CASCADE,
    UNIQUE KEY uk_header_module (header_assignment_id, module_type),
    INDEX idx_header_assignment_id (header_assignment_id),
    INDEX idx_module_type (module_type),
    INDEX idx_is_active (is_active)
);

-- Account Combinations (Actual account codes based on segments)
CREATE TABLE IF NOT EXISTS account_combinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(255) UNIQUE NOT NULL,
    coa_instance_id INT NOT NULL,
    segment1_value VARCHAR(100),
    segment2_value VARCHAR(100),
    segment3_value VARCHAR(100),
    segment4_value VARCHAR(100),
    segment5_value VARCHAR(100),
    segment6_value VARCHAR(100),
    segment7_value VARCHAR(100),
    segment8_value VARCHAR(100),
    account_description VARCHAR(500),
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    parent_account_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coa_instance_id) REFERENCES coa_instances(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_account_id) REFERENCES account_combinations(id) ON DELETE SET NULL,
    INDEX idx_account_code (account_code),
    INDEX idx_coa_instance_id (coa_instance_id),
    INDEX idx_account_type (account_type),
    INDEX idx_parent_account_id (parent_account_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Original Chart of Accounts table (keeping for backward compatibility)
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
    location VARCHAR(100),
    brand VARCHAR(100),
    supplier_id INT,
    barcode VARCHAR(100),
    item_purchase_rate DECIMAL(15,2) DEFAULT 0.00,
    item_sell_price DECIMAL(15,2) DEFAULT 0.00,
    tax_status VARCHAR(50),
    box_quantity DECIMAL(15,2) DEFAULT 0.00,
    uom_type VARCHAR(50),
    uom_type_detail DECIMAL(15,2) DEFAULT 0.00,
    income_account_segment_id INT NULL,
    cogs_account_segment_id INT NULL,
    inventory_account_segment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE SET NULL,
    INDEX idx_item_code (item_code),
    INDEX idx_category (category),
    INDEX idx_brand (brand),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_barcode (barcode),
    INDEX idx_inventory_income_segment (income_account_segment_id),
    INDEX idx_inventory_cogs_segment (cogs_account_segment_id),
    INDEX idx_inventory_inventory_segment (inventory_account_segment_id)
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
    party_id BIGINT,
    customer_name VARCHAR(255) NOT NULL,
    customer_type ENUM('INDIVIDUAL', 'CORPORATE', 'GOVERNMENT', 'NON_PROFIT') DEFAULT 'CORPORATE',
    customer_class VARCHAR(50),
    customer_category VARCHAR(50),
    tax_id VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    credit_hold_flag BOOLEAN DEFAULT FALSE,
    payment_terms_id INT DEFAULT 30,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE SET NULL,
    INDEX idx_customer_number (customer_number),
    INDEX idx_party_id (party_id),
    INDEX idx_customer_name (customer_name),
    INDEX idx_customer_type (customer_type),
    INDEX idx_customer_class (customer_class),
    INDEX idx_customer_category (customer_category),
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
    party_id BIGINT,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_type ENUM('VENDOR', 'CONTRACTOR', 'SERVICE_PROVIDER', 'GOVERNMENT') DEFAULT 'VENDOR',
    supplier_class VARCHAR(100),
    supplier_category VARCHAR(100),
    tax_id VARCHAR(50),
    payment_terms_id INT DEFAULT 30,
    payment_method VARCHAR(50),
    currency_code VARCHAR(10) DEFAULT 'USD',
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    bank_account VARCHAR(100),
    hold_flag BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE SET NULL,
    INDEX idx_supplier_number (supplier_number),
    INDEX idx_party_id (party_id),
    INDEX idx_supplier_name (supplier_name),
    INDEX idx_supplier_type (supplier_type),
    INDEX idx_supplier_class (supplier_class),
    INDEX idx_supplier_category (supplier_category),
    INDEX idx_tax_id (tax_id),
    INDEX idx_payment_terms_id (payment_terms_id),
    INDEX idx_payment_method (payment_method),
    INDEX idx_currency_code (currency_code),
    INDEX idx_credit_limit (credit_limit),
    INDEX idx_bank_account (bank_account),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Supplier Sites table (AP_SUPPLIER_SITES)
CREATE TABLE IF NOT EXISTS ap_supplier_sites (
    site_id BIGINT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    site_type ENUM('INVOICING', 'PURCHASING', 'BOTH') DEFAULT 'INVOICING',
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
-- PARTY MANAGEMENT SYSTEM (Simplified Structure)
-- ============================================================================

-- Insert party management sequences
INSERT INTO ar_sequences (sequence_name, current_value) VALUES
('PARTY_ID_SEQ', 1),
('PARTY_SITE_ID_SEQ', 1),
('PARTY_CONTACT_POINT_ID_SEQ', 1)
ON DUPLICATE KEY UPDATE current_value = current_value;

-- Parties table (PARTIES) - Simplified structure matching the form
CREATE TABLE IF NOT EXISTS parties (
    party_id BIGINT PRIMARY KEY,
    party_number VARCHAR(30) UNIQUE NOT NULL,
    party_name VARCHAR(255) NOT NULL,
    party_type ENUM('PERSON', 'ORGANIZATION', 'GROUP') DEFAULT 'ORGANIZATION',
    tax_id VARCHAR(50),
    website VARCHAR(255),
    industry VARCHAR(100),
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_party_number (party_number),
    INDEX idx_party_name (party_name),
    INDEX idx_party_type (party_type),
    INDEX idx_tax_id (tax_id),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Party Contact Points table (PARTY_CONTACT_POINTS) - For party-level contact information
CREATE TABLE IF NOT EXISTS party_contact_points (
    contact_point_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    contact_point_type ENUM('PHONE', 'EMAIL', 'FAX', 'WEB', 'MOBILE') NOT NULL,
    contact_point_value VARCHAR(255) NOT NULL,
    contact_point_purpose VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE CASCADE,
    INDEX idx_party_id (party_id),
    INDEX idx_contact_point_type (contact_point_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- Party Sites table (PARTY_SITES) - For address and contact information
CREATE TABLE IF NOT EXISTS party_sites (
    site_id BIGINT PRIMARY KEY,
    party_id BIGINT NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    site_type ENUM('BILL_TO', 'SHIP_TO', 'PAYMENT', 'PURCHASING', 'BOTH') DEFAULT 'BOTH',
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
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE CASCADE,
    INDEX idx_party_id (party_id),
    INDEX idx_site_type (site_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_status (status)
);

-- ============================================================================
-- PROCUREMENT SYSTEM (Oracle E-Business Suite R12 Model)
-- ============================================================================

-- Insert procurement sequences
INSERT INTO ar_sequences (sequence_name, current_value) VALUES
('PO_AGREEMENT_ID_SEQ', 1),
('PO_REQUISITION_ID_SEQ', 1),
('PO_HEADER_ID_SEQ', 1),
('PO_LINE_ID_SEQ', 1),
('PO_DISTRIBUTION_ID_SEQ', 1),
('PO_RECEIPT_ID_SEQ', 1),
('PO_RECEIPT_LINE_ID_SEQ', 1),
('PO_APPROVAL_ID_SEQ', 1)
ON DUPLICATE KEY UPDATE current_value = current_value;

-- Purchase Agreements (PO_AGREEMENTS)
CREATE TABLE IF NOT EXISTS po_agreements (
    agreement_id BIGINT PRIMARY KEY,
    agreement_number VARCHAR(50) UNIQUE NOT NULL,
    agreement_type ENUM('BLANKET', 'CONTRACT', 'MASTER') DEFAULT 'BLANKET',
    supplier_id BIGINT NOT NULL,
    party_id BIGINT NOT NULL,
    supplier_site_id BIGINT NOT NULL,
    buyer_id INT NOT NULL,
    agreement_date DATE NOT NULL,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE NOT NULL,
    currency_code VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_used DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_used) STORED,
    payment_terms_id INT DEFAULT 30,
    status ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'CLOSED') DEFAULT 'DRAFT',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    description TEXT,
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (party_id) REFERENCES parties(party_id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_site_id) REFERENCES ap_supplier_sites(site_id) ON DELETE RESTRICT,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_agreement_number (agreement_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_party_id (party_id),
    INDEX idx_supplier_site_id (supplier_site_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_agreement_date (agreement_date),
    INDEX idx_effective_start_date (effective_start_date),
    INDEX idx_effective_end_date (effective_end_date),
    INDEX idx_status (status),
    INDEX idx_approval_status (approval_status),
    INDEX idx_amount_remaining (amount_remaining),
    INDEX idx_created_by (created_by)
);

-- Agreement Lines (PO_AGREEMENT_LINES)
CREATE TABLE IF NOT EXISTS po_agreement_lines (
    line_id BIGINT PRIMARY KEY,
    agreement_id BIGINT NOT NULL,
    line_number INT NOT NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom VARCHAR(20) DEFAULT 'EACH',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    gst_rate DECIMAL(5,2) DEFAULT 0.00,
    gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_line_amount DECIMAL(15,2) GENERATED ALWAYS AS (line_amount + tax_amount + gst_amount) STORED,
    min_quantity DECIMAL(10,2) NULL,
    max_quantity DECIMAL(10,2) NULL,
    need_by_date DATE,
    suggested_supplier VARCHAR(255),
    suggested_supplier_id BIGINT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (agreement_id) REFERENCES po_agreements(agreement_id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE SET NULL,
    INDEX idx_agreement_id (agreement_id),
    INDEX idx_line_number (line_number),
    INDEX idx_item_code (item_code),
    INDEX idx_category (category),
    INDEX idx_need_by_date (need_by_date),
    INDEX idx_unit_price (unit_price),
    INDEX idx_line_amount (line_amount)
);

-- Purchase Requisitions (PO_REQUISITIONS)
CREATE TABLE IF NOT EXISTS po_requisitions (
    requisition_id BIGINT PRIMARY KEY,
    requisition_number VARCHAR(50) UNIQUE NOT NULL,
    requester_id INT NOT NULL,
    buyer_id INT NULL,
    department_id VARCHAR(50),
    need_by_date DATE NOT NULL,
    urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    currency_code VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'CLOSED') DEFAULT 'DRAFT',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    description TEXT,
    justification TEXT,
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_requisition_number (requisition_number),
    INDEX idx_requester_id (requester_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_need_by_date (need_by_date),
    INDEX idx_urgency (urgency),
    INDEX idx_status (status),
    INDEX idx_approval_status (approval_status),
    INDEX idx_total_amount (total_amount),
    INDEX idx_created_by (created_by)
);

-- Requisition Lines (PO_REQUISITION_LINES)
CREATE TABLE IF NOT EXISTS po_requisition_lines (
    line_id BIGINT PRIMARY KEY,
    requisition_id BIGINT NOT NULL,
    line_number INT NOT NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom VARCHAR(20) DEFAULT 'EACH',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    gst_rate DECIMAL(5,2) DEFAULT 0.00,
    gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_line_amount DECIMAL(15,2) GENERATED ALWAYS AS (line_amount + tax_amount + gst_amount) STORED,
    need_by_date DATE,
    suggested_supplier VARCHAR(255),
    suggested_supplier_id BIGINT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requisition_id) REFERENCES po_requisitions(requisition_id) ON DELETE CASCADE,
    FOREIGN KEY (suggested_supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE SET NULL,
    INDEX idx_requisition_id (requisition_id),
    INDEX idx_line_number (line_number),
    INDEX idx_item_code (item_code),
    INDEX idx_category (category),
    INDEX idx_need_by_date (need_by_date),
    INDEX idx_suggested_supplier_id (suggested_supplier_id),
    UNIQUE KEY uk_requisition_line (requisition_id, line_number)
);

-- Purchase Orders (PO_HEADERS)
CREATE TABLE IF NOT EXISTS po_headers (
    header_id BIGINT PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_type ENUM('STANDARD', 'BLANKET_RELEASE', 'CONTRACT_RELEASE') DEFAULT 'STANDARD',
    supplier_id BIGINT NOT NULL,
    supplier_site_id BIGINT NOT NULL,
    buyer_id INT NOT NULL,
    requisition_id BIGINT NULL,
    agreement_id BIGINT NULL,
    po_date DATE NOT NULL,
    need_by_date DATE NOT NULL,
    currency_code VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_received DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_billed DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    amount_remaining DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_received) STORED,
    payment_terms_id INT DEFAULT 30,
    status ENUM('DRAFT', 'APPROVED', 'RELEASED', 'RECEIVED', 'CLOSED', 'CANCELLED') DEFAULT 'DRAFT',
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    description TEXT,
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES ap_suppliers(supplier_id) ON DELETE RESTRICT,
    FOREIGN KEY (supplier_site_id) REFERENCES ap_supplier_sites(site_id) ON DELETE RESTRICT,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (requisition_id) REFERENCES po_requisitions(requisition_id) ON DELETE SET NULL,
    FOREIGN KEY (agreement_id) REFERENCES po_agreements(agreement_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_po_number (po_number),
    INDEX idx_supplier_id (supplier_id),
    INDEX idx_supplier_site_id (supplier_site_id),
    INDEX idx_buyer_id (buyer_id),
    INDEX idx_requisition_id (requisition_id),
    INDEX idx_agreement_id (agreement_id),
    INDEX idx_po_date (po_date),
    INDEX idx_need_by_date (need_by_date),
    INDEX idx_status (status),
    INDEX idx_approval_status (approval_status),
    INDEX idx_amount_remaining (amount_remaining),
    INDEX idx_created_by (created_by)
);

-- Purchase Order Lines (PO_LINES)
CREATE TABLE IF NOT EXISTS po_lines (
    line_id BIGINT PRIMARY KEY,
    header_id BIGINT NOT NULL,
    line_number INT NOT NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    uom VARCHAR(20) DEFAULT 'EACH',
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    gst_rate DECIMAL(5,2) DEFAULT 0.00,
    gst_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_line_amount DECIMAL(15,2) GENERATED ALWAYS AS (line_amount + tax_amount + gst_amount) STORED,
    quantity_received DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_billed DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_remaining DECIMAL(10,2) GENERATED ALWAYS AS (quantity - quantity_received) STORED,
    need_by_date DATE,
    promised_date DATE,
    status ENUM('DRAFT', 'APPROVED', 'RECEIVED', 'CLOSED', 'CANCELLED') DEFAULT 'DRAFT',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (header_id) REFERENCES po_headers(header_id) ON DELETE CASCADE,
    INDEX idx_header_id (header_id),
    INDEX idx_line_number (line_number),
    INDEX idx_item_code (item_code),
    INDEX idx_category (category),
    INDEX idx_need_by_date (need_by_date),
    INDEX idx_promised_date (promised_date),
    INDEX idx_status (status),
    INDEX idx_quantity_remaining (quantity_remaining),
    UNIQUE KEY uk_po_line (header_id, line_number)
);

-- Purchase Order Distributions (PO_DISTRIBUTIONS)
CREATE TABLE IF NOT EXISTS po_distributions (
    distribution_id BIGINT PRIMARY KEY,
    line_id BIGINT NOT NULL,
    distribution_number INT NOT NULL,
    account_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    project_id VARCHAR(50),
    task_id VARCHAR(50),
    department_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (line_id) REFERENCES po_lines(line_id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    INDEX idx_line_id (line_id),
    INDEX idx_distribution_number (distribution_number),
    INDEX idx_account_id (account_id),
    INDEX idx_project_id (project_id),
    INDEX idx_task_id (task_id),
    INDEX idx_department_id (department_id),
    UNIQUE KEY uk_po_distribution (line_id, distribution_number)
);

-- Goods Receipt Notes (PO_RECEIPTS)
CREATE TABLE IF NOT EXISTS po_receipts (
    receipt_id BIGINT PRIMARY KEY,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    header_id BIGINT NOT NULL,
    receipt_date DATE NOT NULL,
    receipt_type ENUM('STANDARD', 'RETURN', 'CORRECTION') DEFAULT 'STANDARD',
    currency_code VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('DRAFT', 'CONFIRMED', 'CANCELLED') DEFAULT 'DRAFT',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (header_id) REFERENCES po_headers(header_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_receipt_number (receipt_number),
    INDEX idx_header_id (header_id),
    INDEX idx_receipt_date (receipt_date),
    INDEX idx_receipt_type (receipt_type),
    INDEX idx_status (status),
    INDEX idx_total_amount (total_amount),
    INDEX idx_created_by (created_by)
);

-- Goods Receipt Lines (PO_RECEIPT_LINES)
CREATE TABLE IF NOT EXISTS po_receipt_lines (
    receipt_line_id BIGINT PRIMARY KEY,
    receipt_id BIGINT NOT NULL,
    line_id BIGINT NOT NULL,
    line_number INT NOT NULL,
    item_code VARCHAR(50),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    uom VARCHAR(20) DEFAULT 'EACH',
    quantity_ordered DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_received DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_accepted DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity_rejected DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    lot_number VARCHAR(50),
    serial_number VARCHAR(50),
    expiration_date DATE,
    status ENUM('DRAFT', 'ACCEPTED', 'REJECTED', 'CANCELLED') DEFAULT 'DRAFT',
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (receipt_id) REFERENCES po_receipts(receipt_id) ON DELETE CASCADE,
    FOREIGN KEY (line_id) REFERENCES po_lines(line_id) ON DELETE RESTRICT,
    INDEX idx_receipt_id (receipt_id),
    INDEX idx_line_id (line_id),
    INDEX idx_line_number (line_number),
    INDEX idx_item_code (item_code),
    INDEX idx_lot_number (lot_number),
    INDEX idx_serial_number (serial_number),
    INDEX idx_expiration_date (expiration_date),
    INDEX idx_status (status),
    UNIQUE KEY uk_receipt_line (receipt_id, line_number)
);

-- Purchase Order Approvals (PO_APPROVALS)
CREATE TABLE IF NOT EXISTS po_approvals (
    approval_id BIGINT PRIMARY KEY,
    document_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER') NOT NULL,
    document_id BIGINT NOT NULL,
    approver_id INT NOT NULL,
    approval_level INT NOT NULL DEFAULT 1,
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approval_date TIMESTAMP NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_document_type (document_type),
    INDEX idx_document_id (document_id),
    INDEX idx_approver_id (approver_id),
    INDEX idx_approval_level (approval_level),
    INDEX idx_approval_status (approval_status),
    INDEX idx_approval_date (approval_date)
);

-- Procurement Audit Log (PO_AUDIT_LOG)
CREATE TABLE IF NOT EXISTS po_audit_log (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    document_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER', 'RECEIPT') NOT NULL,
    document_id BIGINT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_document_type (document_type),
    INDEX idx_document_id (document_id),
    INDEX idx_created_at (created_at)
);

-- Procurement Settings (PO_SETTINGS)
CREATE TABLE IF NOT EXISTS po_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_name (setting_name),
    INDEX idx_is_active (is_active)
);

-- Insert default procurement settings
INSERT INTO po_settings (setting_name, setting_value, setting_type, description) VALUES
('DEFAULT_CURRENCY', 'USD', 'STRING', 'Default currency for procurement documents'),
('DEFAULT_PAYMENT_TERMS', '30', 'NUMBER', 'Default payment terms in days'),
('REQUIRE_APPROVAL', 'true', 'BOOLEAN', 'Whether approval is required for procurement documents'),
('AUTO_GENERATE_NUMBERS', 'true', 'BOOLEAN', 'Auto-generate document numbers'),
('DEFAULT_APPROVAL_LEVELS', '2', 'NUMBER', 'Default number of approval levels required'),
('ENABLE_BLANKET_AGREEMENTS', 'true', 'BOOLEAN', 'Enable blanket purchase agreements'),
('ENABLE_CONTRACT_RELEASES', 'true', 'BOOLEAN', 'Enable contract purchase order releases'),
('DEFAULT_TAX_RATE', '0.00', 'NUMBER', 'Default tax rate percentage'),
('ENABLE_LOT_TRACKING', 'false', 'BOOLEAN', 'Enable lot number tracking for receipts'),
('ENABLE_SERIAL_TRACKING', 'false', 'BOOLEAN', 'Enable serial number tracking for receipts')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value), description=VALUES(description);

-- ============================================================================
-- COMPANY SETUP SYSTEM
-- ============================================================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    strn VARCHAR(50),
    ntn VARCHAR(50),
    country VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'USD',
    fiscal_year_start DATE,
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_company_code (company_code),
    INDEX idx_name (name),
    INDEX idx_registration_number (registration_number),
    INDEX idx_strn (strn),
    INDEX idx_ntn (ntn),
    INDEX idx_country (country),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);
-- Company Locations table
CREATE TABLE IF NOT EXISTS company_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    location_code VARCHAR(50) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_type ENUM('WAREHOUSE', 'OFFICE', 'RETAIL_STORE', 'DISTRIBUTION_CENTER', 'MANUFACTURING_PLANT', 'OTHER') DEFAULT 'WAREHOUSE',
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_company_location_code (company_id, location_code),
    INDEX idx_company_id (company_id),
    INDEX idx_location_code (location_code),
    INDEX idx_location_name (location_name),
    INDEX idx_location_type (location_type),
    INDEX idx_is_primary (is_primary),
    INDEX idx_is_active (is_active),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Procurement Document Numbers (PO_DOCUMENT_NUMBERS)
CREATE TABLE IF NOT EXISTS po_document_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER', 'RECEIPT') NOT NULL,
    prefix VARCHAR(10) DEFAULT '',
    suffix VARCHAR(10) DEFAULT '',
    next_number BIGINT DEFAULT 1,
    number_format VARCHAR(50) DEFAULT '000000',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_document_type (document_type),
    INDEX idx_is_active (is_active)
);

-- Insert default document number formats
INSERT INTO po_document_numbers (document_type, prefix, next_number, number_format) VALUES
('AGREEMENT', 'PA', 1, '000000'),
('REQUISITION', 'PR', 1, '000000'),
('PURCHASE_ORDER', 'PO', 1, '000000'),
('RECEIPT', 'GRN', 1, '000000')
ON DUPLICATE KEY UPDATE prefix=VALUES(prefix), number_format=VALUES(number_format);

-- Procurement Workflow Rules (PO_WORKFLOW_RULES)
CREATE TABLE IF NOT EXISTS po_workflow_rules (
    rule_id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    document_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER') NOT NULL,
    amount_from DECIMAL(15,2) DEFAULT 0.00,
    amount_to DECIMAL(15,2) DEFAULT 999999999.99,
    approval_levels INT DEFAULT 1,
    approver_roles JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_document_type (document_type),
    INDEX idx_amount_from (amount_from),
    INDEX idx_amount_to (amount_to),
    INDEX idx_is_active (is_active)
);

-- Insert default workflow rules
INSERT INTO po_workflow_rules (rule_name, document_type, amount_from, amount_to, approval_levels, approver_roles) VALUES
('Low Value Requisitions', 'REQUISITION', 0.00, 1000.00, 1, '["manager"]'),
('Medium Value Requisitions', 'REQUISITION', 1000.01, 10000.00, 2, '["manager", "admin"]'),
('High Value Requisitions', 'REQUISITION', 10000.01, 999999999.99, 3, '["manager", "admin", "admin"]'),
('Low Value Purchase Orders', 'PURCHASE_ORDER', 0.00, 5000.00, 1, '["manager"]'),
('Medium Value Purchase Orders', 'PURCHASE_ORDER', 5000.01, 50000.00, 2, '["manager", "admin"]'),
('High Value Purchase Orders', 'PURCHASE_ORDER', 50000.01, 999999999.99, 3, '["manager", "admin", "admin"]'),
('All Agreements', 'AGREEMENT', 0.00, 999999999.99, 2, '["manager", "admin"]')
ON DUPLICATE KEY UPDATE approval_levels=VALUES(approval_levels), approver_roles=VALUES(approver_roles);

-- Procurement Categories (PO_CATEGORIES)
CREATE TABLE IF NOT EXISTS po_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(20) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id INT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES po_categories(category_id) ON DELETE SET NULL,
    INDEX idx_category_code (category_code),
    INDEX idx_parent_category_id (parent_category_id),
    INDEX idx_is_active (is_active)
);

-- Insert default procurement categories
INSERT INTO po_categories (category_code, category_name, description) VALUES
('OFFICE', 'Office Supplies', 'Office supplies and stationery'),
('IT', 'IT Equipment', 'Computers, software, and IT equipment'),
('FURNITURE', 'Furniture', 'Office furniture and fixtures'),
('SERVICES', 'Professional Services', 'Consulting and professional services'),
('TRAVEL', 'Travel & Entertainment', 'Travel expenses and entertainment'),
('MARKETING', 'Marketing & Advertising', 'Marketing materials and advertising'),
('MAINTENANCE', 'Maintenance & Repairs', 'Equipment maintenance and repairs'),
('UTILITIES', 'Utilities', 'Electricity, water, gas, and other utilities'),
('INSURANCE', 'Insurance', 'Business insurance policies'),
('LEGAL', 'Legal Services', 'Legal fees and services')
ON DUPLICATE KEY UPDATE category_name=VALUES(category_name), description=VALUES(description);

-- Procurement Items (PO_ITEMS)
CREATE TABLE IF NOT EXISTS po_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL,
    uom VARCHAR(20) DEFAULT 'EACH',
    standard_price DECIMAL(15,2) DEFAULT 0.00,
    currency_code VARCHAR(10) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES po_categories(category_id) ON DELETE RESTRICT,
    INDEX idx_item_code (item_code),
    INDEX idx_category_id (category_id),
    INDEX idx_is_active (is_active)
);

-- Insert default procurement items
INSERT INTO po_items (item_code, item_name, description, category_id, uom, standard_price) VALUES
('LAPTOP001', 'Dell Latitude Laptop', 'Business laptop with standard configuration', 2, 'EACH', 1200.00),
('DESK001', 'Office Desk', 'Standard office desk 60x30 inches', 3, 'EACH', 350.00),
('CHAIR001', 'Office Chair', 'Ergonomic office chair with armrests', 3, 'EACH', 250.00),
('PAPER001', 'Copy Paper', 'A4 copy paper 80gsm, 500 sheets', 1, 'REAM', 5.00),
('PEN001', 'Ballpoint Pens', 'Blue ballpoint pens, pack of 12', 1, 'PACK', 3.50),
('CONSULT001', 'IT Consulting', 'Professional IT consulting services', 4, 'HOUR', 150.00),
('TRAVEL001', 'Business Travel', 'Business travel expenses', 5, 'TRIP', 0.00),
('ADV001', 'Online Advertising', 'Digital advertising services', 6, 'CAMPAIGN', 1000.00),
('MAINT001', 'Equipment Maintenance', 'Preventive maintenance services', 7, 'SERVICE', 200.00),
('UTIL001', 'Electricity', 'Monthly electricity service', 8, 'MONTH', 500.00)
ON DUPLICATE KEY UPDATE item_name=VALUES(item_name), description=VALUES(description), standard_price=VALUES(standard_price);

-- Procurement Templates (PO_TEMPLATES)
CREATE TABLE IF NOT EXISTS po_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER') NOT NULL,
    description TEXT,
    template_data JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_template_type (template_type),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Procurement Notifications (PO_NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS po_notifications (
    notification_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM('APPROVAL_REQUIRED', 'APPROVAL_COMPLETED', 'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'RECEIPT_DUE') NOT NULL,
    document_type ENUM('AGREEMENT', 'REQUISITION', 'PURCHASE_ORDER', 'RECEIPT') NOT NULL,
    document_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_notification_type (notification_type),
    INDEX idx_document_type (document_type),
    INDEX idx_document_id (document_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Procurement Reports (PO_REPORTS)
CREATE TABLE IF NOT EXISTS po_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    report_name VARCHAR(100) NOT NULL,
    report_type ENUM('AGREEMENT_SUMMARY', 'REQUISITION_SUMMARY', 'PO_SUMMARY', 'RECEIPT_SUMMARY', 'SPEND_ANALYSIS', 'SUPPLIER_ANALYSIS') NOT NULL,
    description TEXT,
    report_parameters JSON,
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY') NULL,
    last_run_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_report_type (report_type),
    INDEX idx_is_scheduled (is_scheduled),
    INDEX idx_created_by (created_by)
);

-- Insert default procurement reports
INSERT INTO po_reports (report_name, report_type, description, created_by) VALUES
('Purchase Agreement Summary', 'AGREEMENT_SUMMARY', 'Summary of all purchase agreements', 1),
('Purchase Requisition Summary', 'REQUISITION_SUMMARY', 'Summary of all purchase requisitions', 1),
('Purchase Order Summary', 'PO_SUMMARY', 'Summary of all purchase orders', 1),
('Goods Receipt Summary', 'RECEIPT_SUMMARY', 'Summary of all goods receipts', 1),
('Spend Analysis Report', 'SPEND_ANALYSIS', 'Analysis of procurement spending by category and supplier', 1),
('Supplier Performance Analysis', 'SUPPLIER_ANALYSIS', 'Analysis of supplier performance and delivery', 1)
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Procurement Dashboard Widgets (PO_DASHBOARD_WIDGETS)
CREATE TABLE IF NOT EXISTS po_dashboard_widgets (
    widget_id INT AUTO_INCREMENT PRIMARY KEY,
    widget_name VARCHAR(100) NOT NULL,
    widget_type ENUM('CHART', 'TABLE', 'METRIC', 'LIST') NOT NULL,
    widget_config JSON NOT NULL,
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 4,
    height INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_widget_type (widget_type),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Insert default dashboard widgets
INSERT INTO po_dashboard_widgets (widget_name, widget_type, widget_config, created_by) VALUES
('Pending Approvals', 'LIST', '{"title": "Pending Approvals", "query": "pending_approvals", "limit": 10}', 1),
('Recent Purchase Orders', 'TABLE', '{"title": "Recent Purchase Orders", "query": "recent_pos", "columns": ["po_number", "supplier_name", "total_amount", "status"]}', 1),
('Spend by Category', 'CHART', '{"title": "Spend by Category", "type": "pie", "query": "spend_by_category"}', 1),
('Monthly Spend Trend', 'CHART', '{"title": "Monthly Spend Trend", "type": "line", "query": "monthly_spend_trend"}', 1),
('Supplier Performance', 'METRIC', '{"title": "Average Delivery Time", "query": "avg_delivery_time", "format": "days"}', 1),
('Open Requisitions', 'METRIC', '{"title": "Open Requisitions", "query": "open_requisitions_count", "format": "number"}', 1)
ON DUPLICATE KEY UPDATE widget_config=VALUES(widget_config);

-- Procurement User Preferences (PO_USER_PREFERENCES)
CREATE TABLE IF NOT EXISTS po_user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_preference (user_id, preference_key),
    INDEX idx_user_id (user_id),
    INDEX idx_preference_key (preference_key)
);

-- Insert default user preferences
INSERT INTO po_user_preferences (user_id, preference_key, preference_value) VALUES
(1, 'default_currency', 'USD'),
(1, 'default_payment_terms', '30'),
(1, 'dashboard_layout', 'default'),
(1, 'notifications_enabled', 'true')
ON DUPLICATE KEY UPDATE preference_value=VALUES(preference_value);

-- ============================================================================
-- TAX CONFIGURATION SYSTEM
-- ============================================================================

-- Tax Regimes table
CREATE TABLE IF NOT EXISTS tax_regimes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    regime_code VARCHAR(20) UNIQUE NOT NULL,
    regime_name VARCHAR(100) NOT NULL,
    regime_type ENUM('TRANSACTION_TAX', 'WITHHOLDING_TAX') NOT NULL,
    tax_authority VARCHAR(255),
    effective_date DATE NOT NULL,
    end_date DATE NULL,
    status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_regime_code (regime_code),
    INDEX idx_regime_name (regime_name),
    INDEX idx_regime_type (regime_type),
    INDEX idx_effective_date (effective_date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Tax Types table
CREATE TABLE IF NOT EXISTS tax_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tax_type_code VARCHAR(20) UNIQUE NOT NULL,
    tax_type_name VARCHAR(100) NOT NULL,
    regime_id INT NOT NULL,
    operating_unit VARCHAR(50),
    ledger VARCHAR(100),
    liability_account VARCHAR(100),
    input_tax_account VARCHAR(100),
    output_tax_account VARCHAR(100),
    rounding_account VARCHAR(100),
    is_withholding_tax BOOLEAN DEFAULT FALSE,
    is_self_assessed BOOLEAN DEFAULT FALSE,
    is_recoverable BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (regime_id) REFERENCES tax_regimes(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tax_type_code (tax_type_code),
    INDEX idx_tax_type_name (tax_type_name),
    INDEX idx_regime_id (regime_id),
    INDEX idx_operating_unit (operating_unit),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Tax Rates table
CREATE TABLE IF NOT EXISTS tax_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rate_code VARCHAR(20) UNIQUE NOT NULL,
    tax_percentage DECIMAL(5,2) NOT NULL,
    tax_type_id INT NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE NULL,
    is_recoverable BOOLEAN DEFAULT FALSE,
    is_inclusive BOOLEAN DEFAULT FALSE,
    is_self_assessable BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tax_type_id) REFERENCES tax_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_rate_code (rate_code),
    INDEX idx_tax_percentage (tax_percentage),
    INDEX idx_tax_type_id (tax_type_id),
    INDEX idx_effective_date (effective_date),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);


-- Tax Configuration Audit Log
CREATE TABLE IF NOT EXISTS tax_audit_log (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    table_name ENUM('TAX_REGIMES', 'TAX_TYPES', 'TAX_STATUSES', 'TAX_RATES') NOT NULL,
    record_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_table_name (table_name),
    INDEX idx_record_id (record_id),
    INDEX idx_created_at (created_at)
);

-- Tax Configuration Settings
CREATE TABLE IF NOT EXISTS tax_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_name VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_name (setting_name),
    INDEX idx_is_active (is_active)
);

-- ============================================================================
-- INSERT DEFAULT CHART OF ACCOUNTS DATA
-- ============================================================================

-- Insert default segments (accounting categories)
INSERT INTO segments (segment_id, segment_code, segment_name, segment_type, segment_use, status, created_by) VALUES
('SEG-ASSETS-001', 'ASSETS', 'Assets', 'ASSETS', 'Use for all asset accounts including current assets, fixed assets, and intangible assets', 'ACTIVE', 1),
('SEG-LIAB-001', 'LIABILITIES', 'Liabilities', 'LIABILITIES', 'Use for all liability accounts including current liabilities, long-term debt, and other obligations', 'ACTIVE', 1),
('SEG-EQUITY-001', 'EQUITY', 'Equity', 'EQUITY', 'Use for equity accounts including capital, retained earnings, and reserves', 'ACTIVE', 1),
('SEG-REV-001', 'REVENUE', 'Revenue', 'REVENUE', 'Use for all revenue and income accounts from primary business operations and other sources', 'ACTIVE', 1),
('SEG-EXP-001', 'EXPENSE', 'Expenses', 'EXPENSE', 'Use for all expense accounts including operating expenses, cost of goods sold, and other costs', 'ACTIVE', 1)
ON DUPLICATE KEY UPDATE 
    segment_name=VALUES(segment_name), 
    segment_use=VALUES(segment_use),
    status=VALUES(status);

-- Example: Insert a sample CoA with 5 segments
-- INSERT INTO coa_segments (coa_name, description, segment_1_name, segment_1_value, segment_2_name, segment_2_value, segment_3_name, segment_3_value, segment_4_name, segment_4_value, segment_5_name, segment_5_value, segment_length, status, created_by) 
-- VALUES ('Sample CoA', 'Sample Chart of Accounts', 'Company', '00001', 'Product', '00002', 'Cost Center', '00003', 'Account', '00004', 'Project', '00005', 5, 'ACTIVE', 1)
-- ON DUPLICATE KEY UPDATE description=VALUES(description);

-- Insert default ledger configuration
INSERT INTO ledger_configurations (ledger_name, ledger_type, currency, coa_instance_id, accounting_method, ar_ap_enabled, status, created_by)
SELECT 'Primary Distribution Ledger', 'PRIMARY', 'USD', ci.id, 'ACCRUAL', TRUE, 'ACTIVE', 1
FROM coa_instances ci WHERE ci.coa_code = 'DIST_COA'
LIMIT 1
ON DUPLICATE KEY UPDATE accounting_method=VALUES(accounting_method), ar_ap_enabled=VALUES(ar_ap_enabled);

-- Insert sample header assignments
INSERT INTO header_assignments (header_id, header_name, coa_instance_id, validation_rules, is_active, created_by)
SELECT 'HDR-001', 'Primary AR Headers', ci.id, '{"enforce_segment_qualifiers": true, "allow_dynamic_inserts": false}', TRUE, 1
FROM coa_instances ci WHERE ci.coa_code = 'DIST_COA'
LIMIT 1
ON DUPLICATE KEY UPDATE header_name=VALUES(header_name);

-- Insert sample header-ledger assignments
INSERT INTO header_ledger_assignments (header_assignment_id, ledger_id, is_active)
SELECT ha.id, lc.id, TRUE
FROM header_assignments ha
CROSS JOIN ledger_configurations lc 
WHERE ha.header_id = 'HDR-001' AND lc.ledger_name = 'Primary Distribution Ledger'
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- Insert sample header-module assignments
INSERT INTO header_module_assignments (header_assignment_id, module_type, is_active)
SELECT ha.id, 'AR', TRUE
FROM header_assignments ha WHERE ha.header_id = 'HDR-001'
UNION ALL
SELECT ha.id, 'AP', TRUE
FROM header_assignments ha WHERE ha.header_id = 'HDR-001'
UNION ALL
SELECT ha.id, 'JV', TRUE
FROM header_assignments ha WHERE ha.header_id = 'HDR-001'
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);
