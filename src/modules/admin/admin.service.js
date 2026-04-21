const { pool } = require('../../config/db');
const notifications = require('../notifications/notifications.service');

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

async function getDashboard() {
  const [byStatusRows] = await pool.query(
    `SELECT ps.code, COUNT(*) AS total
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     GROUP BY ps.code`
  );
  const byStatus = { en_revision: 0, activa: 0, rechazada: 0, inactiva: 0 };
  for (const row of byStatusRows) byStatus[row.code] = Number(row.total);

  const [[{ publishers_total }]] = await pool.query(
    'SELECT COUNT(*) AS publishers_total FROM publishers'
  );

  const [orgByType] = await pool.query(
    `SELECT ot.code, COUNT(*) AS total
     FROM organizations o
     JOIN organization_types ot ON o.organization_type_id = ot.id
     GROUP BY ot.code`
  );
  const orgCounts = { escuela: 0, academia: 0, club: 0 };
  for (const row of orgByType) orgCounts[row.code] = Number(row.total);
  const organizations_total = orgCounts.escuela + orgCounts.academia + orgCounts.club;

  const [topRegions] = await pool.query(
    `SELECT r.name AS region, COUNT(DISTINCT p.id) AS total
     FROM publications p
     JOIN venues v ON p.venue_id = v.id
     JOIN regions r ON v.region_id = r.id
     GROUP BY r.id
     ORDER BY total DESC
     LIMIT 5`
  );

  const [[{ new7d }]] = await pool.query(
    'SELECT COUNT(*) AS new7d FROM publications WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
  );
  const [[{ approved7d }]] = await pool.query(
    `SELECT COUNT(*) AS approved7d FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     WHERE ps.code = 'activa' AND p.reviewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );
  const [[{ rejected7d }]] = await pool.query(
    `SELECT COUNT(*) AS rejected7d FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     WHERE ps.code = 'rechazada' AND p.reviewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
  );

  return {
    by_status: byStatus,
    publishers_total: Number(publishers_total),
    organizations_total,
    organizations_by_type: {
      escuelas: orgCounts.escuela,
      academias: orgCounts.academia,
      clubes: orgCounts.club,
    },
    top_regions: topRegions.map(r => ({ region: r.region, total: Number(r.total) })),
    activity_7d: {
      new: Number(new7d),
      approved: Number(approved7d),
      rejected: Number(rejected7d),
    },
  };
}

// ─── PUBLICATIONS LIST ───────────────────────────────────────────────────────

async function listPublicaciones({ status, page, limit, busqueda }) {
  const allowed = ['en_revision', 'activa', 'rechazada', 'inactiva'];
  if (status && !allowed.includes(status)) {
    const err = new Error(`status inválido. Permitidos: ${allowed.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const safeLimit = Math.max(1, Math.min(50, parseInt(limit) || 20));
  const safePage = Math.max(1, parseInt(page) || 1);
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];

  if (status) {
    where.push('ps.code = ?');
    params.push(status);
  }
  if (busqueda && busqueda.trim()) {
    where.push('(p.title LIKE ? OR o.name LIKE ? OR pub.display_name LIKE ?)');
    const like = `%${busqueda.trim()}%`;
    params.push(like, like, like);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     JOIN organizations o ON p.organization_id = o.id
     JOIN publishers pub ON p.publisher_id = pub.id
     ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.image_url, p.price_amount, p.gender_target,
            p.created_at, p.reviewed_at, p.review_notes,
            ps.code AS status_code,
            pub.id AS publisher_id, pub.display_name AS publisher_name, pub.email AS publisher_email,
            o.id AS organization_id, o.name AS org_name, ot.label AS org_type_label,
            v.address_line, r.name AS region_name, c.name AS commune_name
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     JOIN publishers pub ON p.publisher_id = pub.id
     JOIN organizations o ON p.organization_id = o.id
     JOIN organization_types ot ON o.organization_type_id = ot.id
     LEFT JOIN venues v ON p.venue_id = v.id
     LEFT JOIN regions r ON v.region_id = r.id
     LEFT JOIN communes c ON v.commune_id = c.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    data: rows,
    total: Number(total),
    page: safePage,
    limit: safeLimit,
    totalPages: Math.ceil(Number(total) / safeLimit),
  };
}

// ─── PUBLICATION DETAIL ──────────────────────────────────────────────────────

async function getPublicacion(pubId) {
  const [rows] = await pool.query(
    `SELECT p.*, ps.code AS status_code,
            pub.id AS publisher_id, pub.display_name AS publisher_name,
            pub.email AS publisher_email, pub.profile_image_url AS publisher_photo,
            o.id AS organization_id, o.name AS org_name, o.description AS org_description,
            o.logo_url AS org_logo_url, ot.label AS org_type_label,
            v.id AS venue_id_join, v.name AS venue_name, v.address_line,
            v.latitude, v.longitude,
            r.name AS region_name, c.name AS commune_name,
            adm.display_name AS reviewed_by_admin_name
     FROM publications p
     JOIN publication_statuses ps ON p.status_id = ps.id
     JOIN publishers pub ON p.publisher_id = pub.id
     JOIN organizations o ON p.organization_id = o.id
     JOIN organization_types ot ON o.organization_type_id = ot.id
     LEFT JOIN venues v ON p.venue_id = v.id
     LEFT JOIN regions r ON v.region_id = r.id
     LEFT JOIN communes c ON v.commune_id = c.id
     LEFT JOIN admins adm ON p.reviewed_by_admin_id = adm.id
     WHERE p.id = ?`,
    [pubId]
  );
  if (!rows[0]) {
    const err = new Error('Publicación no encontrada');
    err.status = 404;
    throw err;
  }
  const pub = rows[0];

  const [ages] = await pool.query(
    `SELECT pa.age_id, a.code, a.label
     FROM publication_ages pa
     JOIN ages a ON pa.age_id = a.id
     WHERE pa.publication_id = ?
     ORDER BY a.sort_order`,
    [pub.id]
  );

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

  const [socialLinks] = await pool.query(
    'SELECT id, code, link FROM publication_social_links WHERE publication_id = ?',
    [pub.id]
  );

  pub.publication_ages = ages;
  pub.publication_time_slots = timeSlots;
  pub.social_links = socialLinks;
  return pub;
}

// ─── MODERATION ──────────────────────────────────────────────────────────────

async function aprobar(pubId, adminId) {
  const [[statusRow]] = await pool.query(
    "SELECT id FROM publication_statuses WHERE code = 'activa'"
  );
  const [result] = await pool.query(
    `UPDATE publications
       SET status_id = ?, reviewed_at = NOW(), reviewed_by_admin_id = ?, review_notes = NULL
     WHERE id = ?
       AND status_id IN (
         SELECT id FROM publication_statuses WHERE code IN ('en_revision', 'rechazada')
       )`,
    [statusRow.id, adminId, pubId]
  );
  if (result.affectedRows === 0) {
    const err = new Error('La publicación no existe o no puede aprobarse en su estado actual');
    err.status = 400;
    throw err;
  }
  const pub = await getPublicacion(pubId);
  notifications.notifyPublicationApproved({
    publisher: { display_name: pub.publisher_name, email: pub.publisher_email },
    publication: pub,
  }).catch(err => console.error('[notify] approved:', err.message));
  return pub;
}

async function rechazar(pubId, adminId, reviewNotes) {
  const [[statusRow]] = await pool.query(
    "SELECT id FROM publication_statuses WHERE code = 'rechazada'"
  );
  const [result] = await pool.query(
    `UPDATE publications
       SET status_id = ?, reviewed_at = NOW(), reviewed_by_admin_id = ?, review_notes = ?
     WHERE id = ?
       AND status_id IN (
         SELECT id FROM publication_statuses WHERE code IN ('en_revision', 'activa')
       )`,
    [statusRow.id, adminId, reviewNotes, pubId]
  );
  if (result.affectedRows === 0) {
    const err = new Error('La publicación no existe o no puede rechazarse en su estado actual');
    err.status = 400;
    throw err;
  }
  const pub = await getPublicacion(pubId);
  notifications.notifyPublicationRejected({
    publisher: { display_name: pub.publisher_name, email: pub.publisher_email },
    publication: pub,
    notes: reviewNotes,
  }).catch(err => console.error('[notify] rejected:', err.message));
  return pub;
}

module.exports = {
  getDashboard,
  listPublicaciones,
  getPublicacion,
  aprobar,
  rechazar,
};
