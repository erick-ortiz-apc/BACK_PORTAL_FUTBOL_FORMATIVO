const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth.middleware');
const { googleHandler, meHandler } = require('./auth.controller');

const router = Router();

router.post('/google', googleHandler);
router.get('/me', authMiddleware, meHandler);

module.exports = router;
