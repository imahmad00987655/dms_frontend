import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const createCustomerSupplierTables = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fluent_financial_flow'
  });

  try {
    console.log('Creating Customer/Supplier Management tables...');

    // Create Customer/Supplier Master table (HZ_PARTIES)
    await connection.execute(`
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
        INDEX idx_party_number (party_number),
        INDEX idx_party_name (party_name),
        INDEX idx_party_type (party_type),
        INDEX idx_tax_id (tax_id),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);

    // Create Party Contact Information (HZ_PARTY_SITES)
    await connection.execute(`
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
        INDEX idx_party_id (party_id),
        INDEX idx_site_type (site_type),
        INDEX idx_city (city),
        INDEX idx_state (state),
        INDEX idx_country (country),
        INDEX idx_is_primary (is_primary),
        INDEX idx_status (status)
      )
    `);

    // Create Party Relationships (HZ_RELATIONSHIPS)
    await connection.execute(`
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
        INDEX idx_party_id (party_id),
        INDEX idx_related_party_id (related_party_id),
        INDEX idx_relationship_type (relationship_type),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);

    // Create Customer Profile (HZ_CUSTOMER_PROFILES)
    await connection.execute(`
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
        INDEX idx_customer_number (customer_number),
        INDEX idx_customer_type (customer_type),
        INDEX idx_customer_class (customer_class),
        INDEX idx_credit_limit (credit_limit),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);

    // Create Supplier Profile (HZ_SUPPLIER_PROFILES)
    await connection.execute(`
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
        INDEX idx_supplier_number (supplier_number),
        INDEX idx_supplier_type (supplier_type),
        INDEX idx_supplier_class (supplier_class),
        INDEX idx_credit_limit (credit_limit),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);

    // Create Party Contact Points (HZ_CONTACT_POINTS)
    await connection.execute(`
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
        INDEX idx_party_id (party_id),
        INDEX idx_contact_point_type (contact_point_type),
        INDEX idx_contact_point_purpose (contact_point_purpose),
        INDEX idx_is_primary (is_primary),
        INDEX idx_status (status)
      )
    `);

    // Create Party Classifications (HZ_PARTY_CLASSIFICATIONS)
    await connection.execute(`
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
        INDEX idx_party_id (party_id),
        INDEX idx_classification_type (classification_type),
        INDEX idx_classification_code (classification_code),
        INDEX idx_status (status),
        INDEX idx_created_by (created_by)
      )
    `);

    // Create Party Notes (HZ_PARTY_NOTES)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS hz_party_notes (
        note_id BIGINT PRIMARY KEY,
        party_id BIGINT NOT NULL,
        note_type VARCHAR(50),
        note_text TEXT NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_party_id (party_id),
        INDEX idx_note_type (note_type),
        INDEX idx_is_public (is_public),
        INDEX idx_created_by (created_by)
      )
    `);

    console.log('✅ Customer/Supplier Management tables created successfully!');

    // Insert sequences
    await connection.execute(`
      INSERT INTO ar_sequences (sequence_name, current_value) VALUES
      ('HZ_PARTY_ID_SEQ', 1),
      ('HZ_PARTY_SITE_ID_SEQ', 1),
      ('HZ_RELATIONSHIP_ID_SEQ', 1),
      ('HZ_CUSTOMER_PROFILE_ID_SEQ', 1),
      ('HZ_SUPPLIER_PROFILE_ID_SEQ', 1),
      ('HZ_CONTACT_POINT_ID_SEQ', 1),
      ('HZ_CLASSIFICATION_ID_SEQ', 1),
      ('HZ_NOTE_ID_SEQ', 1)
      ON DUPLICATE KEY UPDATE current_value = current_value
    `);

    console.log('✅ Sequences initialized!');

  } catch (error) {
    console.error('❌ Error creating Customer/Supplier Management tables:', error);
  } finally {
    await connection.end();
  }
};

createCustomerSupplierTables(); 