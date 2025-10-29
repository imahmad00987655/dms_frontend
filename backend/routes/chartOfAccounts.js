import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// ============================================================================
// COA SEGMENTS ROUTES
// ============================================================================

// Get all CoA segments
router.get('/segments', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM coa_segments WHERE status = "ACTIVE" ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching CoA segments:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get a specific CoA by ID
router.get('/segments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      'SELECT * FROM coa_segments WHERE id = ?',
      [id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error('Error fetching CoA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new CoA with 5 segments
router.post('/segments', async (req, res) => {
  try {
    const { 
      coa_name, 
      description,
      segment_1_name,
      segment_1_value,
      segment_2_name,
      segment_2_value,
      segment_3_name,
      segment_3_value,
      segment_4_name,
      segment_4_value,
      segment_5_name,
      segment_5_value,
      segment_length,
      created_by
    } = req.body;
    
    const [result] = await pool.execute(
      `INSERT INTO coa_segments (
        coa_name, description,
        segment_1_name, segment_1_value,
        segment_2_name, segment_2_value,
        segment_3_name, segment_3_value,
        segment_4_name, segment_4_value,
        segment_5_name, segment_5_value,
        segment_length, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        coa_name,
        description || null,
        segment_1_name || null,
        segment_1_value || '00000',
        segment_2_name || null,
        segment_2_value || '00000',
        segment_3_name || null,
        segment_3_value || '00000',
        segment_4_name || null,
        segment_4_value || '00000',
        segment_5_name || null,
        segment_5_value || '00000',
        segment_length || 5,
        created_by || 1
      ]
    );
    
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    console.error('Error creating CoA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update a CoA
router.put('/segments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      coa_name,
      description,
      segment_1_name,
      segment_1_value,
      segment_2_name,
      segment_2_value,
      segment_3_name,
      segment_3_value,
      segment_4_name,
      segment_4_value,
      segment_5_name,
      segment_5_value,
      segment_length,
      status
    } = req.body;
    
    // Convert undefined to null for all parameters to avoid SQL errors
    // Build the base parameters array (without status and id)
    const baseParams = [
      coa_name ?? null,
      description ?? null,
      segment_1_name ?? null,
      segment_1_value ?? '00000',
      segment_2_name ?? null,
      segment_2_value ?? '00000',
      segment_3_name ?? null,
      segment_3_value ?? '00000',
      segment_4_name ?? null,
      segment_4_value ?? '00000',
      segment_5_name ?? null,
      segment_5_value ?? '00000',
      segment_length ?? 5
    ];
    
    // Build query - always include the base fields
    let query = `UPDATE coa_segments SET 
      coa_name = ?, description = ?,
      segment_1_name = ?, segment_1_value = ?,
      segment_2_name = ?, segment_2_value = ?,
      segment_3_name = ?, segment_3_value = ?,
      segment_4_name = ?, segment_4_value = ?,
      segment_5_name = ?, segment_5_value = ?,
      segment_length = ?`;
    
    // Build queryParams array starting with base params
    const queryParams = [...baseParams];
    
    // Only update status if it's provided (not null and not undefined)
    if (status !== null && status !== undefined) {
      query += ', status = ?';
      queryParams.push(status);
    }
    
    // Always add id at the end
    query += ' WHERE id = ?';
    queryParams.push(id);
    
    await pool.execute(query, queryParams);
    
    res.json({ success: true, message: 'CoA updated successfully' });
  } catch (error) {
    console.error('Error updating CoA:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a CoA
router.delete('/segments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE coa_segments SET status = "INACTIVE" WHERE id = ?', [id]);
    res.json({ success: true, message: 'CoA deleted successfully' });
  } catch (error) {
    console.error('Error deleting CoA:', error);
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
          'INSERT INTO coa_segment_instances (coa_instance_id, segment_name, segment_length, display_order) VALUES (?, ?, ?, ?)',
          [coaInstanceId, segment.name, segment.length, segment.display_order || 0]
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
