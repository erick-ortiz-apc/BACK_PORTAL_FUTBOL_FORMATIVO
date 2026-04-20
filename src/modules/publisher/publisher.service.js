const { pool } = require('../../config/db');
const notifications = require('../notifications/notifications.service');

async function _getPublisherSummary(publisherId) {
  const [rows] = await pool.query(
    'SELECT id, display_name, email FROM publishers WHERE id = ?',
    [publisherId]
  );
  return rows[0] || null;
}

// ─── PERFIL ──────────────────────────────────────────────────────────────────

async function getMiPerfil(publisherId) {
  const [rows] = await pool.query(
    `SELECT p.id, p.display_name, p.email, p.profile_image_url, p.is_email_verified,
            ps.code AS status_code, p.created_at
     FROM publishers p
     JOIN publisher_statuses ps ON p.status_id = ps.id
     WHERE p.id = ?`,
    [publisherId]
  );
  if (!rows[0]) {
    const err = new Error('Publisher no encontrado');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function editarPerfil(publisherId, data) {
  const { display_name } = data;
  await pool.query(
    'UPDATE publishers SET display_name = ? WHERE id = ?',
    [display_name, publisherId]
  );
  return getMiPerfil(publisherId);
}

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────

async function getOrganization(publisherId) {
  const [rows] = await pool.query(
    `SELECT o.*, ot.label AS org_type_label
     FROM organizations o
     JOIN organization_types ot ON o.organization_type_id = ot.id
     WHERE o.publisher_id = ?
     LIMIT 1`,
    [publisherId]
  );
  return rows[0] || null;
}

async function createOrganization(publisherId, data) {
  const existing = await getOrganization(publisherId);
  if (existing) {
    const err = new Error('Ya tienes una organización registrada');
    err.status = 409;
    throw err;
  }
  const { organization_type_id, name, description, contact_phone, contact_email } = data;
  const [result] = await pool.query(
    `INSERT INTO organizations (publisher_id, organization_type_id, name, description, contact_phone, contact_email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [publisherId, organization_type_id, name, description || null, contact_phone || null, contact_email || null]
  );
  return getOrganizationById(result.insertId);
}

async function updateOrganization(publisherId, orgId, data) {
  const [rows] = await pool.query(
    'SELECT id FROM organizations WHERE id = ? AND publisher_id = ?',
    [orgId, publisherId]
  );
  if (!rows[0]) {
    const err = new Error('Organización no encontrada');
    err.status = 404;
    throw err;
  }
  const { organization_type_id, name, description, contact_phone, contact_email } = data;
  await pool.query(
    `UPDATE organizations SET organization_type_id = ?, name = ?, description = ?, contact_phone = ?, contact_email = ?
     WHERE id = ?`,
    [organization_type_id, name, description || null, contact_phone || null, contact_email || null, orgId]
  );
  return getOrganizationById(orgId);
}

async function getOrganizationById(orgId) {
  const [rows] = await pool.query(
    `SELECT o.*, ot.label AS org_type_label
     FROM organizations o
     JOIN organization_types ot ON o.organization_type_id = ot.id
     WHERE o.id = ?`,
    [orgId]
  );
  return rows[0] || null;
}

// ─── VENUE ────────────────────────────────────────────────────────────────────

async function getVenue(orgId) {
  const [rows] = await pool.query(
    `SELECT v.*, r.name AS region_name, c.name AS commune_name
     FROM venues v
     JOIN regions r ON v.region_id = r.id
     JOIN communes c ON v.commune_id = c.id
     WHERE v.organization_id = ?
     LIMIT 1`,
    [orgId]
  );
  return rows[0] || null;
}

async function createVenue(orgId, data) {
  const { region_id, commune_id, name, address_line, latitude, longitude } = data;
  const [result] = await pool.query(
    `INSERT INTO venues (organization_id, region_id, commune_id, name, address_line, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [orgId, region_id, commune_id, name, address_line || null, latitude || null, longitude || null]
  );
  return getVenueById(result.insertId);
}

async function updateVenue(orgId, venueId, data) {
  const [rows] = await pool.query(
    'SELECT id FROM venues WHERE id = ? AND organization_id = ?',
    [venueId, orgId]
  );
  if (!rows[0]) {
    const err = new Error('Sede no encontrada');
    err.status = 404;
    throw err;
  }
  const { region_id, commune_id, name, address_line, latitude, longitude } = data;
  await pool.query(
    `UPDATE venues SET region_id = ?, commune_id = ?, name = ?, address_line = ?, latitude = ?, longitude = ?
     WHERE id = ?`,
    [region_id, commune_id, name, address_line || null, latitude || null, longitude || null, venueId]
  );
  return getVenueById(venueId);
}

async function getVenueById(venueId) {
  const [rows] = await pool.query(
    `SELECT v.*, r.name AS region_name, c.name AS commune_name
     FROM venues v
     JOIN regions r ON v.region_id = r.id
     JOIN communes c ON v.commune_id = c.id
     WHERE v.id = ?`,
    [venueId]
  );
  return rows[0] || null;
}

// ─── PUBLICATION ──────────────────────────────────────────────────────────────

async function getMiPublicacion(publisherId) {
  const [rows] = await pool.query(
    `SELECT p.*, ps.code AS status_code,
            o.name AS org_name, ot.label AS org_type_label,
            v.address_line, r.name AS region_name, c.name AS commune_name,
            v.latitude, v.longitude
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     JOIN organizations o ON p.organization_id = o.id
     JOIN organization_types ot ON o.organization_type_id = ot.id
     LEFT JOIN venues v ON p.venue_id = v.id
     LEFT JOIN regions r ON v.region_id = r.id
     LEFT JOIN communes c ON v.commune_id = c.id
     WHERE p.publisher_id = ?
     LIMIT 1`,
    [publisherId]
  );
  if (!rows[0]) return null;

  const pub = rows[0];

  // Ages
  const [ages] = await pool.query(
    `SELECT pa.age_id, a.code, a.label
     FROM publication_ages pa
     JOIN ages a ON pa.age_id = a.id
     WHERE pa.publication_id = ?
     ORDER BY a.sort_order`,
    [pub.id]
  );

  // Time slots
  const [timeSlots] = await pool.query(
    `SELECT pts.id, pts.weekday_id, w.label AS weekday_label,
            tss.slot_label AS start_slot_label, tse.slot_label AS end_slot_label
     FROM publication_time_slots pts
     JOIN weekdays w ON pts.weekday_id = w.id
     JOIN time_slots tss ON pts.start_time_slot_id = tss.id
     JOIN time_slots tse ON pts.end_time_slot_id = tse.id
     WHERE pts.publication_id = ?
     ORDER BY w.sort_order, tss.slot_time`,
    [pub.id]
  );

  // Social links
  const [socialLinks] = await pool.query(
    'SELECT id, code, link FROM publication_social_links WHERE publication_id = ?',
    [pub.id]
  );

  pub.publication_ages = ages;
  pub.publication_time_slots = timeSlots;
  pub.social_links = socialLinks;

  return pub;
}

async function crearPublicacion(publisherId, data) {
  const [existing] = await pool.query(
    'SELECT id FROM publications WHERE publisher_id = ?', [publisherId]
  );
  if (existing.length > 0) {
    const err = new Error('Ya tienes una publicación. Edítala en lugar de crear una nueva.');
    err.status = 409;
    throw err;
  }

  const { organization_id, venue_id, title, description, contact_phone, contact_email,
          price_amount, gender_target, age_ids, time_slots: slots, social_links } = data;

  // Status inicial: en_revision (id=1 según seed)
  const [[statusRow]] = await pool.query(
    "SELECT id FROM publication_statuses WHERE code = 'en_revision'", []
  );
  const statusId = statusRow ? statusRow.id : 1;

  const [result] = await pool.query(
    `INSERT INTO publications
      (publisher_id, organization_id, venue_id, status_id, title, description,
       contact_phone, contact_email, price_amount, gender_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [publisherId, organization_id, venue_id || null, statusId, title, description || null,
     contact_phone || null, contact_email || null,
     price_amount != null ? price_amount : null,
     gender_target || 'mixto']
  );

  const pubId = result.insertId;
  await _saveAges(pubId, age_ids);
  await _saveTimeSlots(pubId, slots);
  await _saveSocialLinks(pubId, social_links);

  const pub = await getMiPublicacion(publisherId);
  const publisher = await _getPublisherSummary(publisherId);
  if (publisher && pub) {
    notifications.notifyNewPublication({ publisher, publication: pub })
      .catch(err => console.error('[notify] new publication:', err.message));
  }
  return pub;
}

async function editarPublicacion(publisherId, pubId, data) {
  const [rows] = await pool.query(
    `SELECT p.id, ps.code AS previous_status_code
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     WHERE p.id = ? AND p.publisher_id = ?`,
    [pubId, publisherId]
  );
  if (!rows[0]) {
    const err = new Error('Publicación no encontrada o no te pertenece');
    err.status = 404;
    throw err;
  }
  const previousStatusCode = rows[0].previous_status_code;

  const { venue_id, title, description, contact_phone, contact_email,
          price_amount, gender_target, age_ids, time_slots: slots, social_links } = data;

  // Al editar vuelve a en_revision
  const [[statusRow]] = await pool.query(
    "SELECT id FROM publication_statuses WHERE code = 'en_revision'", []
  );
  const statusId = statusRow ? statusRow.id : 1;

  await pool.query(
    `UPDATE publications SET
      venue_id = ?, status_id = ?, title = ?, description = ?,
      contact_phone = ?, contact_email = ?, price_amount = ?, gender_target = ?
     WHERE id = ?`,
    [venue_id || null, statusId, title, description || null,
     contact_phone || null, contact_email || null,
     price_amount != null ? price_amount : null,
     gender_target || 'mixto', pubId]
  );

  await _saveAges(pubId, age_ids);
  await _saveTimeSlots(pubId, slots);
  await _saveSocialLinks(pubId, social_links);

  const pub = await getMiPublicacion(publisherId);
  if (previousStatusCode && previousStatusCode !== 'en_revision') {
    const publisher = await _getPublisherSummary(publisherId);
    if (publisher && pub) {
      notifications.notifyPublicationEdited({ publisher, publication: pub })
        .catch(err => console.error('[notify] edited:', err.message));
    }
  }
  return pub;
}

async function cambiarEstadoPublicacion(publisherId, pubId, statusCode) {
  const estadosPermitidos = ['activa', 'inactiva'];
  if (!estadosPermitidos.includes(statusCode)) {
    const err = new Error(`Estado inválido. Valores permitidos: ${estadosPermitidos.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const [rows] = await pool.query(
    'SELECT id FROM publications WHERE id = ? AND publisher_id = ?', [pubId, publisherId]
  );
  if (!rows[0]) {
    const err = new Error('Publicación no encontrada o no te pertenece');
    err.status = 404;
    throw err;
  }
  const [[statusRow]] = await pool.query(
    'SELECT id FROM publication_statuses WHERE code = ?', [statusCode]
  );
  await pool.query(
    'UPDATE publications SET status_id = ? WHERE id = ?',
    [statusRow.id, pubId]
  );
  return getMiPublicacion(publisherId);
}

async function eliminarPublicacion(publisherId, pubId) {
  const [rows] = await pool.query(
    'SELECT id FROM publications WHERE id = ? AND publisher_id = ?', [pubId, publisherId]
  );
  if (!rows[0]) {
    const err = new Error('Publicación no encontrada o no te pertenece');
    err.status = 404;
    throw err;
  }
  await pool.query('DELETE FROM publications WHERE id = ?', [pubId]);
}

// ─── STATS ────────────────────────────────────────────────────────────────────

async function getStats(publisherId) {
  const [[pub]] = await pool.query(
    'SELECT id FROM publications WHERE publisher_id = ?', [publisherId]
  );
  if (!pub) {
    return {
      vistas: 0, contactos: 0, redes: 0,
      vistas30: 0, contactos30: 0, redes30: 0,
      redes_por_tipo: {},
    };
  }

  const [[{ vistas }]] = await pool.query(
    'SELECT COUNT(*) AS vistas FROM publication_views WHERE publication_id = ?', [pub.id]
  );
  const [[{ contactos }]] = await pool.query(
    'SELECT COUNT(*) AS contactos FROM contact_attempts WHERE publication_id = ?', [pub.id]
  );
  const [[{ redes }]] = await pool.query(
    'SELECT COUNT(*) AS redes FROM social_link_clicks WHERE publication_id = ?', [pub.id]
  );
  const [[{ vistas30 }]] = await pool.query(
    'SELECT COUNT(*) AS vistas30 FROM publication_views WHERE publication_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', [pub.id]
  );
  const [[{ contactos30 }]] = await pool.query(
    'SELECT COUNT(*) AS contactos30 FROM contact_attempts WHERE publication_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', [pub.id]
  );
  const [[{ redes30 }]] = await pool.query(
    'SELECT COUNT(*) AS redes30 FROM social_link_clicks WHERE publication_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', [pub.id]
  );
  const [breakdownRows] = await pool.query(
    'SELECT code, COUNT(*) AS total FROM social_link_clicks WHERE publication_id = ? GROUP BY code',
    [pub.id]
  );
  const redes_por_tipo = {};
  for (const row of breakdownRows) redes_por_tipo[row.code] = Number(row.total);

  return {
    vistas: Number(vistas), contactos: Number(contactos), redes: Number(redes),
    vistas30: Number(vistas30), contactos30: Number(contactos30), redes30: Number(redes30),
    redes_por_tipo,
  };
}

async function getStatsTimeseries(publisherId, days) {
  const [[pub]] = await pool.query(
    'SELECT id FROM publications WHERE publisher_id = ?', [publisherId]
  );
  if (!pub) return [];

  const safeDays = Math.max(1, Math.min(365, parseInt(days) || 30));

  const [rows] = await pool.query(
    `WITH RECURSIVE date_range AS (
       SELECT DATE_SUB(CURDATE(), INTERVAL (? - 1) DAY) AS date
       UNION ALL
       SELECT DATE_ADD(date, INTERVAL 1 DAY) FROM date_range WHERE date < CURDATE()
     )
     SELECT d.date,
            COALESCE(v.total, 0) AS vistas,
            COALESCE(c.total, 0) AS contactos,
            COALESCE(r.total, 0) AS redes
     FROM date_range d
     LEFT JOIN (
       SELECT DATE(created_at) AS date, COUNT(*) AS total
       FROM publication_views WHERE publication_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
     ) v ON v.date = d.date
     LEFT JOIN (
       SELECT DATE(created_at) AS date, COUNT(*) AS total
       FROM contact_attempts WHERE publication_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
     ) c ON c.date = d.date
     LEFT JOIN (
       SELECT DATE(created_at) AS date, COUNT(*) AS total
       FROM social_link_clicks WHERE publication_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
     ) r ON r.date = d.date
     ORDER BY d.date ASC`,
    [safeDays, pub.id, safeDays, pub.id, safeDays, pub.id, safeDays]
  );

  return rows.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    vistas: Number(r.vistas),
    contactos: Number(r.contactos),
    redes: Number(r.redes),
  }));
}

async function getStatsDetalle(publisherId, tipo, page, limit) {
  const [[pub]] = await pool.query(
    'SELECT id FROM publications WHERE publisher_id = ?', [publisherId]
  );
  if (!pub) return { data: [], total: 0, page, limit };

  const tablaMap = {
    contactos: 'contact_attempts',
    redes_sociales: 'social_link_clicks',
    visualizaciones: 'publication_views',
  };
  const tabla = tablaMap[tipo] || 'publication_views';
  const offset = (page - 1) * limit;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${tabla} WHERE publication_id = ?`, [pub.id]
  );
  const [rows] = await pool.query(
    `SELECT * FROM ${tabla} WHERE publication_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [pub.id, limit, offset]
  );
  return { data: rows, total: Number(total), page, limit };
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function _saveAges(pubId, ageIds) {
  await pool.query('DELETE FROM publication_ages WHERE publication_id = ?', [pubId]);
  if (Array.isArray(ageIds) && ageIds.length > 0) {
    const values = ageIds.map(id => [pubId, id]);
    await pool.query('INSERT INTO publication_ages (publication_id, age_id) VALUES ?', [values]);
  }
}

async function _saveTimeSlots(pubId, slots) {
  if (Array.isArray(slots)) {
    for (const slot of slots) {
      if (!slot) continue;
      const { weekday_id, start_slot_label, end_slot_label } = slot;
      if (!weekday_id || !start_slot_label || !end_slot_label) {
        const err = new Error('Cada horario debe tener día, hora inicio y hora término.');
        err.status = 400;
        throw err;
      }
    }
  }
  await pool.query('DELETE FROM publication_time_slots WHERE publication_id = ?', [pubId]);
  if (!Array.isArray(slots) || slots.length === 0) return;

  for (const slot of slots) {
    const { weekday_id, start_slot_label, end_slot_label } = slot;
    const [[startRow]] = await pool.query(
      'SELECT id FROM time_slots WHERE slot_label = ?', [start_slot_label]
    );
    const [[endRow]] = await pool.query(
      'SELECT id FROM time_slots WHERE slot_label = ?', [end_slot_label]
    );
    if (!startRow || !endRow) continue;
    await pool.query(
      `INSERT IGNORE INTO publication_time_slots
         (publication_id, weekday_id, start_time_slot_id, end_time_slot_id)
       VALUES (?, ?, ?, ?)`,
      [pubId, weekday_id, startRow.id, endRow.id]
    );
  }
}

async function _saveSocialLinks(pubId, links) {
  await pool.query('DELETE FROM publication_social_links WHERE publication_id = ?', [pubId]);
  if (!Array.isArray(links) || links.length === 0) return;
  const validLinks = links.filter(l => l.code && l.link && l.link.trim());
  if (validLinks.length === 0) return;
  for (const link of validLinks) {
    await pool.query(
      `INSERT INTO publication_social_links (publication_id, code, link)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE link = VALUES(link)`,
      [pubId, link.code, link.link.trim()]
    );
  }
}

module.exports = {
  getMiPerfil, editarPerfil,
  getOrganization, createOrganization, updateOrganization,
  getVenue, createVenue, updateVenue,
  getMiPublicacion, crearPublicacion, editarPublicacion,
  cambiarEstadoPublicacion, eliminarPublicacion,
  getStats, getStatsDetalle, getStatsTimeseries,
};
