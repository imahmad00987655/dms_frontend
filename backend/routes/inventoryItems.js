import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all inventory items
router.get('/', async (req, res) => {
  try {
    const [items] = await pool.execute('SELECT * FROM inventory_items ORDER BY created_at DESC');
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get single inventory item by id
router.get('/:id', async (req, res) => {
  try {
    const [items] = await pool.execute('SELECT * FROM inventory_items WHERE id = ?', [req.params.id]);
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
      item_code, item_name, description, category, quantity, unit_price, location
    } = req.body;
    if (!item_code || !item_name) {
      return res.status(400).json({ success: false, message: 'Item code and name are required' });
    }
    await pool.execute(
      `INSERT INTO inventory_items (item_code, item_name, description, category, quantity, unit_price, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item_code, item_name, description, category, quantity || 0, unit_price || 0, location]
    );
    res.status(201).json({ success: true, message: 'Inventory item created successfully' });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router; 