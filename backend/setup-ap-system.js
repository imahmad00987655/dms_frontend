import pool from './config/database.js';
import APSequenceManager from './utils/apSequenceManager.js';

const setupAPSystem = async () => {
  try {
    console.log('🔧 Setting up Normalized Payables System...');
    
    // Initialize sequences
    console.log('📊 Initializing AP sequences...');
    await APSequenceManager.initializeSequences();
    
    // Check if sequences exist
    const [sequences] = await pool.execute(`
      SELECT sequence_name, current_value 
      FROM ar_sequences 
      WHERE sequence_name LIKE 'AP_%'
      ORDER BY sequence_name
    `);
    
    console.log('✅ AP Sequences initialized:');
    sequences.forEach(seq => {
      console.log(`   - ${seq.sequence_name}: ${seq.current_value}`);
    });
    
    // Check if tables exist
    const [tables] = await pool.execute(`
      SHOW TABLES LIKE 'ap_%'
    `);
    
    console.log('\n📋 AP Tables found:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    // Check if there's existing data
    const [supplierCount] = await pool.execute(`
      SELECT COUNT(*) as count FROM ap_suppliers
    `);
    
    const [invoiceCount] = await pool.execute(`
      SELECT COUNT(*) as count FROM ap_invoices
    `);
    
    const [paymentCount] = await pool.execute(`
      SELECT COUNT(*) as count FROM ap_payments
    `);
    
    console.log('\n📊 Current AP Data:');
    console.log(`   - Suppliers: ${supplierCount[0].count}`);
    console.log(`   - Invoices: ${invoiceCount[0].count}`);
    console.log(`   - Payments: ${paymentCount[0].count}`);
    
    // Create sample data if no data exists
    if (supplierCount[0].count === 0) {
      console.log('\n📝 Creating sample AP data...');
      
      // Create sample supplier
      const supplierId = await APSequenceManager.getNextSupplierId();
      const supplierNumber = APSequenceManager.generateSupplierNumber(supplierId);
      
      await pool.execute(`
        INSERT INTO ap_suppliers (
          supplier_id, supplier_number, supplier_name, supplier_type,
          tax_id, payment_terms_id, currency_code, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        supplierId, supplierNumber, 'Sample Vendor Corp', 'VENDOR',
        'TAX123456', 30, 'USD', 'ACTIVE', 1
      ]);
      
      // Create sample supplier site
      const siteId = await APSequenceManager.getNextSupplierSiteId();
      await pool.execute(`
        INSERT INTO ap_supplier_sites (
          site_id, supplier_id, site_name, site_type, address_line1,
          city, state, postal_code, country, is_primary, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        siteId, supplierId, 'Main Office', 'PAYMENT',
        '123 Business St', 'New York', 'NY', '10001', 'USA', true, 'ACTIVE'
      ]);
      
      // Create sample invoice
      const invoiceId = await APSequenceManager.getNextInvoiceId();
      const invoiceNumber = APSequenceManager.generateInvoiceNumber(invoiceId);
      
      await pool.execute(`
        INSERT INTO ap_invoices (
          invoice_id, invoice_number, supplier_id, pay_to_site_id,
          invoice_date, due_date, payment_terms_id, currency_code,
          subtotal, tax_amount, total_amount, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId, invoiceNumber, supplierId, siteId,
        '2024-01-15', '2024-02-14', 30, 'USD',
        1000.00, 100.00, 1100.00, 'PENDING', 1
      ]);
      
      // Create sample invoice line
      const lineId = await APSequenceManager.getNextInvoiceLineId();
      await pool.execute(`
        INSERT INTO ap_invoice_lines (
          line_id, invoice_id, line_number, item_name, description,
          quantity, unit_price, line_amount, tax_rate, tax_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        lineId, invoiceId, 1, 'Sample Product', 'Sample product description',
        1, 1000.00, 1000.00, 10.00, 100.00
      ]);
      
      console.log('✅ Sample AP data created successfully');
    }
    
    console.log('\n🎉 Normalized Payables System setup completed!');
    console.log('\n📋 Available API Endpoints:');
    console.log('   - GET    /api/ap/suppliers');
    console.log('   - POST   /api/ap/suppliers');
    console.log('   - GET    /api/ap/suppliers/:id');
    console.log('   - PUT    /api/ap/suppliers/:id');
    console.log('   - DELETE /api/ap/suppliers/:id');
    console.log('   - GET    /api/ap/invoices');
    console.log('   - POST   /api/ap/invoices');
    console.log('   - GET    /api/ap/invoices/:id');
    console.log('   - PUT    /api/ap/invoices/:id');
    console.log('   - PATCH  /api/ap/invoices/:id/status');
    console.log('   - GET    /api/ap/payments');
    console.log('   - POST   /api/ap/payments');
    console.log('   - GET    /api/ap/payments/:id');
    console.log('   - PUT    /api/ap/payments/:id');
    console.log('   - PATCH  /api/ap/payments/:id/status');
    
  } catch (error) {
    console.error('❌ Error setting up AP system:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupAPSystem()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export default setupAPSystem; 