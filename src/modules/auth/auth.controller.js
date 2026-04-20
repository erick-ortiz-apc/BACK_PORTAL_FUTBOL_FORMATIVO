const authService = require('./auth.service');

async function googleHandler(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(422).json({ message: 'idToken requerido' });
    const result = await authService.loginWithGoogle(idToken);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

async function meHandler(req, res) {
  try {
    if (req.user.rol === 'admin') {
      const admin = await authService.getAdminMe(req.user.id);
      return res.json({ rol: 'admin', admin });
    }
    const publisher = await authService.getMe(req.user.id);
    res.json({ rol: 'publisher', publisher });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = { googleHandler, meHandler };
