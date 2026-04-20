const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const { adminMiddleware } = authMiddleware;
const {
  getDashboard,
  listPublicaciones,
  getPublicacion,
  aprobar,
  rechazar,
} = require('./admin.controller');

const router = Router();
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', getDashboard);
router.get('/publicaciones', listPublicaciones);
router.get('/publicaciones/:id', getPublicacion);
router.patch('/publicaciones/:id/aprobar', aprobar);
router.patch('/publicaciones/:id/rechazar',
  body('review_notes')
    .trim()
    .isLength({ min: 5 })
    .withMessage('review_notes debe tener al menos 5 caracteres'),
  validate,
  rechazar
);

module.exports = router;
