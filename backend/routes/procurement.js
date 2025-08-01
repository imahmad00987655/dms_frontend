import express from 'express';
import mysql from 'mysql2/promise';
import { dbConfig } from '../config/database.js';
import jwt from 'jsonwebtoken';

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

// Helper function to generate document number
const generateDocumentNumber = async (connection, documentType) => {
  const [docResult] = await connection.execute(
    'SELECT prefix, suffix, next_number, number_format FROM po_document_numbers WHERE document_type = ? AND is_active = TRUE',
    [documentType]
  );
  
  if (docResult.length === 0) {
    throw new Error(`Document number configuration not found for ${documentType}`);
  }
  
  const config = docResult[0];
  const formattedNumber = config.next_number.toString().padStart(config.number_format.length, '0');
  const documentNumber = `${config.prefix}${formattedNumber}${config.suffix}`;
  
  // Update next number
  await connection.execute(
    'UPDATE po_document_numbers SET next_number = next_number + 1 WHERE document_type = ?',
    [documentType]
  );
  
  return documentNumber;
};

// Helper function to log audit trail
const logAuditTrail = async (connection, userId, action, documentType, documentId, oldValues = null, newValues = null) => {
  await connection.execute(`
    INSERT INTO po_audit_log (user_id, action, document_type, document_id, old_values, new_values, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `, [userId, action, documentType, documentId, 
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null]);
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================================================
// PURCHASE AGREEMENTS
// ============================================================================

// Get procurement suppliers endpoint
router.get('/suppliers', async (req, res) => {
  try {
    console.log('Fetching procurement suppliers...');
    const connection = await mysql.createConnection(dbConfig);
    
    const [suppliers] = await connection.execute(`
      SELECT 
        supplier_id,
        supplier_name,
        supplier_number,
        supplier_type,
        supplier_class,
        supplier_category,
        status
      FROM ap_suppliers 
      WHERE status = 'ACTIVE'
      ORDER BY supplier_name
    `);
    
    await connection.end();
    
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Test database connection endpoint
router.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database connection...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Test basic connection
    const [result] = await connection.execute('SELECT 1 as test');
    console.log('Basic connection test:', result);
    
    // Test if po_agreements table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'po_agreements'");
    console.log('po_agreements table check:', tables);
    
    // Test if ap_suppliers table exists
    const [suppliers] = await connection.execute("SHOW TABLES LIKE 'ap_suppliers'");
    console.log('ap_suppliers table check:', suppliers);
    
    await connection.end();
    
    res.json({
      success: true,
      message: 'Database connection test successful',
      tables: {
        po_agreements: tables.length > 0,
        ap_suppliers: suppliers.length > 0
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error.message
    });
  }
});





// Get agreement lines
router.get('/agreements/:agreementId/lines', async (req, res) => {
  try {
    console.log('Fetching agreement lines for agreement ID:', req.params.agreementId);
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT * FROM po_agreement_lines 
      WHERE agreement_id = ? 
      ORDER BY line_number
    `, [req.params.agreementId]);
    await connection.end();
    console.log('Found agreement lines:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agreement lines:', error);
    res.status(500).json({ error: 'Failed to fetch agreement lines' });
  }
});

// Create agreement line
router.post('/agreements/:agreementId/lines', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const lineId = await getNextSequenceValue(connection, 'PO_AGREEMENT_LINE_ID_SEQ');
    const {
      line_number, item_code, item_name, description, category, uom,
      quantity, unit_price, line_amount, min_quantity, max_quantity,
      need_by_date, suggested_supplier, suggested_supplier_id, notes
    } = req.body;
    
    await connection.execute(`
      INSERT INTO po_agreement_lines (
        line_id, agreement_id, line_number, item_code, item_name, description,
        category, uom, quantity, unit_price, line_amount, min_quantity,
        max_quantity, need_by_date, suggested_supplier, suggested_supplier_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      lineId, req.params.agreementId, line_number, item_code, item_name, description,
      category, uom, quantity, unit_price, line_amount, min_quantity,
      max_quantity, need_by_date, suggested_supplier, suggested_supplier_id, notes
    ]);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Agreement line created successfully',
      line_id: lineId
    });
  } catch (error) {
    console.error('Error creating agreement line:', error);
    res.status(500).json({ error: 'Failed to create agreement line' });
  }
});

// ===== REMOVE/COMMENT OUT THE OLD AGREEMENTS ROUTE =====
// Get all purchase agreements
router.get('/agreements', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { search, status, supplier_id } = req.query;
    
    console.log('🔍 Using UPDATED query with hz_supplier_profiles');
    let query = `
      SELECT 
        pa.*,
        p.party_name as supplier_name,
        COALESCE(ps.site_name, 'Default Site') as supplier_site_name,
        u1.first_name as buyer_name,
        u2.first_name as created_by_name
      FROM po_agreements pa
      JOIN hz_supplier_profiles sp ON pa.supplier_id = sp.profile_id
      JOIN hz_parties p ON sp.party_id = p.party_id
      LEFT JOIN hz_party_sites ps ON pa.supplier_site_id = ps.site_id
      JOIN users u1 ON pa.buyer_id = u1.id
      JOIN users u2 ON pa.created_by = u2.id
      WHERE 1=1
    `;
    
    console.log('🔍 EXECUTING QUERY:', query);
    
    const params = [];
    
    if (search) {
      query += ` AND (pa.agreement_number LIKE ? OR pa.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status && status !== 'ALL') {
      query += ` AND pa.status = ?`;
      params.push(status);
    }
    
    if (supplier_id) {
      query += ` AND pa.supplier_id = ?`;
      params.push(supplier_id);
    }
    
    query += ` ORDER BY pa.created_at DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchase agreements:', error);
    res.status(500).json({ error: 'Failed to fetch purchase agreements' });
  }
});

// Test purchase agreement creation endpoint (no auth)
router.post('/test-agreement', async (req, res) => {
  try {
    console.log('=== TEST AGREEMENT CREATION ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      supplier_id,
      description = '',
      lines = []
    } = req.body;
    
    console.log('Parsed request data:', {
      supplier_id,
      description,
      lines_count: lines?.length || 0
    });
    
    if (!supplier_id) {
      return res.status(400).json({ error: 'supplier_id is required' });
    }
    
    console.log('Creating database connection...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database connection created successfully');
    
    // Generate agreement ID and number
    const agreementId = Date.now();
    const finalAgreementNumber = `PA${agreementId}`;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Calculate total amount from line items if not provided
    let calculatedTotalAmount = 0;
    if (total_amount && !isNaN(parseFloat(total_amount))) {
      calculatedTotalAmount = parseFloat(total_amount);
    } else if (lines && lines.length > 0) {
      calculatedTotalAmount = lines.reduce((total, line) => {
        return total + (Number(line.line_amount) || 0);
      }, 0);
    }

    console.log('Creating agreement with:', {
      agreementId,
      finalAgreementNumber,
      supplier_id,
      description,
      calculatedTotalAmount
    });
    
    console.log('About to insert agreement header...');
    // Insert agreement header with minimal required fields
    const result = await connection.execute(`
      INSERT INTO po_agreements (
        agreement_id, 
        agreement_number, 
        agreement_type, 
        supplier_id, 
        supplier_site_id,
        buyer_id, 
        agreement_date, 
        effective_start_date, 
        effective_end_date,
        currency_code, 
        exchange_rate, 
        total_amount, 
        amount_used,
        payment_terms_id,
        description, 
        notes, 
        created_by,
        status,
        approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      agreementId,           // agreement_id
      finalAgreementNumber,  // agreement_number
      agreement_type,        // agreement_type
      supplier_id,          // supplier_id
      1,                    // supplier_site_id (default)
      buyer_id,             // buyer_id
      agreement_date || today,                // agreement_date
      effective_start_date || today,                // effective_start_date
      effective_end_date || endDate,              // effective_end_date
      currency_code || 'USD',                // currency_code
      exchange_rate || 1.0,                  // exchange_rate
      calculatedTotalAmount,                 // total_amount
      0,                    // amount_used (start with 0)
      30,                   // payment_terms_id (default)
      description,          // description
      '',                   // notes
      1,                    // created_by (default)
      status,               // status
      approval_status       // approval_status
    ]);
    
    console.log('Agreement header inserted successfully');
    
    // Create line items if provided
    if (lines && lines.length > 0) {
      console.log('Creating line items:', lines.length);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`Processing line ${i + 1}:`, line);
        
        // Use simple timestamp-based line ID
        const lineId = Date.now() + i;
        
        await connection.execute(`
          INSERT INTO po_agreement_lines (
            line_id, agreement_id, line_number, item_code, item_name, description,
            category, uom, quantity, unit_price, line_amount, min_quantity,
            max_quantity, need_by_date, suggested_supplier, suggested_supplier_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lineId, 
          agreementId, 
          i + 1, 
          line.item_code || '', 
          line.item_name || '',
          line.description || '', 
          line.category || '', 
          line.uom || 'EACH',
          Number(line.quantity) || 1, 
          Number(line.unit_price) || 0, 
          Number(line.line_amount) || 0,
          line.min_quantity ? Number(line.min_quantity) : null, 
          line.max_quantity ? Number(line.max_quantity) : null,
          line.need_by_date || null, 
          line.suggested_supplier || '',
          line.suggested_supplier_id ? Number(line.suggested_supplier_id) : null, 
          line.notes || ''
        ]);
      }
      
      console.log('Line items created successfully');
    }
    
    await connection.end();
    
    console.log('Agreement created successfully');
    
    res.status(201).json({
      success: true,
      message: 'Agreement created successfully',
      agreement: {
        agreement_id: agreementId,
        agreement_number: finalAgreementNumber,
        supplier_id,
        description,
        lines_count: lines.length
      }
    });
    
  } catch (error) {
    console.error('Error creating purchase agreement:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to create agreement',
      details: error.message,
      stack: error.stack
    });
  }
});

// Create purchase agreement (no auth)
router.post('/agreements', async (req, res) => {
  try {
    console.log('=== AGREEMENT CREATION VIA /agreements ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      agreement_number,
      agreement_type = '',
      supplier_id,
      buyer_id = 1,
      description = '',
      lines = [],
      status = '',
      approval_status = '',
      currency_code = '',
      exchange_rate = '',
      total_amount = '',
      agreement_date = '',
      effective_start_date = '',
      effective_end_date = ''
    } = req.body;
    
    console.log('Parsed request data:', {
      agreement_number,
      supplier_id,
      description,
      lines_count: lines?.length || 0
    });
    
    if (!supplier_id) {
      return res.status(400).json({ error: 'supplier_id is required' });
    }
    
    if (!agreement_number) {
      return res.status(400).json({ error: 'agreement_number is required' });
    }
    
    console.log('Creating database connection...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Database connection created successfully');
    
    // Use the agreement number from frontend, generate ID
    const agreementId = Date.now();
    const finalAgreementNumber = agreement_number;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Calculate total amount from line items if not provided
    let calculatedTotalAmount = 0;
    if (total_amount && !isNaN(parseFloat(total_amount))) {
      calculatedTotalAmount = parseFloat(total_amount);
    } else if (lines && lines.length > 0) {
      calculatedTotalAmount = lines.reduce((total, line) => {
        return total + (Number(line.line_amount) || 0);
      }, 0);
    }

    console.log('Creating agreement with:', {
      agreementId,
      finalAgreementNumber,
      supplier_id,
      description,
      calculatedTotalAmount
    });
    
    console.log('About to insert agreement header...');
    // Insert agreement header with minimal required fields
    const result = await connection.execute(`
      INSERT INTO po_agreements (
        agreement_id, 
        agreement_number, 
        agreement_type, 
        supplier_id, 
        supplier_site_id,
        buyer_id, 
        agreement_date, 
        effective_start_date, 
        effective_end_date,
        currency_code, 
        exchange_rate, 
        total_amount, 
        amount_used,
        payment_terms_id,
        description, 
        notes, 
        created_by,
        status,
        approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      agreementId,           // agreement_id
      finalAgreementNumber,  // agreement_number
      agreement_type,        // agreement_type
      supplier_id,          // supplier_id
      1,                    // supplier_site_id (default)
      buyer_id,             // buyer_id
      agreement_date || today,                // agreement_date
      effective_start_date || today,                // effective_start_date
      effective_end_date || endDate,              // effective_end_date
      currency_code || 'USD',                // currency_code
      exchange_rate || 1.0,                  // exchange_rate
      calculatedTotalAmount,                 // total_amount
      0,                    // amount_used (start with 0)
      30,                   // payment_terms_id (default)
      description,          // description
      '',                   // notes
      1,                    // created_by (default)
      status,               // status
      approval_status       // approval_status
    ]);
    
    console.log('Agreement header inserted successfully');
    
    // Create line items if provided
    if (lines && lines.length > 0) {
      console.log('Creating line items:', lines.length);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        console.log(`Processing line ${i + 1}:`, line);
        
        // Use simple timestamp-based line ID
        const lineId = Date.now() + i;
        
        await connection.execute(`
          INSERT INTO po_agreement_lines (
            line_id, agreement_id, line_number, item_code, item_name, description,
            category, uom, quantity, unit_price, line_amount, min_quantity,
            max_quantity, need_by_date, suggested_supplier, suggested_supplier_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lineId, 
          agreementId, 
          i + 1, 
          line.item_code || '', 
          line.item_name || '',
          line.description || '', 
          line.category || '', 
          line.uom || 'EACH',
          Number(line.quantity) || 1, 
          Number(line.unit_price) || 0, 
          Number(line.line_amount) || 0,
          line.min_quantity ? Number(line.min_quantity) : null, 
          line.max_quantity ? Number(line.max_quantity) : null,
          line.need_by_date || null, 
          line.suggested_supplier || '',
          line.suggested_supplier_id ? Number(line.suggested_supplier_id) : null, 
          line.notes || ''
        ]);
      }
      
      console.log('Line items created successfully');
    }
    
    await connection.end();
    
    console.log('Agreement created successfully');
    
    res.status(201).json({
      success: true,
      message: 'Agreement created successfully',
      agreement: {
        agreement_id: agreementId,
        agreement_number: finalAgreementNumber,
        supplier_id,
        description,
        lines_count: lines.length
      }
    });
    
  } catch (error) {
    console.error('Error creating purchase agreement:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to create agreement',
      details: error.message,
      stack: error.stack
    });
  }
});

// Get purchase agreement by ID
router.get('/agreements/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT 
        pa.*,
        p.party_name as supplier_name,
        COALESCE(ps.site_name, 'Default Site') as supplier_site_name,
        u1.first_name as buyer_name,
        u2.first_name as created_by_name
      FROM po_agreements pa
      JOIN hz_supplier_profiles sp ON pa.supplier_id = sp.profile_id
      JOIN hz_parties p ON sp.party_id = p.party_id
      LEFT JOIN hz_party_sites ps ON pa.supplier_site_id = ps.site_id
      JOIN users u1 ON pa.buyer_id = u1.id
      JOIN users u2 ON pa.created_by = u2.id
      WHERE pa.agreement_id = ?
    `, [req.params.id]);
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Purchase agreement not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching purchase agreement:', error);
    res.status(500).json({ error: 'Failed to fetch purchase agreement' });
  }
});

// Create purchase agreement (using simple method)
router.post('/create-agreement', async (req, res) => {
  try {
    console.log('=== AGREEMENT CREATION VIA /agreements ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Get basic data from request
    const { supplier_id, description = 'New Agreement', lines = [] } = req.body;
    
    if (!supplier_id) {
      return res.status(400).json({ error: 'supplier_id is required' });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // Generate unique ID using timestamp
    const agreementId = Date.now();
    const agreementNumber = `PA${agreementId}`;
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    console.log('Creating agreement with:', {
      agreementId,
      agreementNumber,
      supplier_id,
      description
    });
    
    // Insert with all required fields
    const result = await connection.execute(`
      INSERT INTO po_agreements (
        agreement_id, 
        agreement_number, 
        agreement_type, 
        supplier_id, 
        supplier_site_id,
        buyer_id, 
        agreement_date, 
        effective_start_date, 
        effective_end_date,
        currency_code, 
        exchange_rate, 
        total_amount, 
        payment_terms_id,
        description, 
        notes, 
        created_by,
        status,
        approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      agreementId,           // agreement_id
      agreementNumber,       // agreement_number
      'BLANKET',            // agreement_type
      supplier_id,          // supplier_id
      1,                    // supplier_site_id
      1,                    // buyer_id
      today,                // agreement_date
      today,                // effective_start_date
      endDate,              // effective_end_date
      'USD',                // currency_code
      1.0,                  // exchange_rate
      0.00,                 // total_amount
      30,                   // payment_terms_id
      description,          // description
      '',                   // notes
      1,                    // created_by
      'ACTIVE',             // status
      'PENDING'             // approval_status
    ]);
    
    // Create line items if provided
    if (lines && lines.length > 0) {
      console.log('Creating line items:', lines.length);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineId = await getNextSequenceValue(connection, 'PO_AGREEMENT_LINE_ID_SEQ');
        
        await connection.execute(`
          INSERT INTO po_agreement_lines (
            line_id, agreement_id, line_number, item_code, item_name, description,
            category, uom, quantity, unit_price, line_amount, min_quantity,
            max_quantity, need_by_date, suggested_supplier, suggested_supplier_id, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          lineId, agreementId, i + 1, line.item_code || '', line.item_name || '',
          line.description || '', line.category || '', line.uom || 'EACH',
          line.quantity || 1, line.unit_price || 0, line.line_amount || 0,
          line.min_quantity || null, line.max_quantity || null,
          line.need_by_date || null, line.suggested_supplier || '',
          line.suggested_supplier_id || null, line.notes || ''
        ]);
      }
      
      console.log('Line items created successfully');
    }
    
    await connection.end();
    
    console.log('Agreement created successfully');
    
    res.status(201).json({
      success: true,
      message: 'Agreement created successfully',
      agreement: {
        agreement_id: agreementId,
        agreement_number: agreementNumber,
        supplier_id,
        description,
        lines_count: lines.length
      }
    });
    
  } catch (error) {
    console.error('Error creating agreement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agreement',
      details: error.message
    });
  }
});

// Update purchase agreement
router.put('/agreements/:id', authenticateToken, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_agreements WHERE agreement_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase agreement not found' });
    }
    
    const oldValues = currentResult[0];
    
    const {
      agreement_type, supplier_id, supplier_site_id, buyer_id,
      agreement_date, effective_start_date, effective_end_date,
      currency_code, exchange_rate, total_amount, payment_terms_id,
      description, notes, status
    } = req.body;
    
    // Convert undefined values to null for MySQL
    const params = [
      agreement_type || null,
      supplier_id || null,
      supplier_site_id || null,
      buyer_id || null,
      agreement_date || null,
      effective_start_date || null,
      effective_end_date || null,
      currency_code || null,
      exchange_rate || null,
      total_amount || null,
      payment_terms_id || null,
      description || null,
      notes || null,
      status || null,
      req.params.id
    ];
    
    await connection.execute(`
      UPDATE po_agreements SET
        agreement_type = ?, supplier_id = ?, supplier_site_id = ?, buyer_id = ?,
        agreement_date = ?, effective_start_date = ?, effective_end_date = ?,
        currency_code = ?, exchange_rate = ?, total_amount = ?, payment_terms_id = ?,
        description = ?, notes = ?, status = ?, updated_at = NOW()
      WHERE agreement_id = ?
    `, params);
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'UPDATE', 'AGREEMENT', req.params.id, oldValues, req.body);
    
    await connection.end();
    res.json({ message: 'Purchase agreement updated successfully' });
  } catch (error) {
    console.error('Error updating purchase agreement:', error);
    res.status(500).json({ error: 'Failed to update purchase agreement' });
  }
});

// Delete purchase agreement (soft delete)
router.delete('/agreements/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_agreements WHERE agreement_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase agreement not found' });
    }
    
    const oldValues = currentResult[0];
    
    // Soft delete by setting status to CANCELLED
    await connection.execute(
      'UPDATE po_agreements SET status = "CANCELLED", updated_at = NOW() WHERE agreement_id = ?',
      [req.params.id]
    );
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'DELETE', 'AGREEMENT', req.params.id, oldValues, { status: 'CANCELLED' });
    
    await connection.end();
    res.json({ message: 'Purchase agreement cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling purchase agreement:', error);
    res.status(500).json({ error: 'Failed to cancel purchase agreement' });
  }
});

// ============================================================================
// PURCHASE REQUISITIONS
// ============================================================================

// Get all purchase requisitions
router.get('/requisitions', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { search, status, requester_id } = req.query;
    
    let query = `
      SELECT 
        pr.*,
        u1.first_name as requester_name,
        u2.first_name as buyer_name,
        u3.first_name as created_by_name
      FROM po_requisitions pr
      JOIN users u1 ON pr.requester_id = u1.id
      LEFT JOIN users u2 ON pr.buyer_id = u2.id
      JOIN users u3 ON pr.created_by = u3.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (pr.requisition_number LIKE ? OR pr.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status && status !== 'ALL') {
      query += ` AND pr.status = ?`;
      params.push(status);
    }
    
    if (requester_id) {
      query += ` AND pr.requester_id = ?`;
      params.push(requester_id);
    }
    
    query += ` ORDER BY pr.created_at DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchase requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch purchase requisitions' });
  }
});

// Get purchase requisition by ID with lines
router.get('/requisitions/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get header
    const [headerRows] = await connection.execute(`
      SELECT 
        pr.*,
        u1.first_name as requester_name,
        u2.first_name as buyer_name,
        u3.first_name as created_by_name
      FROM po_requisitions pr
      JOIN users u1 ON pr.requester_id = u1.id
      LEFT JOIN users u2 ON pr.buyer_id = u2.id
      JOIN users u3 ON pr.created_by = u3.id
      WHERE pr.requisition_id = ?
    `, [req.params.id]);
    
    if (headerRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }
    
    // Get lines
    const [lineRows] = await connection.execute(`
      SELECT * FROM po_requisition_lines 
      WHERE requisition_id = ? 
      ORDER BY line_number
    `, [req.params.id]);
    
    await connection.end();
    
    const result = {
      ...headerRows[0],
      lines: lineRows
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching purchase requisition:', error);
    res.status(500).json({ error: 'Failed to fetch purchase requisition' });
  }
});

// Create purchase requisition
router.post('/requisitions', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next requisition ID and generate requisition number
    const requisitionId = await getNextSequenceValue(connection, 'PO_REQUISITION_ID_SEQ');
    const requisitionNumber = await generateDocumentNumber(connection, 'REQUISITION');
    
    const {
      requester_id, buyer_id, department_id, need_by_date, urgency,
      currency_code, exchange_rate, description, justification, notes, lines
    } = req.body;
    
    // Calculate total amount from lines
    const totalAmount = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    
    await connection.execute(`
      INSERT INTO po_requisitions (
        requisition_id, requisition_number, requester_id, buyer_id, department_id,
        need_by_date, urgency, currency_code, exchange_rate, total_amount,
        description, justification, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [requisitionId, requisitionNumber, requester_id, buyer_id, department_id,
        need_by_date, urgency, currency_code, exchange_rate, totalAmount,
        description, justification, notes, req.user.id]);
    
    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = await getNextSequenceValue(connection, 'PO_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_requisition_lines (
          line_id, requisition_id, line_number, item_code, item_name,
          description, category, uom, quantity, unit_price, line_amount,
          need_by_date, suggested_supplier, suggested_supplier_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lineId, requisitionId, i + 1, line.item_code, line.item_name,
          line.description, line.category, line.uom, line.quantity, line.unit_price, line.line_amount,
          line.need_by_date, line.suggested_supplier, line.suggested_supplier_id, line.notes]);
    }
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'CREATE', 'REQUISITION', requisitionId, null, req.body);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Purchase requisition created successfully',
      requisition_id: requisitionId,
      requisition_number: requisitionNumber
    });
  } catch (error) {
    console.error('Error creating purchase requisition:', error);
    res.status(500).json({ error: 'Failed to create purchase requisition' });
  }
});

// Update purchase requisition
router.put('/requisitions/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_requisitions WHERE requisition_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }
    
    const oldValues = currentResult[0];
    
    const {
      requester_id, buyer_id, department_id, need_by_date, urgency,
      currency_code, exchange_rate, description, justification, notes, lines, status
    } = req.body;
    
    // Calculate total amount from lines
    const totalAmount = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    
    await connection.execute(`
      UPDATE po_requisitions SET
        requester_id = ?, buyer_id = ?, department_id = ?, need_by_date = ?, urgency = ?,
        currency_code = ?, exchange_rate = ?, total_amount = ?, description = ?,
        justification = ?, notes = ?, status = ?, updated_at = NOW()
      WHERE requisition_id = ?
    `, [requester_id, buyer_id, department_id, need_by_date, urgency,
        currency_code, exchange_rate, totalAmount, description,
        justification, notes, status, req.params.id]);

    // Delete existing lines and insert new ones
    await connection.execute('DELETE FROM po_requisition_lines WHERE requisition_id = ?', [req.params.id]);
    
    // Insert updated lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = await getNextSequenceValue(connection, 'PO_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_requisition_lines (
          line_id, requisition_id, line_number, item_code, item_name,
          description, category, uom, quantity, unit_price, line_amount,
          need_by_date, suggested_supplier, suggested_supplier_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lineId, req.params.id, i + 1, line.item_code, line.item_name,
          line.description, line.category, line.uom, line.quantity, line.unit_price, line.line_amount,
          line.need_by_date, line.suggested_supplier, line.suggested_supplier_id, line.notes]);
    }
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'UPDATE', 'REQUISITION', req.params.id, oldValues, req.body);
    
    await connection.end();
    res.json({ message: 'Purchase requisition updated successfully' });
  } catch (error) {
    console.error('Error updating purchase requisition:', error);
    res.status(500).json({ error: 'Failed to update purchase requisition' });
  }
});

// Delete purchase requisition (soft delete)
router.delete('/requisitions/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_requisitions WHERE requisition_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase requisition not found' });
    }
    
    const oldValues = currentResult[0];
    
    // Soft delete by setting status to CANCELLED
    await connection.execute(
      'UPDATE po_requisitions SET status = "CANCELLED", updated_at = NOW() WHERE requisition_id = ?',
      [req.params.id]
    );
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'DELETE', 'REQUISITION', req.params.id, oldValues, { status: 'CANCELLED' });
    
    await connection.end();
    res.json({ message: 'Purchase requisition cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling purchase requisition:', error);
    res.status(500).json({ error: 'Failed to cancel purchase requisition' });
  }
});

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

// Get all purchase orders
router.get('/purchase-orders', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { search, status, supplier_id } = req.query;
    
    let query = `
      SELECT 
        ph.*,
        s.supplier_name,
        ss.site_name as supplier_site_name,
        u1.first_name as buyer_name,
        u2.first_name as created_by_name,
        pr.requisition_number,
        pa.agreement_number
      FROM po_headers ph
      JOIN ap_suppliers s ON ph.supplier_id = s.supplier_id
      JOIN ap_supplier_sites ss ON ph.supplier_site_id = ss.site_id
      JOIN users u1 ON ph.buyer_id = u1.id
      JOIN users u2 ON ph.created_by = u2.id
      LEFT JOIN po_requisitions pr ON ph.requisition_id = pr.requisition_id
      LEFT JOIN po_agreements pa ON ph.agreement_id = pa.agreement_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (ph.po_number LIKE ? OR ph.description LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status && status !== 'ALL') {
      query += ` AND ph.status = ?`;
      params.push(status);
    }
    
    if (supplier_id) {
      query += ` AND ph.supplier_id = ?`;
      params.push(supplier_id);
    }
    
    query += ` ORDER BY ph.created_at DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Get purchase order by ID with lines
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get header
    const [headerRows] = await connection.execute(`
      SELECT 
        ph.*,
        s.supplier_name,
        ss.site_name as supplier_site_name,
        u1.first_name as buyer_name,
        u2.first_name as created_by_name,
        pr.requisition_number,
        pa.agreement_number
      FROM po_headers ph
      JOIN ap_suppliers s ON ph.supplier_id = s.supplier_id
      JOIN ap_supplier_sites ss ON ph.supplier_site_id = ss.site_id
      JOIN users u1 ON ph.buyer_id = u1.id
      JOIN users u2 ON ph.created_by = u2.id
      LEFT JOIN po_requisitions pr ON ph.requisition_id = pr.requisition_id
      LEFT JOIN po_agreements pa ON ph.agreement_id = pa.agreement_id
      WHERE ph.header_id = ?
    `, [req.params.id]);
    
    if (headerRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    // Get lines
    const [lineRows] = await connection.execute(`
      SELECT * FROM po_lines 
      WHERE header_id = ? 
      ORDER BY line_number
    `, [req.params.id]);
    
    await connection.end();
    
    const result = {
      ...headerRows[0],
      lines: lineRows
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// Create purchase order
router.post('/purchase-orders', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next PO ID and generate PO number
    const headerId = await getNextSequenceValue(connection, 'PO_HEADER_ID_SEQ');
    const poNumber = await generateDocumentNumber(connection, 'PURCHASE_ORDER');
    
    const {
      po_type, supplier_id, supplier_site_id, buyer_id, requisition_id, agreement_id,
      po_date, need_by_date, currency_code, exchange_rate, payment_terms_id,
      description, notes, lines
    } = req.body;
    
    // Calculate totals from lines
    const subtotal = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    const taxAmount = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
    const totalAmount = subtotal + taxAmount;
    
    await connection.execute(`
      INSERT INTO po_headers (
        header_id, po_number, po_type, supplier_id, supplier_site_id, buyer_id,
        requisition_id, agreement_id, po_date, need_by_date, currency_code,
        exchange_rate, subtotal, tax_amount, total_amount, payment_terms_id,
        description, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [headerId, poNumber, po_type, supplier_id, supplier_site_id, buyer_id,
        requisition_id, agreement_id, po_date, need_by_date, currency_code,
        exchange_rate, subtotal, taxAmount, totalAmount, payment_terms_id,
        description, notes, req.user.id]);
    
    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = await getNextSequenceValue(connection, 'PO_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_lines (
          line_id, header_id, line_number, item_code, item_name, description,
          category, uom, quantity, unit_price, line_amount, tax_rate, tax_amount,
          need_by_date, promised_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lineId, headerId, i + 1, line.item_code, line.item_name, line.description,
          line.category, line.uom, line.quantity, line.unit_price, line.line_amount,
          line.tax_rate, line.tax_amount, line.need_by_date, line.promised_date, line.notes]);
    }
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'CREATE', 'PURCHASE_ORDER', headerId, null, req.body);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Purchase order created successfully',
      header_id: headerId,
      po_number: poNumber
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// Update purchase order
router.put('/purchase-orders/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_headers WHERE header_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const oldValues = currentResult[0];
    
    const {
      po_type, supplier_id, supplier_site_id, buyer_id, requisition_id, agreement_id,
      po_date, need_by_date, currency_code, exchange_rate, payment_terms_id,
      description, notes, lines, status
    } = req.body;
    
    // Calculate totals from lines
    const subtotal = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    const taxAmount = lines.reduce((sum, line) => sum + (line.tax_amount || 0), 0);
    const totalAmount = subtotal + taxAmount;
    
    await connection.execute(`
      UPDATE po_headers SET
        po_type = ?, supplier_id = ?, supplier_site_id = ?, buyer_id = ?,
        requisition_id = ?, agreement_id = ?, po_date = ?, need_by_date = ?,
        currency_code = ?, exchange_rate = ?, subtotal = ?, tax_amount = ?,
        total_amount = ?, payment_terms_id = ?, description = ?, notes = ?,
        status = ?, updated_at = NOW()
      WHERE header_id = ?
    `, [po_type, supplier_id, supplier_site_id, buyer_id, requisition_id, agreement_id,
        po_date, need_by_date, currency_code, exchange_rate, subtotal, taxAmount,
        totalAmount, payment_terms_id, description, notes, status, req.params.id]);

    // Delete existing lines and insert new ones
    await connection.execute('DELETE FROM po_lines WHERE header_id = ?', [req.params.id]);
    
    // Insert updated lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineId = await getNextSequenceValue(connection, 'PO_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_lines (
          line_id, header_id, line_number, item_code, item_name, description,
          category, uom, quantity, unit_price, line_amount, tax_rate, tax_amount,
          need_by_date, promised_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [lineId, req.params.id, i + 1, line.item_code, line.item_name, line.description,
          line.category, line.uom, line.quantity, line.unit_price, line.line_amount,
          line.tax_rate, line.tax_amount, line.need_by_date, line.promised_date, line.notes]);
    }
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'UPDATE', 'PURCHASE_ORDER', req.params.id, oldValues, req.body);
    
    await connection.end();
    res.json({ message: 'Purchase order updated successfully' });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// Delete purchase order (soft delete)
router.delete('/purchase-orders/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_headers WHERE header_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    
    const oldValues = currentResult[0];
    
    // Soft delete by setting status to CANCELLED
    await connection.execute(
      'UPDATE po_headers SET status = "CANCELLED", updated_at = NOW() WHERE header_id = ?',
      [req.params.id]
    );
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'DELETE', 'PURCHASE_ORDER', req.params.id, oldValues, { status: 'CANCELLED' });
    
    await connection.end();
    res.json({ message: 'Purchase order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({ error: 'Failed to cancel purchase order' });
  }
});

// ============================================================================
// GOODS RECEIPT NOTES
// ============================================================================

// Get all goods receipts
router.get('/receipts', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const { search, status, header_id } = req.query;
    
    let query = `
      SELECT 
        pr.*,
        ph.po_number,
        s.supplier_name,
        u.first_name as created_by_name
      FROM po_receipts pr
      JOIN po_headers ph ON pr.header_id = ph.header_id
      JOIN ap_suppliers s ON ph.supplier_id = s.supplier_id
      JOIN users u ON pr.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND (pr.receipt_number LIKE ? OR pr.notes LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (status && status !== 'ALL') {
      query += ` AND pr.status = ?`;
      params.push(status);
    }
    
    if (header_id) {
      query += ` AND pr.header_id = ?`;
      params.push(header_id);
    }
    
    query += ` ORDER BY pr.created_at DESC`;
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching goods receipts:', error);
    res.status(500).json({ error: 'Failed to fetch goods receipts' });
  }
});

// Get goods receipt by ID with lines
router.get('/receipts/:id', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get header
    const [headerRows] = await connection.execute(`
      SELECT 
        pr.*,
        ph.po_number,
        s.supplier_name,
        u.first_name as created_by_name
      FROM po_receipts pr
      JOIN po_headers ph ON pr.header_id = ph.header_id
      JOIN ap_suppliers s ON ph.supplier_id = s.supplier_id
      JOIN users u ON pr.created_by = u.id
      WHERE pr.receipt_id = ?
    `, [req.params.id]);
    
    if (headerRows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Goods receipt not found' });
    }
    
    // Get lines
    const [lineRows] = await connection.execute(`
      SELECT 
        prl.*,
        pl.item_name as po_item_name,
        pl.quantity as po_quantity,
        pl.unit_price as po_unit_price
      FROM po_receipt_lines prl
      JOIN po_lines pl ON prl.line_id = pl.line_id
      WHERE prl.receipt_id = ? 
      ORDER BY prl.line_number
    `, [req.params.id]);
    
    await connection.end();
    
    const result = {
      ...headerRows[0],
      lines: lineRows
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching goods receipt:', error);
    res.status(500).json({ error: 'Failed to fetch goods receipt' });
  }
});

// Create goods receipt
router.post('/receipts', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get next receipt ID and generate receipt number
    const receiptId = await getNextSequenceValue(connection, 'PO_RECEIPT_ID_SEQ');
    const receiptNumber = await generateDocumentNumber(connection, 'RECEIPT');
    
    const {
      header_id, receipt_date, receipt_type, currency_code, exchange_rate, notes, lines
    } = req.body;
    
    // Calculate total amount from lines
    const totalAmount = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    
    await connection.execute(`
      INSERT INTO po_receipts (
        receipt_id, receipt_number, header_id, receipt_date, receipt_type,
        currency_code, exchange_rate, total_amount, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [receiptId, receiptNumber, header_id, receipt_date, receipt_type,
        currency_code, exchange_rate, totalAmount, notes, req.user.id]);
    
    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const receiptLineId = await getNextSequenceValue(connection, 'PO_RECEIPT_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_receipt_lines (
          receipt_line_id, receipt_id, line_id, line_number, item_code, item_name,
          description, uom, quantity_ordered, quantity_received, quantity_accepted,
          quantity_rejected, unit_price, line_amount, lot_number, serial_number,
          expiration_date, rejection_reason, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [receiptLineId, receiptId, line.line_id, i + 1, line.item_code, line.item_name,
          line.description, line.uom, line.quantity_ordered, line.quantity_received,
          line.quantity_accepted, line.quantity_rejected, line.unit_price, line.line_amount,
          line.lot_number, line.serial_number, line.expiration_date, line.rejection_reason, line.notes]);
      
      // Update PO line received quantities
      await connection.execute(`
        UPDATE po_lines SET 
          quantity_received = quantity_received + ?,
          updated_at = NOW()
        WHERE line_id = ?
      `, [line.quantity_received, line.line_id]);
    }
    
    // Update PO header received amount
    await connection.execute(`
      UPDATE po_headers SET 
        amount_received = amount_received + ?,
        updated_at = NOW()
      WHERE header_id = ?
    `, [totalAmount, header_id]);
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'CREATE', 'RECEIPT', receiptId, null, req.body);
    
    await connection.end();
    res.status(201).json({ 
      message: 'Goods receipt created successfully',
      receipt_id: receiptId,
      receipt_number: receiptNumber
    });
  } catch (error) {
    console.error('Error creating goods receipt:', error);
    res.status(500).json({ error: 'Failed to create goods receipt' });
  }
});

// Update goods receipt
router.put('/receipts/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_receipts WHERE receipt_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Goods receipt not found' });
    }
    
    const oldValues = currentResult[0];
    
    const {
      receipt_date, receipt_type, currency_code, exchange_rate, notes, lines, status
    } = req.body;
    
    // Calculate total amount from lines
    const totalAmount = lines.reduce((sum, line) => sum + (line.line_amount || 0), 0);
    
    await connection.execute(`
      UPDATE po_receipts SET
        receipt_date = ?, receipt_type = ?, currency_code = ?, exchange_rate = ?,
        total_amount = ?, notes = ?, status = ?, updated_at = NOW()
      WHERE receipt_id = ?
    `, [receipt_date, receipt_type, currency_code, exchange_rate,
        totalAmount, notes, status, req.params.id]);

    // Delete existing lines and insert new ones
    await connection.execute('DELETE FROM po_receipt_lines WHERE receipt_id = ?', [req.params.id]);
    
    // Insert updated lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const receiptLineId = await getNextSequenceValue(connection, 'PO_RECEIPT_LINE_ID_SEQ');
      
      await connection.execute(`
        INSERT INTO po_receipt_lines (
          receipt_line_id, receipt_id, line_id, line_number, item_code, item_name,
          description, uom, quantity_ordered, quantity_received, quantity_accepted,
          quantity_rejected, unit_price, line_amount, lot_number, serial_number,
          expiration_date, rejection_reason, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [receiptLineId, req.params.id, line.line_id, i + 1, line.item_code, line.item_name,
          line.description, line.uom, line.quantity_ordered, line.quantity_received,
          line.quantity_accepted, line.quantity_rejected, line.unit_price, line.line_amount,
          line.lot_number, line.serial_number, line.expiration_date, line.rejection_reason, line.notes]);
    }
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'UPDATE', 'RECEIPT', req.params.id, oldValues, req.body);
    
    await connection.end();
    res.json({ message: 'Goods receipt updated successfully' });
  } catch (error) {
    console.error('Error updating goods receipt:', error);
    res.status(500).json({ error: 'Failed to update goods receipt' });
  }
});

// Delete goods receipt (soft delete)
router.delete('/receipts/:id', requireAdmin, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get current values for audit trail
    const [currentResult] = await connection.execute(
      'SELECT * FROM po_receipts WHERE receipt_id = ?',
      [req.params.id]
    );
    
    if (currentResult.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Goods receipt not found' });
    }
    
    const oldValues = currentResult[0];
    
    // Soft delete by setting status to CANCELLED
    await connection.execute(
      'UPDATE po_receipts SET status = "CANCELLED", updated_at = NOW() WHERE receipt_id = ?',
      [req.params.id]
    );
    
    // Log audit trail
    await logAuditTrail(connection, req.user.id, 'DELETE', 'RECEIPT', req.params.id, oldValues, { status: 'CANCELLED' });
    
    await connection.end();
    res.json({ message: 'Goods receipt cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling goods receipt:', error);
    res.status(500).json({ error: 'Failed to cancel goods receipt' });
  }
});

// ============================================================================
// SUPPORTING DATA ENDPOINTS
// ============================================================================

// Get suppliers for dropdowns
router.get('/suppliers', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT supplier_id, supplier_number, supplier_name 
      FROM ap_suppliers 
      WHERE status = 'ACTIVE' 
      ORDER BY supplier_name
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// Get supplier sites
router.get('/suppliers/:supplierId/sites', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT site_id, site_name, site_type 
      FROM ap_supplier_sites 
      WHERE supplier_id = ? AND status = 'ACTIVE' 
      ORDER BY site_name
    `, [req.params.supplierId]);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching supplier sites:', error);
    res.status(500).json({ error: 'Failed to fetch supplier sites' });
  }
});

// Get users for dropdowns
router.get('/users', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT id, first_name, last_name, email, role 
      FROM users 
      WHERE is_active = TRUE 
      ORDER BY first_name, last_name
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get purchase requisitions for dropdowns
router.get('/requisitions-dropdown', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT requisition_id, requisition_number, description, total_amount 
      FROM po_requisitions 
      WHERE status = 'APPROVED' 
      ORDER BY created_at DESC
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// Get purchase agreements for dropdowns
router.get('/agreements-dropdown', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT agreement_id, agreement_number, description, amount_remaining 
      FROM po_agreements 
      WHERE status = 'ACTIVE' AND amount_remaining > 0 
      ORDER BY created_at DESC
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching agreements:', error);
    res.status(500).json({ error: 'Failed to fetch agreements' });
  }
});

// Get purchase orders for dropdowns
router.get('/purchase-orders-dropdown', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT header_id, po_number, description, amount_remaining 
      FROM po_headers 
      WHERE status = 'RELEASED' AND amount_remaining > 0 
      ORDER BY created_at DESC
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// Get PO lines for dropdowns
router.get('/purchase-orders/:headerId/lines', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT line_id, line_number, item_name, quantity, quantity_remaining, unit_price 
      FROM po_lines 
      WHERE header_id = ? AND quantity_remaining > 0 
      ORDER BY line_number
    `, [req.params.headerId]);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching PO lines:', error);
    res.status(500).json({ error: 'Failed to fetch PO lines' });
  }
});

// Get procurement categories
router.get('/categories', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT category_id, category_code, category_name, description 
      FROM po_categories 
      WHERE is_active = TRUE 
      ORDER BY category_name
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get procurement items
router.get('/items', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(`
      SELECT item_id, item_code, item_name, description, category_id, uom, standard_price 
      FROM po_items 
      WHERE is_active = TRUE 
      ORDER BY item_name
    `);
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

export default router;
