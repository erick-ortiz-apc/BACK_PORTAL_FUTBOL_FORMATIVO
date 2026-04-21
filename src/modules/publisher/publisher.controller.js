const publisherService = require('./publisher.service');
const { pool } = require('../../config/db');
const fs = require('fs');
const path = require('path');

// ─── PERFIL ───────────────────────────────────────────────────────────────────

async function getMiPerfil(req, res) {
  try {
    const perfil = await publisherService.getMiPerfil(req.user.id);
    res.json(perfil);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function editarPerfil(req, res) {
  try {
    const perfil = await publisherService.editarPerfil(req.user.id, req.body);
    res.json(perfil);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────

async function getOrganization(req, res) {
  try {
    const org = await publisherService.getOrganization(req.user.id);
    res.json(org);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function createOrganization(req, res) {
  try {
    const org = await publisherService.createOrganization(req.user.id, req.body);
    res.status(201).json(org);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function updateOrganization(req, res) {
  try {
    const org = await publisherService.updateOrganization(req.user.id, req.params.id, req.body);
    res.json(org);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// ─── VENUE ────────────────────────────────────────────────────────────────────

async function getVenue(req, res) {
  try {
    const org = await publisherService.getOrganization(req.user.id);
    if (!org) return res.json(null);
    const venue = await publisherService.getVenue(org.id);
    res.json(venue);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function createVenue(req, res) {
  try {
    const org = await publisherService.getOrganization(req.user.id);
    if (!org) return res.status(400).json({ message: 'Primero debes crear tu organización' });
    const venue = await publisherService.createVenue(org.id, req.body);
    res.status(201).json(venue);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function updateVenue(req, res) {
  try {
    const org = await publisherService.getOrganization(req.user.id);
    if (!org) return res.status(400).json({ message: 'Organización no encontrada' });
    const venue = await publisherService.updateVenue(req.user.id, org.id, req.params.id, req.body);
    res.json(venue);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// ─── PUBLICATION ──────────────────────────────────────────────────────────────

async function getMiPublicacion(req, res) {
  try {
    const pub = await publisherService.getMiPublicacion(req.user.id);
    res.json(pub);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function crearPublicacion(req, res) {
  try {
    const pub = await publisherService.crearPublicacion(req.user.id, req.body);
    res.status(201).json(pub);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function editarPublicacion(req, res) {
  try {
    const pub = await publisherService.editarPublicacion(req.user.id, req.params.id, req.body);
    res.json(pub);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function eliminarPublicacion(req, res) {
  try {
    await publisherService.eliminarPublicacion(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function cambiarEstadoPublicacion(req, res) {
  try {
    const pub = await publisherService.cambiarEstadoPublicacion(req.user.id, req.params.id, req.body.status_code);
    res.json(pub);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const stats = await publisherService.getStats(req.user.id);
    res.json(stats);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function getStatsTimeseries(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;
    const series = await publisherService.getStatsTimeseries(req.user.id, days);
    res.json(series);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function getStatsDetalle(req, res) {
  try {
    const tipo = req.params.tipo; // 'visualizaciones' | 'contactos'
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const result = await publisherService.getStatsDetalle(req.user.id, tipo, page, limit);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// ─── IMAGEN ───────────────────────────────────────────────────────────────────

async function subirImagen(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió ninguna imagen' });

    const [[pub]] = await pool.query(
      'SELECT id, image_url FROM publications WHERE publisher_id = ?',
      [req.user.id]
    );
    if (!pub) return res.status(404).json({ message: 'No tienes publicación activa' });

    if (pub.image_url) {
      const filename = pub.image_url.split('/uploads/publicaciones/')[1];
      if (filename) {
        const prevPath = path.join(__dirname, '../../../uploads/publicaciones', filename);
        if (fs.existsSync(prevPath)) fs.unlinkSync(prevPath);
      }
    }

    const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    const image_url = `${baseUrl}/uploads/publicaciones/${req.file.filename}`;

    await pool.query('UPDATE publications SET image_url = ? WHERE id = ?', [image_url, pub.id]);

    res.json({ image_url });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  getMiPerfil, editarPerfil,
  getOrganization, createOrganization, updateOrganization,
  getVenue, createVenue, updateVenue,
  getMiPublicacion, crearPublicacion, editarPublicacion, eliminarPublicacion, cambiarEstadoPublicacion,
  getStats, getStatsDetalle, getStatsTimeseries, subirImagen,
};
