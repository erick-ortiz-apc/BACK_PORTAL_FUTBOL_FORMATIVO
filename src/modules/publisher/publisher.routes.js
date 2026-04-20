const { Router } = require('express');
const { body } = require('express-validator');
const validate = require('../../middlewares/validate.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const {
  getMiPerfil, editarPerfil,
  getOrganization, createOrganization, updateOrganization,
  getVenue, createVenue, updateVenue,
  getMiPublicacion, crearPublicacion, editarPublicacion, eliminarPublicacion, cambiarEstadoPublicacion,
  getStats, getStatsDetalle, getStatsTimeseries, subirImagen,
} = require('./publisher.controller');

const router = Router();
router.use(authMiddleware);

// ─── PERFIL ───────────────────────────────────────────────────────────────────
router.get('/perfil', getMiPerfil);
router.put('/perfil',
  body('display_name').trim().notEmpty().withMessage('El nombre es requerido'),
  validate, editarPerfil
);

// ─── ORGANIZATION ─────────────────────────────────────────────────────────────
const orgRules = [
  body('organization_type_id').isInt({ min: 1 }).withMessage('Tipo de organización requerido'),
  body('name').trim().notEmpty().withMessage('El nombre de la organización es requerido'),
];
router.get('/organization', getOrganization);
router.post('/organization', orgRules, validate, createOrganization);
router.put('/organization/:id', orgRules, validate, updateOrganization);

// ─── VENUE ────────────────────────────────────────────────────────────────────
const venueRules = [
  body('region_id').isInt({ min: 1 }).withMessage('La región es requerida'),
  body('commune_id').isInt({ min: 1 }).withMessage('La comuna es requerida'),
  body('name').trim().notEmpty().withMessage('El nombre de la sede es requerido'),
];
router.get('/venue', getVenue);
router.post('/venue', venueRules, validate, createVenue);
router.put('/venue/:id', venueRules, validate, updateVenue);

// ─── PUBLICATION ──────────────────────────────────────────────────────────────
const pubRules = [
  body('organization_id').isInt({ min: 1 }).withMessage('organization_id es requerido'),
  body('title').trim().notEmpty().withMessage('El título es requerido'),
];
router.get('/publicacion', getMiPublicacion);
router.post('/publicacion', pubRules, validate, crearPublicacion);
router.put('/publicacion/:id', pubRules, validate, editarPublicacion);
router.patch('/publicacion/:id/estado',
  body('status_code').trim().notEmpty().withMessage('status_code es requerido'),
  validate, cambiarEstadoPublicacion
);
router.delete('/publicacion/:id', eliminarPublicacion);
router.post('/publicacion/imagen', upload.single('imagen'), subirImagen);

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', getStats);
router.get('/stats/timeseries', getStatsTimeseries);
router.get('/stats/:tipo', getStatsDetalle);

module.exports = router;
