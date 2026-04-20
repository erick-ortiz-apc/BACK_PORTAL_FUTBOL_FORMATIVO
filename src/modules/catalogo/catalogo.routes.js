const { Router } = require('express');
const { pool } = require('../../config/db');

const router = Router();

router.get('/regiones', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM regions ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/comunas', async (req, res) => {
  try {
    const { region_id } = req.query;
    if (!region_id) return res.status(400).json({ message: 'region_id es requerido' });
    const [rows] = await pool.query(
      'SELECT id, name FROM communes WHERE region_id = ? ORDER BY name',
      [region_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/edades', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, code, label FROM ages ORDER BY sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/weekdays', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, code, label FROM weekdays ORDER BY sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/time-slots', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, slot_label FROM time_slots ORDER BY slot_time');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/org-types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, code, label FROM organization_types ORDER BY label');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
