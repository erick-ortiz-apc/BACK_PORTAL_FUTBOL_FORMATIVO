const { Router } = require('express');
const { pool } = require('../../config/db');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page         = Math.max(1, parseInt(req.query.page)  || 1);
    const limit        = Math.min(50, parseInt(req.query.limit) || 9);
    const offset       = (page - 1) * limit;
    const region       = req.query.region        || '';
    const commune      = req.query.commune       || '';
    const busqueda     = req.query.busqueda      || '';
    const rango        = req.query.rango         || '';
    const gender       = req.query.gender_target || '';
    const orden        = req.query.orden         || 'recientes';

    const conditions = [`ps.code = 'activa'`];
    const params = [];

    if (region)   { conditions.push('r.name = ?');   params.push(region); }
    if (commune)  { conditions.push('c.name = ?');   params.push(commune); }
    if (gender)   { conditions.push('p.gender_target = ?'); params.push(gender); }

    if (busqueda) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ? OR c.name LIKE ?)');
      const like = `%${busqueda}%`;
      params.push(like, like, like);
    }

    if (rango) {
      if (rango === '18+') {
        conditions.push(`EXISTS (
          SELECT 1 FROM publication_ages pa2
          JOIN ages a2 ON pa2.age_id = a2.id
          WHERE pa2.publication_id = p.id AND a2.code = '18_plus'
        )`);
      } else {
        const parts = rango.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          conditions.push(`EXISTS (
            SELECT 1 FROM publication_ages pa2
            JOIN ages a2 ON pa2.age_id = a2.id
            WHERE pa2.publication_id = p.id
              AND a2.code != '18_plus'
              AND CAST(a2.code AS UNSIGNED) BETWEEN ? AND ?
          )`);
          params.push(parts[0], parts[1]);
        }
      }
    }

    const where = conditions.join(' AND ');

    const orderMap = {
      'az':        'p.title ASC',
      'za':        'p.title DESC',
      'recientes': 'p.created_at DESC',
      'antiguos':  'p.created_at ASC',
    };
    const orderBy = orderMap[orden] || 'p.created_at DESC';

    // Count query (sin GROUP BY necesita subquery para contar correctamente)
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM publications p
       JOIN publishers pub ON p.publisher_id = pub.id
       JOIN organizations o ON p.organization_id = o.id
       JOIN organization_types ot ON o.organization_type_id = ot.id
       LEFT JOIN venues v ON p.venue_id = v.id
       LEFT JOIN regions r ON v.region_id = r.id
       LEFT JOIN communes c ON v.commune_id = c.id
       JOIN publication_statuses ps ON p.status_id = ps.id
       WHERE ${where}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.description, p.contact_phone, p.contact_email,
              p.price_amount, p.gender_target, p.image_url, p.created_at,
              ps.code AS status_code,
              pub.display_name AS publisher_name, pub.profile_image_url AS publisher_photo,
              o.name AS org_name, ot.label AS org_type_label,
              v.address_line, r.name AS region_name, c.name AS commune_name,
              v.latitude, v.longitude,
              GROUP_CONCAT(DISTINCT CONCAT(w.label, ' ', tss.slot_label, '-', tse.slot_label)
                           ORDER BY w.sort_order, tss.slot_time SEPARATOR ' | ') AS schedule,
              GROUP_CONCAT(DISTINCT a.label ORDER BY a.sort_order) AS ages
       FROM publications p
       JOIN publishers pub ON p.publisher_id = pub.id
       JOIN organizations o ON p.organization_id = o.id
       JOIN organization_types ot ON o.organization_type_id = ot.id
       LEFT JOIN venues v ON p.venue_id = v.id
       LEFT JOIN regions r ON v.region_id = r.id
       LEFT JOIN communes c ON v.commune_id = c.id
       JOIN publication_statuses ps ON p.status_id = ps.id
       LEFT JOIN publication_ages pa ON pa.publication_id = p.id
       LEFT JOIN ages a ON pa.age_id = a.id
       LEFT JOIN publication_time_slots pts ON pts.publication_id = p.id
       LEFT JOIN weekdays w ON pts.weekday_id = w.id
       LEFT JOIN time_slots tss ON pts.start_time_slot_id = tss.id
       LEFT JOIN time_slots tse ON pts.end_time_slot_id = tse.id
       WHERE ${where}
       GROUP BY p.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Fetch social links for returned publications
    let data = rows;
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      const [socialRows] = await pool.query(
        `SELECT publication_id, code, link FROM publication_social_links WHERE publication_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const socialMap = {};
      for (const sl of socialRows) {
        if (!socialMap[sl.publication_id]) socialMap[sl.publication_id] = [];
        socialMap[sl.publication_id].push({ code: sl.code, link: sl.link });
      }
      data = rows.map(r => ({ ...r, social_links: socialMap[r.id] || [] }));
    }

    res.json({
      data,
      total: Number(total),
      page,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
      limit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /:id/view — registra visualización anónima
router.post('/:id/view', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });
    const ua = (req.headers['user-agent'] || '').substring(0, 500);
    await pool.query(
      'INSERT INTO publication_views (publication_id, user_agent) VALUES (?, ?)',
      [id, ua]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /:id/contacto — registra intento de contacto anónimo
router.post('/:id/contacto', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });
    const method = ['telefono', 'whatsapp', 'email'].includes(req.body.tipo)
      ? req.body.tipo
      : 'telefono';
    await pool.query(
      'INSERT INTO contact_attempts (publication_id, method) VALUES (?, ?)',
      [id, method]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /:id/social-click — registra clic en link de red social
router.post('/:id/social-click', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });
    const allowed = ['instagram', 'facebook', 'whatsapp', 'website'];
    const code = allowed.includes(req.body.code) ? req.body.code : null;
    if (!code) return res.status(400).json({ message: 'Código inválido' });
    const ua = (req.headers['user-agent'] || '').substring(0, 500);
    await pool.query(
      'INSERT INTO social_link_clicks (publication_id, code, user_agent) VALUES (?, ?, ?)',
      [id, code, ua]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
