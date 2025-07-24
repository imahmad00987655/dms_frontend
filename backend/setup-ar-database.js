import { executeQuery } from './config/database.js';
import fs from 'fs';
import path from 'path';

const setupARDatabase = async () => {
  try {
    console.log('🗑️  Removing old receivables tables...');
    
    // Drop old receivables tables if they exist
    const dropQueries = [
      'DROP TABLE IF EXISTS create_invoice',
      'DROP TABLE IF EXISTS receipts'
    ];
    
    for (const query of dropQueries) {
      await executeQuery(query);
      console.log(`✅ Dropped table: ${query}`);
    }
    
    console.log('✅ Old receivables tables removed successfully');
    
    // Read and execute the schema.sql file to create all new tables
    console.log('📋 Creating new AR tables from schema...');
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schemaContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await executeQuery(statement);
        } catch (error) {
          // Ignore errors for statements that might already exist
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate entry')) {
            console.log(`⚠️  Warning: ${error.message}`);
          }
        }
      }
    }
    
    console.log('✅ New AR tables created successfully');
    
    // Now run the migration procedures to set up the new normalized system
    console.log('🔄 Setting up new normalized AR system...');
    
    // Create sequences if they don't exist
    await executeQuery(`
      INSERT IGNORE INTO ar_sequences (sequence_name, current_value) VALUES
      ('AR_CUSTOMER_ID_SEQ', 1),
      ('AR_CUSTOMER_SITE_ID_SEQ', 1),
      ('AR_INVOICE_ID_SEQ', 1),
      ('AR_INVOICE_LINE_ID_SEQ', 1),
      ('AR_RECEIPT_ID_SEQ', 1),
      ('AR_RECEIPT_APPLICATION_ID_SEQ', 1)
    `);
    
    console.log('✅ AR sequences initialized');
    
    // Create some sample data for testing
    console.log('📝 Creating sample data for testing...');
    
    // Create a sample customer
    const customerId = await executeQuery(`
      SELECT get_next_sequence_value('AR_CUSTOMER_ID_SEQ') as next_id
    `);
    const customerIdValue = customerId[0].next_id;
    
    await executeQuery(`
      INSERT INTO ar_customers (customer_id, customer_number, customer_name, customer_type, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [customerIdValue, `CUST${customerIdValue.toString().padStart(6, '0')}`, 'Sample Customer', 'CORPORATE', 1]);
    
    // Create a sample customer site
    const siteId = await executeQuery(`
      SELECT get_next_sequence_value('AR_CUSTOMER_SITE_ID_SEQ') as next_id
    `);
    const siteIdValue = siteId[0].next_id;
    
    await executeQuery(`
      INSERT INTO ar_customer_sites (site_id, customer_id, site_name, site_type, is_primary, address_line1, city, state, postal_code, country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [siteIdValue, customerIdValue, 'Sample Customer - Main Office', 'BILL_TO', true, '123 Main St', 'Sample City', 'CA', '12345', 'USA']);
    
    console.log('✅ Sample customer and site created');
    
    console.log('🎉 AR database setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Update backend routes to use new AR tables');
    console.log('2. Update frontend components to use new data structure');
    console.log('3. Test all receivables functionality');
    
  } catch (error) {
    console.error('❌ Error setting up AR database:', error);
    throw error;
  }
};

// Run the setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupARDatabase()
    .then(() => {
      console.log('✅ Setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupARDatabase; 