import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.execute(`
      SELECT 
        ii.*,
        s.supplier_name,
        s.supplier_number,
        COALESCE(SUM(bc.current_stock), 0) as quantity
      FROM inventory_items ii
      LEFT JOIN ap_suppliers s ON ii.brand = s.supplier_id
      LEFT JOIN bin_cards bc ON ii.item_code = bc.item_code
      GROUP BY ii.id, ii.item_code, ii.item_name, ii.description, ii.category, 
               ii.location, ii.brand, ii.barcode, 
               ii.item_purchase_rate, ii.item_sell_price, ii.tax_status,
               ii.box_quantity, ii.uom_type, ii.uom_type_detail,
               ii.income_account_segment_id, ii.cogs_account_segment_id,
               ii.inventory_account_segment_id, ii.created_at, ii.updated_at,
               s.supplier_name, s.supplier_number
      ORDER BY ii.created_at DESC
    `);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get single inventory item by id
router.get('/:id', async (req, res) => {
  try {
    const [items] = await pool.execute(`
      SELECT 
        ii.*,
        s.supplier_name,
        s.supplier_number
      FROM inventory_items ii
      LEFT JOIN ap_suppliers s ON ii.brand = s.supplier_id
      WHERE ii.id = ?
    `, [req.params.id]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new inventory item
router.post('/', async (req, res) => {
  try {
    const {
      item_code, item_name, description, category, location,
      brand, barcode, item_purchase_rate, item_sell_price, tax_status,
      uom_type, box_quantity, uom_type_detail,
      income_account_segment_id,
      cogs_account_segment_id,
      inventory_account_segment_id
    } = req.body;
    if (!item_code || !item_name) {
      return res.status(400).json({ success: false, message: 'Item code and name are required' });
    }
    await pool.execute(
      `INSERT INTO inventory_items (
        item_code, item_name, description, category, location,
        brand, barcode, item_purchase_rate, item_sell_price, tax_status,
        uom_type, box_quantity, uom_type_detail,
        income_account_segment_id, cogs_account_segment_id, inventory_account_segment_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item_code, item_name, description, category, location,
        brand || null, barcode, item_purchase_rate || 0, item_sell_price || 0, tax_status,
        uom_type, box_quantity || 0, uom_type_detail || 0,
        income_account_segment_id || null,
        cogs_account_segment_id || null,
        inventory_account_segment_id || null
      ]
    );
    res.status(201).json({ success: true, message: 'Inventory item created successfully' });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update inventory item
router.put('/:id', async (req, res) => {
  try {
    const {
      item_code, item_name, description, category, location,
      brand, barcode, item_purchase_rate, item_sell_price, tax_status,
      uom_type, box_quantity, uom_type_detail,
      income_account_segment_id,
      cogs_account_segment_id,
      inventory_account_segment_id
    } = req.body;
    
    if (!item_code || !item_name) {
      return res.status(400).json({ success: false, message: 'Item code and name are required' });
    }
    
    const [result] = await pool.execute(
      `UPDATE inventory_items SET 
        item_code = ?, item_name = ?, description = ?, category = ?, 
        location = ?, brand = ?, barcode = ?,
        item_purchase_rate = ?, item_sell_price = ?, tax_status = ?,
        uom_type = ?, box_quantity = ?, uom_type_detail = ?,
        income_account_segment_id = ?, cogs_account_segment_id = ?, inventory_account_segment_id = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        item_code, item_name, description, category, location,
        brand || null, barcode, item_purchase_rate || 0, item_sell_price || 0, tax_status,
        uom_type, box_quantity || 0, uom_type_detail || 0,
        income_account_segment_id || null,
        cogs_account_segment_id || null,
        inventory_account_segment_id || null,
        req.params.id
      ]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, message: 'Inventory item updated successfully' });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete inventory item
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    res.json({ success: true, message: 'Inventory item deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router; 