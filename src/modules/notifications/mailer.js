const nodemailer = require('nodemailer');
const { pool } = require('../../config/db');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn('[mailer] SMTP no configurado (faltan SMTP_HOST/USER/PASS). Envíos desactivados.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  if (!to || (Array.isArray(to) && to.length === 0)) return;
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mailer] envío falló:', err.message);
  }
}

async function getAdminEmails() {
  try {
    const [rows] = await pool.query(
      'SELECT email FROM admins WHERE is_active = 1'
    );
    return rows.map(r => r.email).filter(Boolean);
  } catch (err) {
    console.error('[mailer] getAdminEmails falló:', err.message);
    return [];
  }
}

module.exports = { sendMail, getAdminEmails };
