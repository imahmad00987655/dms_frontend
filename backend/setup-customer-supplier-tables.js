import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const setupCustomerSupplierTables = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fluent_financial_flow'
  });

  try {
    console.log('Setting up Customer/Supplier Management tables...');

    // Insert sequences for Customer/Supplier Management
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

    console.log('✅ Customer/Supplier Management sequences initialized!');

    // Create sample party
    const partyId = 1;
    await connection.execute(`
      INSERT INTO hz_parties (
        party_id, party_number, party_name, party_type, tax_id, website, industry, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE party_name = VALUES(party_name)
    `, [partyId, 'P000001', 'Sample Corporation', 'ORGANIZATION', '123456789', 'https://sample.com', 'Technology', 'ACTIVE', 1]);

    // Create sample party site
    await connection.execute(`
      INSERT INTO hz_party_sites (
        site_id, party_id, site_name, site_type, address_line1, city, state, postal_code, country, phone, email, contact_person, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE site_name = VALUES(site_name)
    `, [1, partyId, 'Main Office', 'BOTH', '123 Business St', 'New York', 'NY', '10001', 'USA', '+1-555-0123', 'info@sample.com', 'John Doe', true]);

    // Create sample customer profile
    await connection.execute(`
      INSERT INTO hz_customer_profiles (
        profile_id, party_id, customer_number, customer_type, customer_class, credit_limit, payment_terms_id, currency_code, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE customer_number = VALUES(customer_number)
    `, [1, partyId, 'C000001', 'CORPORATE', 'Premium', 50000.00, 30, 'USD', 'ACTIVE', 1]);

    // Create sample supplier profile
    await connection.execute(`
      INSERT INTO hz_supplier_profiles (
        profile_id, party_id, supplier_number, supplier_type, supplier_class, credit_limit, payment_terms_id, currency_code, payment_method, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE supplier_number = VALUES(supplier_number)
    `, [1, partyId, 'S000001', 'VENDOR', 'Strategic', 100000.00, 30, 'USD', 'Bank Transfer', 'ACTIVE', 1]);

    // Create sample contact points
    await connection.execute(`
      INSERT INTO hz_contact_points (
        contact_point_id, party_id, contact_point_type, contact_point_value, contact_point_purpose, is_primary
      ) VALUES 
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE contact_point_value = VALUES(contact_point_value)
    `, [
      1, partyId, 'PHONE', '+1-555-0123', 'Main', true,
      2, partyId, 'EMAIL', 'info@sample.com', 'General', false
    ]);

    console.log('✅ Sample data created successfully!');
    console.log('📋 Sample data created:');
    console.log('  - Party: Sample Corporation (P000001)');
    console.log('  - Site: Main Office');
    console.log('  - Customer Profile: C000001');
    console.log('  - Supplier Profile: S000001');
    console.log('  - Contact Points: Phone and Email');

  } catch (error) {
    console.error('❌ Error setting up Customer/Supplier Management tables:', error);
  } finally {
    await connection.end();
  }
};

setupCustomerSupplierTables(); 