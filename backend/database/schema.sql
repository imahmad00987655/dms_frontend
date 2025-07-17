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


-- Create Invoice table
CREATE TABLE IF NOT EXISTS create_invoice (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    customer_name TEXT,
    invoice_date DATE NOT NULL,
    due_date DATE,
    payment_terms INTEGER DEFAULT 30,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    subtotal REAL NOT NULL,
    tax_amount REAL NOT NULL,
    total REAL NOT NULL,
    line_items TEXT NOT NULL, -- JSON string of line items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(50),
    amount_received DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    deposit_account VARCHAR(100),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Processed',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_receipt_number (receipt_number),
    INDEX idx_customer_name (customer_name),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_status (status)
);

-- Vendor Invoices table
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
    line_items JSON NOT NULL, -- JSON array of line items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_vendor_name (vendor_name),
    INDEX idx_invoice_date (invoice_date),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
);

-- Payments table (for Payables)
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
);

 