const https = require('https');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');
const notifications = require('../notifications/notifications.service');

function verifyGoogleToken(idToken) {
  return new Promise((resolve, reject) => {
    https.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const payload = JSON.parse(data);
            if (payload.error_description || !payload.sub) {
              reject(new Error('Token de Google inválido'));
            } else {
              resolve(payload);
            }
          } catch {
            reject(new Error('Respuesta inválida de Google'));
          }
        });
      }
    ).on('error', reject);
  });
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function loginWithGoogle(idToken) {
  const googleUser = await verifyGoogleToken(idToken);
  const { sub: googleId, email, name, picture } = googleUser;

  const [adminRows] = await pool.query(
    `SELECT id, email, display_name, profile_image_url, is_active
     FROM admins
     WHERE email = ?`,
    [email]
  );

  if (adminRows.length > 0) {
    const adminRow = adminRows[0];
    if (!adminRow.is_active) {
      const err = new Error('Cuenta de administrador inactiva');
      err.status = 403;
      throw err;
    }
    await pool.query(
      'UPDATE admins SET google_id = ?, profile_image_url = ? WHERE id = ?',
      [googleId, picture, adminRow.id]
    );
    const token = signToken({ id: adminRow.id, email: adminRow.email, rol: 'admin' });
    return {
      token,
      rol: 'admin',
      admin: {
        id: adminRow.id,
        email: adminRow.email,
        display_name: adminRow.display_name,
        profile_image_url: picture,
      },
    };
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.display_name, p.email, p.profile_image_url, ps.code AS status_code
     FROM publishers p
     JOIN publisher_statuses ps ON p.status_id = ps.id
     WHERE p.google_id = ?`,
    [googleId]
  );

  let publisher;

  if (rows.length === 0) {
    const [result] = await pool.query(
      'INSERT INTO publishers (display_name, email, google_id, profile_image_url, status_id) VALUES (?, ?, ?, ?, 1)',
      [name, email, googleId, picture]
    );
    publisher = { id: result.insertId, display_name: name, email, profile_image_url: picture, status_code: 'activo' };
    notifications.notifyNewPublisher(publisher)
      .catch(err => console.error('[notify] new publisher:', err.message));
  } else {
    publisher = rows[0];
    if (publisher.status_code !== 'activo') {
      const err = new Error('Cuenta suspendida');
      err.status = 403;
      throw err;
    }
    await pool.query(
      'UPDATE publishers SET profile_image_url = ? WHERE id = ?',
      [picture, publisher.id]
    );
    publisher.profile_image_url = picture;
  }

  const token = signToken({ id: publisher.id, email: publisher.email, rol: 'publisher' });

  return {
    token,
    rol: 'publisher',
    publisher: {
      id: publisher.id,
      display_name: publisher.display_name,
      email: publisher.email,
      profile_image_url: publisher.profile_image_url,
    },
  };
}

async function getMe(id) {
  const [rows] = await pool.query(
    `SELECT p.id, p.display_name, p.email, p.profile_image_url, p.is_email_verified, ps.code AS status_code, p.created_at
     FROM publishers p
     JOIN publisher_statuses ps ON p.status_id = ps.id
     WHERE p.id = ?`,
    [id]
  );
  if (rows.length === 0) {
    const err = new Error('Publisher no encontrado');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

async function getAdminMe(id) {
  const [rows] = await pool.query(
    `SELECT id, email, display_name, profile_image_url, is_active, created_at
     FROM admins
     WHERE id = ?`,
    [id]
  );
  if (rows.length === 0) {
    const err = new Error('Admin no encontrado');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

module.exports = { loginWithGoogle, getMe, getAdminMe };
