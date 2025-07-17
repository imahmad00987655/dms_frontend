import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔧 Setting up database...');
    
    // Connect to MySQL without specifying database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL server');
    
    // Create database
    await connection.query('CREATE DATABASE IF NOT EXISTS fluent_financial_flow');
    console.log('✅ Database created');
    
    // Use the database
    await connection.query('USE fluent_financial_flow');
    console.log('✅ Using database fluent_financial_flow');
    
    // Create users table
    await connection.query(`
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
      )
    `);
    console.log('✅ Users table created');
    
    // Create OTP table
    await connection.query(`
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
      )
    `);
    console.log('✅ OTP table created');
    
    // Create user_sessions table
    await connection.query(`
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
      )
    `);
    console.log('✅ User sessions table created');
    
    // Create password_reset_tokens table
    await connection.query(`
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
      )
    `);
    console.log('✅ Password reset tokens table created');
    
    // Create audit_logs table
    await connection.query(`
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
      )
    `);
    console.log('✅ Audit logs table created');
    
    // Create chart of accounts table
    await connection.query(`
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
      )
    `);
    console.log('✅ Chart of accounts table created');
    
    // Create journal entries table
    await connection.query(`
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
      )
    `);
    console.log('✅ Journal entries table created');
    
    // Create journal entry line items table
    await connection.query(`
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
      )
    `);
    console.log('✅ Journal entry line items table created');
    
    // Insert default chart of accounts
    await connection.query(`
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
      ON DUPLICATE KEY UPDATE account_name=VALUES(account_name), account_type=VALUES(account_type)
    `);
    console.log('✅ Default chart of accounts created');
    
    // Insert default admin user
    await connection.query(`
      INSERT INTO users (first_name, last_name, email, password_hash, company, role, is_verified) 
      VALUES ('Admin', 'User', 'admin@accuflow.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'AccuFlow', 'admin', TRUE)
      ON DUPLICATE KEY UPDATE id=id
    `);
    console.log('✅ Default admin user created');
    
    // Test a simple query
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Found ${users[0].count} users in database`);
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase(); 