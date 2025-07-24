import express from 'express';
import mysql from 'mysql2/promise';
import { dbConfig } from '../config/database.js';

const router = express.Router();

// Helper function to get next sequence value
const getNextSequenceValue = async (connection, sequenceName) => {
  const [seqResult] = await connection.execute(
    'SELECT current_value FROM ar_sequences WHERE sequence_name = ?',
    [sequenceName]
  );
  
  if (seqResult.length === 0) {
    throw new Error(`Sequence ${sequenceName} not found`);
  }
  
  const currentValue = seqResult[0].current_value;
  
  // Update sequence for next use
  await connection.execute(
    'UPDATE ar_sequences SET current_value = current_value + 1 WHERE sequence_name = ?',
    [sequenceName]
  );
  
  return currentValue;
};

// ============================================================================
// PARTY MANAGEMENT
// ============================================================================

// Get all parties
router.get('/parties', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        p.party_id,
        p.party_number,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry,
        p.status,
        p.created_at,
        COALESCE(site_counts.site_count, 0) as site_count,
        COALESCE(customer_counts.customer_profile_count, 0) as customer_profile_count,
        COALESCE(supplier_counts.supplier_profile_count, 0) as supplier_profile_count
      FROM hz_parties p
      LEFT JOIN (
        SELECT party_id, COUNT(*) as site_count
        FROM hz_party_sites
        WHERE status = 'ACTIVE'
        GROUP BY party_id
      ) site_counts ON p.party_id = site_counts.party_id
      LEFT JOIN (
        SELECT party_id, COUNT(*) as customer_profile_count
        FROM hz_customer_profiles
        WHERE status = 'ACTIVE'
        GROUP BY party_id
      ) customer_counts ON p.party_id = customer_counts.party_id
      LEFT JOIN (
        SELECT party_id, COUNT(*) as supplier_profile_count
        FROM hz_supplier_profiles
        WHERE status = 'ACTIVE'
        GROUP BY party_id
      ) supplier_counts ON p.party_id = supplier_counts.party_id
      ORDER BY p.party_name
    `);
    
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ error: 'Failed to fetch parties' });
  }
});

// Get party by ID
router.get('/parties/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM hz_parties WHERE party_id = ?',
      [req.params.id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({ error: 'Failed to fetch party' });
  }
});

// Create new party
router.post('/parties', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next party ID from sequence using MySQL approach
    const partyId = await getNextSequenceValue(connection, 'HZ_PARTY_ID_SEQ');
    
    // Generate party number
    const partyNumber = `P${partyId.toString().padStart(6, '0')}`;
    
    const { party_name, party_type, tax_id, website, industry, status } = req.body;
    
    await connection.execute(`
      INSERT INTO hz_parties (
        party_id, party_number, party_name, party_type, 
        tax_id, website, industry, status, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [partyId, partyNumber, party_name, party_type, tax_id, website, industry, status, 1]);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Party created successfully',
      party_id: partyId,
      party_number: partyNumber
    });
  } catch (error) {
    console.error('Error creating party:', error);
    res.status(500).json({ error: 'Failed to create party' });
  }
});

// Update party
router.put('/parties/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { party_name, party_type, tax_id, website, industry, status } = req.body;
    
    await connection.execute(`
      UPDATE hz_parties 
      SET party_name = ?, party_type = ?, tax_id = ?, 
          website = ?, industry = ?, status = ?
      WHERE party_id = ?
    `, [party_name, party_type, tax_id, website, industry, status, req.params.id]);
    
    await connection.end();
    res.json({ message: 'Party updated successfully' });
  } catch (error) {
    console.error('Error updating party:', error);
    res.status(500).json({ error: 'Failed to update party' });
  }
});

// Delete party
router.delete('/parties/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check if party has any profiles for warning purposes
    const [profiles] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM hz_customer_profiles WHERE party_id = ?) as customer_count,
        (SELECT COUNT(*) FROM hz_supplier_profiles WHERE party_id = ?) as supplier_count
    `, [req.params.id, req.params.id]);
    
    // Delete associated profiles first (cascade delete)
    if (profiles[0].customer_count > 0) {
      await connection.execute('DELETE FROM hz_customer_profiles WHERE party_id = ?', [req.params.id]);
    }
    
    if (profiles[0].supplier_count > 0) {
      await connection.execute('DELETE FROM hz_supplier_profiles WHERE party_id = ?', [req.params.id]);
    }
    
    // Delete party sites
    await connection.execute('DELETE FROM hz_party_sites WHERE party_id = ?', [req.params.id]);
    
    // Delete contact points
    await connection.execute('DELETE FROM hz_contact_points WHERE party_id = ?', [req.params.id]);
    
    // Finally delete the party
    await connection.execute('DELETE FROM hz_parties WHERE party_id = ?', [req.params.id]);
    
    await connection.end();
    
    const message = profiles[0].customer_count > 0 || profiles[0].supplier_count > 0
      ? `Party and all associated profiles (${profiles[0].customer_count} customer, ${profiles[0].supplier_count} supplier) deleted successfully`
      : 'Party deleted successfully';
    
    res.json({ message });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({ error: 'Failed to delete party' });
  }
});

// ============================================================================
// PARTY SITES MANAGEMENT
// ============================================================================

// Get party sites
router.get('/parties/:partyId/sites', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM hz_party_sites WHERE party_id = ? ORDER BY is_primary DESC, site_name',
      [req.params.partyId]
    );
    
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching party sites:', error);
    res.status(500).json({ error: 'Failed to fetch party sites' });
  }
});

// Create party site
router.post('/parties/:partyId/sites', async (req, res) => {
  try {
    console.log('🔍 Creating party site for party ID:', req.params.partyId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next site ID from sequence
    const siteId = await getNextSequenceValue(connection, 'HZ_PARTY_SITE_ID_SEQ');
    console.log('🆔 Generated site ID:', siteId);
    
    const {
      site_name, site_type, address_line1, address_line2, city, state, postal_code,
      country, is_primary, status
    } = req.body;
    
    console.log('📋 Extracted data:', {
      site_name, site_type, address_line1, address_line2, city, state, postal_code,
      country, is_primary, status
    });
    
    // If this is primary, unset other primary sites
    if (is_primary) {
      console.log('🔄 Unsetting other primary sites...');
      await connection.execute(
        'UPDATE hz_party_sites SET is_primary = FALSE WHERE party_id = ?',
        [req.params.partyId]
      );
    }
    
    console.log('💾 Executing INSERT...');
    await connection.execute(`
      INSERT INTO hz_party_sites (
        site_id, party_id, site_name, site_type, address_line1,
        address_line2, city, state, postal_code, country, 
        is_primary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [siteId, req.params.partyId, site_name, site_type, address_line1,
        address_line2, city, state, postal_code, country,
        is_primary, status]);
    
    console.log('✅ Site created successfully!');
    await connection.end();
    res.status(201).json({ 
      message: 'Party site created successfully',
      site_id: siteId
    });
  } catch (error) {
    console.error('❌ Error creating party site:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create party site' });
  }
});

// Update party site
router.put('/sites/:siteId', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const {
      site_name, site_type, address_line1, address_line2, city, state, postal_code,
      country, is_primary, status
    } = req.body;
    
    // If this is primary, unset other primary sites for the same party
    if (is_primary) {
      const [siteResult] = await connection.execute(
        'SELECT party_id FROM hz_party_sites WHERE site_id = ?',
        [req.params.siteId]
      );
      if (siteResult.length > 0) {
        await connection.execute(
          'UPDATE hz_party_sites SET is_primary = FALSE WHERE party_id = ? AND site_id != ?',
          [siteResult[0].party_id, req.params.siteId]
        );
      }
    }
    
    await connection.execute(`
      UPDATE hz_party_sites 
      SET site_name = ?, site_type = ?, address_line1 = ?, address_line2 = ?, city = ?,
          state = ?, postal_code = ?, country = ?, is_primary = ?, status = ?
      WHERE site_id = ?
    `, [site_name, site_type, address_line1, address_line2, city, state, postal_code,
        country, is_primary, status, req.params.siteId]);
    
    await connection.end();
    res.json({ message: 'Party site updated successfully' });
  } catch (error) {
    console.error('Error updating party site:', error);
    res.status(500).json({ error: 'Failed to update party site' });
  }
});

// Delete party site
router.delete('/sites/:siteId', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('DELETE FROM hz_party_sites WHERE site_id = ?', [req.params.siteId]);
    await connection.end();
    res.json({ message: 'Party site deleted successfully' });
  } catch (error) {
    console.error('Error deleting party site:', error);
    res.status(500).json({ error: 'Failed to delete party site' });
  }
});

// ============================================================================
// CUSTOMER PROFILES MANAGEMENT
// ============================================================================

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        cp.profile_id,
        cp.party_id,
        cp.customer_number,
        cp.customer_type,
        cp.customer_class,
        cp.customer_category,
        cp.credit_limit,
        cp.credit_hold_flag,
        cp.payment_terms_id,
        cp.currency_code,
        cp.discount_percent,
        cp.tax_exempt_flag,
        cp.tax_exemption_number,
        cp.status,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry
      FROM hz_customer_profiles cp
      JOIN hz_parties p ON cp.party_id = p.party_id
      ORDER BY p.party_name
    `);
    
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/customers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT 
        cp.*,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry
      FROM hz_customer_profiles cp
      JOIN hz_parties p ON cp.party_id = p.party_id
      WHERE cp.profile_id = ?
    `, [req.params.id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer profile
router.post('/customers', async (req, res) => {
  try {
    console.log('🔍 Creating customer profile...');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next customer profile ID from sequence
    const profileId = await getNextSequenceValue(connection, 'HZ_CUSTOMER_PROFILE_ID_SEQ');
    console.log('🆔 Generated profile ID:', profileId);
    
    // Generate customer number
    const customerNumber = `C${profileId.toString().padStart(6, '0')}`;
    console.log('📋 Generated customer number:', customerNumber);
    
    const {
      party_id, customer_type, customer_class, customer_category,
      credit_limit, credit_hold_flag, payment_terms_id, currency_code,
      discount_percent, tax_exempt_flag, tax_exemption_number, status
    } = req.body;
    
    console.log('📋 Extracted data:', {
      party_id, customer_type, customer_class, customer_category,
      credit_limit, credit_hold_flag, payment_terms_id, currency_code,
      discount_percent, tax_exempt_flag, tax_exemption_number, status
    });
    
    console.log('💾 Executing INSERT...');
    await connection.execute(`
      INSERT INTO hz_customer_profiles (
        profile_id, party_id, customer_number, customer_type,
        customer_class, customer_category, credit_limit, credit_hold_flag,
        payment_terms_id, currency_code, discount_percent, tax_exempt_flag,
        tax_exemption_number, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [profileId, party_id, customerNumber, customer_type, customer_class,
        customer_category, credit_limit, credit_hold_flag, payment_terms_id,
        currency_code, discount_percent, tax_exempt_flag, tax_exemption_number, status, 1]);
    
    console.log('✅ Customer profile created successfully!');
    await connection.end();
    res.status(201).json({ 
      message: 'Customer profile created successfully',
      profile_id: profileId,
      customer_number: customerNumber
    });
  } catch (error) {
    console.error('❌ Error creating customer profile:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create customer profile' });
  }
});

// Update customer profile
router.put('/customers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const {
      customer_type, customer_class, customer_category, credit_limit,
      credit_hold_flag, payment_terms_id, currency_code, discount_percent,
      tax_exempt_flag, tax_exemption_number, status
    } = req.body;
    
    await connection.execute(`
      UPDATE hz_customer_profiles 
      SET customer_type = ?, customer_class = ?, customer_category = ?,
          credit_limit = ?, credit_hold_flag = ?, payment_terms_id = ?,
          currency_code = ?, discount_percent = ?, tax_exempt_flag = ?,
          tax_exemption_number = ?, status = ?
      WHERE profile_id = ?
    `, [customer_type, customer_class, customer_category, credit_limit,
        credit_hold_flag, payment_terms_id, currency_code, discount_percent,
        tax_exempt_flag, tax_exemption_number, status, req.params.id]);
    
    await connection.end();
    res.json({ message: 'Customer profile updated successfully' });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
});

// Delete customer profile
router.delete('/customers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get party_id before deleting
    const [customerResult] = await connection.execute(
      'SELECT party_id FROM hz_customer_profiles WHERE profile_id = ?',
      [req.params.id]
    );
    
    if (customerResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Customer profile not found' });
    }
    
    const partyId = customerResult[0].party_id;
    
    // Delete the customer profile
    await connection.execute('DELETE FROM hz_customer_profiles WHERE profile_id = ?', [req.params.id]);
    
    await connection.end();
    res.json({ message: 'Customer profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer profile:', error);
    res.status(500).json({ error: 'Failed to delete customer profile' });
  }
});

// ============================================================================
// SUPPLIER PROFILES MANAGEMENT
// ============================================================================

// Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(`
      SELECT 
        sp.profile_id,
        sp.party_id,
        sp.supplier_number,
        sp.supplier_type,
        sp.supplier_class,
        sp.supplier_category,
        sp.credit_limit,
        sp.hold_flag,
        sp.payment_terms_id,
        sp.currency_code,
        sp.payment_method,
        sp.bank_account,
        sp.tax_exempt_flag,
        sp.tax_exemption_number,
        sp.minority_owned_flag,
        sp.women_owned_flag,
        sp.veteran_owned_flag,
        sp.status,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry
      FROM hz_supplier_profiles sp
      JOIN hz_parties p ON sp.party_id = p.party_id
      ORDER BY p.party_name
    `);
    
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get supplier by ID
router.get('/suppliers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT 
        sp.*,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry
      FROM hz_supplier_profiles sp
      JOIN hz_parties p ON sp.party_id = p.party_id
      WHERE sp.profile_id = ?
    `, [req.params.id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// Create supplier profile
router.post('/suppliers', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next supplier profile ID from sequence
    const profileId = await getNextSequenceValue(connection, 'HZ_SUPPLIER_PROFILE_ID_SEQ');
    
    // Generate supplier number
    const supplierNumber = `S${profileId.toString().padStart(6, '0')}`;
    
    const {
      party_id, supplier_type, supplier_class, supplier_category,
      credit_limit, hold_flag, payment_terms_id, currency_code,
      payment_method, bank_account, tax_exempt_flag, tax_exemption_number,
      minority_owned_flag, women_owned_flag, veteran_owned_flag, status
    } = req.body;
    
    await connection.execute(`
      INSERT INTO hz_supplier_profiles (
        profile_id, party_id, supplier_number, supplier_type,
        supplier_class, supplier_category, credit_limit, hold_flag,
        payment_terms_id, currency_code, payment_method, bank_account,
        tax_exempt_flag, tax_exemption_number, minority_owned_flag,
        women_owned_flag, veteran_owned_flag, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [profileId, party_id, supplierNumber, supplier_type, supplier_class,
        supplier_category, credit_limit, hold_flag, payment_terms_id,
        currency_code, payment_method, bank_account, tax_exempt_flag,
        tax_exemption_number, minority_owned_flag, women_owned_flag,
        veteran_owned_flag, status, 1]);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Supplier profile created successfully',
      profile_id: profileId,
      supplier_number: supplierNumber
    });
  } catch (error) {
    console.error('Error creating supplier profile:', error);
    res.status(500).json({ error: 'Failed to create supplier profile' });
  }
});

// Update supplier profile
router.put('/suppliers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const {
      supplier_type, supplier_class, supplier_category, credit_limit,
      hold_flag, payment_terms_id, currency_code, payment_method,
      bank_account, tax_exempt_flag, tax_exemption_number,
      minority_owned_flag, women_owned_flag, veteran_owned_flag, status
    } = req.body;
    
    await connection.execute(`
      UPDATE hz_supplier_profiles 
      SET supplier_type = ?, supplier_class = ?, supplier_category = ?,
          credit_limit = ?, hold_flag = ?, payment_terms_id = ?,
          currency_code = ?, payment_method = ?, bank_account = ?,
          tax_exempt_flag = ?, tax_exemption_number = ?, minority_owned_flag = ?,
          women_owned_flag = ?, veteran_owned_flag = ?, status = ?
      WHERE profile_id = ?
    `, [supplier_type, supplier_class, supplier_category, credit_limit,
        hold_flag, payment_terms_id, currency_code, payment_method,
        bank_account, tax_exempt_flag, tax_exemption_number,
        minority_owned_flag, women_owned_flag, veteran_owned_flag,
        status, req.params.id]);
    
    await connection.end();
    res.json({ message: 'Supplier profile updated successfully' });
  } catch (error) {
    console.error('Error updating supplier profile:', error);
    res.status(500).json({ error: 'Failed to update supplier profile' });
  }
});

// Delete supplier profile
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get party_id before deleting
    const [supplierResult] = await connection.execute(
      'SELECT party_id FROM hz_supplier_profiles WHERE profile_id = ?',
      [req.params.id]
    );
    
    if (supplierResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Supplier profile not found' });
    }
    
    const partyId = supplierResult[0].party_id;
    
    // Delete the supplier profile
    await connection.execute('DELETE FROM hz_supplier_profiles WHERE profile_id = ?', [req.params.id]);
    
    await connection.end();
    res.json({ message: 'Supplier profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier profile:', error);
    res.status(500).json({ error: 'Failed to delete supplier profile' });
  }
});

// ============================================================================
// CONTACT POINTS MANAGEMENT
// ============================================================================

// Get party contact points
router.get('/parties/:partyId/contacts', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM hz_contact_points WHERE party_id = ? ORDER BY is_primary DESC, contact_point_type',
      [req.params.partyId]
    );
    
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching contact points:', error);
    res.status(500).json({ error: 'Failed to fetch contact points' });
  }
});

// Create contact point
router.post('/parties/:partyId/contacts', async (req, res) => {
  try {
    console.log('🔍 Creating contact point for party ID:', req.params.partyId);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next contact point ID from sequence
    const contactPointId = await getNextSequenceValue(connection, 'HZ_CONTACT_POINT_ID_SEQ');
    console.log('🆔 Generated contact point ID:', contactPointId);
    
    const {
      contact_point_type, contact_point_value, contact_point_purpose,
      is_primary, status
    } = req.body;
    
    console.log('📋 Extracted data:', {
      contact_point_type, contact_point_value, contact_point_purpose,
      is_primary, status
    });
    
    // If this is primary, unset other primary contacts of the same type
    if (is_primary) {
      console.log('🔄 Unsetting other primary contacts of type:', contact_point_type);
      await connection.execute(`
        UPDATE hz_contact_points 
        SET is_primary = FALSE 
        WHERE party_id = ? AND contact_point_type = ?
      `, [req.params.partyId, contact_point_type]);
    }
    
    console.log('💾 Executing INSERT...');
    await connection.execute(`
      INSERT INTO hz_contact_points (
        contact_point_id, party_id, contact_point_type, contact_point_value,
        contact_point_purpose, is_primary, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [contactPointId, req.params.partyId, contact_point_type,
        contact_point_value, contact_point_purpose, is_primary, status]);
    
    console.log('✅ Contact point created successfully!');
    await connection.end();
    res.status(201).json({ 
      message: 'Contact point created successfully',
      contact_point_id: contactPointId
    });
  } catch (error) {
    console.error('❌ Error creating contact point:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to create contact point' });
  }
});

// Update contact point
router.put('/contacts/:contactPointId', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const {
      contact_point_type, contact_point_value, contact_point_purpose,
      is_primary, status
    } = req.body;
    
    // Get the party_id for this contact point
    const [contactResult] = await connection.execute(
      'SELECT party_id FROM hz_contact_points WHERE contact_point_id = ?',
      [req.params.contactPointId]
    );
    
    if (contactResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Contact point not found' });
    }
    
    const partyId = contactResult[0].party_id;
    
    // If this is primary, unset other primary contacts of the same type
    if (is_primary) {
      await connection.execute(`
        UPDATE hz_contact_points 
        SET is_primary = FALSE 
        WHERE party_id = ? AND contact_point_type = ? AND contact_point_id != ?
      `, [partyId, contact_point_type, req.params.contactPointId]);
    }
    
    await connection.execute(`
      UPDATE hz_contact_points SET
        contact_point_type = ?,
        contact_point_value = ?,
        contact_point_purpose = ?,
        is_primary = ?,
        status = ?,
        updated_at = NOW()
      WHERE contact_point_id = ?
    `, [contact_point_type, contact_point_value, contact_point_purpose,
        is_primary, status, req.params.contactPointId]);
    
    await connection.end();
    res.json({ message: 'Contact point updated successfully' });
  } catch (error) {
    console.error('Error updating contact point:', error);
    res.status(500).json({ error: 'Failed to update contact point' });
  }
});

// Delete contact point
router.delete('/contacts/:contactPointId', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [result] = await connection.execute(
      'DELETE FROM hz_contact_points WHERE contact_point_id = ?',
      [req.params.contactPointId]
    );
    
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Contact point not found' });
    }
    
    res.json({ message: 'Contact point deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact point:', error);
    res.status(500).json({ error: 'Failed to delete contact point' });
  }
});

// ============================================================================
// SEARCH AND FILTER
// ============================================================================

// Search parties
router.get('/search', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { q, type, status } = req.query;
    
    let query = `
      SELECT 
        p.party_id,
        p.party_number,
        p.party_name,
        p.party_type,
        p.tax_id,
        p.website,
        p.industry,
        p.status,
        p.created_at
      FROM hz_parties p
      WHERE 1=1
    `;
    
    const params = [];
    
    if (q) {
      query += ` AND (p.party_name LIKE ? OR p.party_number LIKE ? OR p.tax_id LIKE ?)`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (type && type !== 'ALL') {
      query += ` AND p.party_type = ?`;
      params.push(type);
    }
    
    if (status && status !== 'ALL') {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY p.party_name LIMIT 50`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error searching parties:', error);
    res.status(500).json({ error: 'Failed to search parties' });
  }
});

export default router; 