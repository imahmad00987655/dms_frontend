import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// ============================================================================
// COA SEGMENTS ROUTES
// ============================================================================

// Get all segments
router.get('/segments', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM coa_segments WHERE is_active = TRUE ORDER BY display_order'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a segment
router.post('/segments', async (req, res) => {
  try {
    const { segment_name, segment_length, value_set_name, display_order } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO coa_segments (segment_name, segment_length, value_set_name, display_order) VALUES (?, ?, ?, ?)',
      [segment_name, segment_length, value_set_name || null, display_order || 0]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error creating segment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a segment
router.put('/segments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { segment_name, segment_length, value_set_name, display_order } = req.body;
    
    await pool.execute(
      'UPDATE coa_segments SET segment_name = ?, segment_length = ?, value_set_name = ?, display_order = ? WHERE id = ?',
      [segment_name, segment_length, value_set_name || null, display_order || 0, id]
    );
    
    res.json({ success: true, message: 'Segment updated successfully' });
  } catch (error) {
    console.error('Error updating segment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a segment
router.delete('/segments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE coa_segments SET is_active = FALSE WHERE id = ?', [id]);
    res.json({ success: true, message: 'Segment deleted successfully' });
  } catch (error) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// VALUE SETS ROUTES
// ============================================================================

// Get all value sets
router.get('/value-sets', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM coa_value_sets WHERE is_active = TRUE ORDER BY value_set_name'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching value sets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get value set with values
router.get('/value-sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [valueSet] = await pool.execute('SELECT * FROM coa_value_sets WHERE id = ?', [id]);
    const [values] = await pool.execute(
      'SELECT * FROM coa_value_set_values WHERE value_set_id = ? AND is_active = TRUE ORDER BY display_order',
      [id]
    );
    
    res.json({ success: true, data: { ...valueSet[0], values } });
  } catch (error) {
    console.error('Error fetching value set:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a value set
router.post('/value-sets', async (req, res) => {
  try {
    const { value_set_name, value_set_type, description } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO coa_value_sets (value_set_name, value_set_type, description) VALUES (?, ?, ?)',
      [value_set_name, value_set_type, description || null]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error creating value set:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add value to value set
router.post('/value-sets/:id/values', async (req, res) => {
  try {
    const { id } = req.params;
    const { value_code, value_description, display_order } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO coa_value_set_values (value_set_id, value_code, value_description, display_order) VALUES (?, ?, ?, ?)',
      [id, value_code, value_description, display_order || 0]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error adding value:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// COA INSTANCES ROUTES
// ============================================================================

// Get all CoA instances
router.get('/instances', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM coa_instances WHERE status = "ACTIVE" ORDER BY coa_name'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching CoA instances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get CoA instance with segments
router.get('/instances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [coa] = await pool.execute('SELECT * FROM coa_instances WHERE id = ?', [id]);
    const [segments] = await pool.execute(
      'SELECT * FROM coa_segment_instances WHERE coa_instance_id = ? ORDER BY display_order',
      [id]
    );
    
    res.json({ success: true, data: { ...coa[0], segments } });
  } catch (error) {
    console.error('Error fetching CoA instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a CoA instance
router.post('/instances', async (req, res) => {
  try {
    const { coa_code, coa_name, description, segments } = req.body;
    
    // Create CoA instance
    const [result] = await pool.execute(
      'INSERT INTO coa_instances (coa_code, coa_name, description, created_by) VALUES (?, ?, ?, ?)',
      [coa_code, coa_name, description || null, req.body.created_by || 1]
    );
    
    const coaInstanceId = result.insertId;
    
    // Add segments
    if (segments && segments.length > 0) {
      for (const segment of segments) {
        await pool.execute(
          'INSERT INTO coa_segment_instances (coa_instance_id, segment_name, segment_length, value_set_name, display_order) VALUES (?, ?, ?, ?, ?)',
          [coaInstanceId, segment.name, segment.length, segment.valueSet || null, segment.display_order || 0]
        );
      }
    }
    
    res.json({ success: true, data: { id: coaInstanceId, coa_code, coa_name, description } });
  } catch (error) {
    console.error('Error creating CoA instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// LEDGER CONFIGURATIONS ROUTES
// ============================================================================

// Get all ledger configurations
router.get('/ledgers', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT lc.*, ci.coa_code, ci.coa_name 
       FROM ledger_configurations lc 
       LEFT JOIN coa_instances ci ON lc.coa_instance_id = ci.id 
       WHERE lc.status = "ACTIVE" 
       ORDER BY lc.ledger_name`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a ledger configuration
router.post('/ledgers', async (req, res) => {
  try {
    const { ledger_name, ledger_type, currency, coa_instance_id, accounting_method, ar_ap_enabled } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO ledger_configurations (ledger_name, ledger_type, currency, coa_instance_id, accounting_method, ar_ap_enabled, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ledger_name, ledger_type, currency, coa_instance_id, accounting_method, ar_ap_enabled || true, req.body.created_by || 1]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error creating ledger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a ledger configuration
router.put('/ledgers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ledger_name, ledger_type, currency, accounting_method, ar_ap_enabled } = req.body;
    
    await pool.execute(
      'UPDATE ledger_configurations SET ledger_name = ?, ledger_type = ?, currency = ?, accounting_method = ?, ar_ap_enabled = ? WHERE id = ?',
      [ledger_name, ledger_type, currency, accounting_method, ar_ap_enabled, id]
    );
    
    res.json({ success: true, message: 'Ledger updated successfully' });
  } catch (error) {
    console.error('Error updating ledger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a ledger configuration
router.delete('/ledgers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE ledger_configurations SET status = "INACTIVE" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Ledger deleted successfully' });
  } catch (error) {
    console.error('Error deleting ledger:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HEADER ASSIGNMENTS ROUTES
// ============================================================================

// Get all header assignments for a ledger
router.get('/ledgers/:ledgerId/header-assignments', async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM ledger_header_assignments WHERE ledger_id = ? AND is_active = TRUE',
      [ledgerId]
    );
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching header assignments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a header assignment
router.post('/ledgers/:ledgerId/header-assignments', async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const { header_name, module_type, validation_rules } = req.body;
    
    const [result] = await pool.execute(
      'INSERT INTO ledger_header_assignments (ledger_id, header_name, module_type, validation_rules, created_by) VALUES (?, ?, ?, ?, ?)',
      [ledgerId, header_name, module_type, JSON.stringify(validation_rules || {}), req.body.created_by || 1]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error creating header assignment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
