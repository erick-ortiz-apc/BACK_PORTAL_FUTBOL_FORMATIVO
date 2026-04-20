-- Seed inicial de administrador
-- Reemplaza el email y nombre con los datos reales del admin.
-- El google_id y profile_image_url se llenan automáticamente en el primer login.

USE DB_PORTAL_FUTBOL_FORMATIVO;

INSERT INTO admins (email, display_name)
VALUES ('erick.ortiz.laboral@gmail.com', 'Erick Ortiz')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);
