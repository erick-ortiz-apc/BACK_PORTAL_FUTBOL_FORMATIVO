const adminService = require('./admin.service');

async function getDashboard(req, res) {
  try {
    const data = await adminService.getDashboard();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function listPublicaciones(req, res) {
  try {
    const { status, page, limit, busqueda } = req.query;
    const data = await adminService.listPublicaciones({ status, page, limit, busqueda });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function getPublicacion(req, res) {
  try {
    const data = await adminService.getPublicacion(parseInt(req.params.id, 10));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function aprobar(req, res) {
  try {
    const data = await adminService.aprobar(parseInt(req.params.id, 10), req.user.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function rechazar(req, res) {
  try {
    const { review_notes } = req.body;
    const data = await adminService.rechazar(parseInt(req.params.id, 10), req.user.id, review_notes.trim());
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  getDashboard,
  listPublicaciones,
  getPublicacion,
  aprobar,
  rechazar,
};
