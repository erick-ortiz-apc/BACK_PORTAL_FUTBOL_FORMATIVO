const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const publisherRoutes = require('./modules/publisher/publisher.routes');
const publicacionesRoutes = require('./modules/publicaciones/publicaciones.routes');
const catalogoRoutes = require('./modules/catalogo/catalogo.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/publisher', publisherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/publicaciones', publicacionesRoutes);
app.use('/api', catalogoRoutes);

app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

module.exports = app;
