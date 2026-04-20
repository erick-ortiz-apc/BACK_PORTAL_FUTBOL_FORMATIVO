CREATE DATABASE IF NOT EXISTS DB_PORTAL_FUTBOL_FORMATIVO
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE DB_PORTAL_FUTBOL_FORMATIVO;

SET NAMES utf8mb4;

-- =====================================
-- LOCATION CATALOGS
-- =====================================

CREATE TABLE IF NOT EXISTS regions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS communes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  region_id   INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_communes_region
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE,
  CONSTRAINT uq_communes_region_name
    UNIQUE (region_id, name)
);

-- =====================================
-- STATUS CATALOGS
-- =====================================

CREATE TABLE IF NOT EXISTS publisher_statuses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE,
  label       VARCHAR(50) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publication_statuses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE,
  label       VARCHAR(50) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- PUBLISHERS / AUTH
-- =====================================

CREATE TABLE IF NOT EXISTS publishers (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  display_name        VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NULL,
  google_id           VARCHAR(255) NULL UNIQUE,
  profile_image_url   VARCHAR(500) NULL,
  is_email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  status_id           INT NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_publishers_status
    FOREIGN KEY (status_id) REFERENCES publisher_statuses(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS publisher_verification_tokens (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  publisher_id        INT NOT NULL,
  token               VARCHAR(255) NOT NULL,
  expires_at          DATETIME NOT NULL,
  used_at             DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publisher_verification_tokens_publisher
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  CONSTRAINT uq_publisher_verification_token
    UNIQUE (token)
);

-- =====================================
-- ADMINS
-- =====================================

CREATE TABLE IF NOT EXISTS admins (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  display_name        VARCHAR(255) NOT NULL,
  google_id           VARCHAR(255) NULL UNIQUE,
  profile_image_url   VARCHAR(500) NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admins_email (email)
);

-- =====================================
-- ORGANIZATIONS / VENUES
-- =====================================

CREATE TABLE IF NOT EXISTS organization_types (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE,
  label       VARCHAR(50) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  publisher_id        INT NOT NULL,
  organization_type_id INT NOT NULL,
  name                VARCHAR(150) NOT NULL,
  description         TEXT NULL,
  logo_url            VARCHAR(500) NULL,
  contact_phone       VARCHAR(30) NULL,
  contact_email       VARCHAR(150) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_organizations_publisher
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  CONSTRAINT fk_organizations_type
    FOREIGN KEY (organization_type_id) REFERENCES organization_types(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS venues (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  organization_id     INT NOT NULL,
  region_id           INT NOT NULL,
  commune_id          INT NOT NULL,
  name                VARCHAR(150) NOT NULL,
  address_line        VARCHAR(300) NULL,
  latitude            DECIMAL(10,7) NULL,
  longitude           DECIMAL(10,7) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_venues_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_venues_region
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_venues_commune
    FOREIGN KEY (commune_id) REFERENCES communes(id) ON DELETE RESTRICT
);

-- =====================================
-- AGES
-- =====================================

CREATE TABLE IF NOT EXISTS ages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(20) NOT NULL UNIQUE,
  label       VARCHAR(20) NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- WEEKDAYS
-- =====================================

CREATE TABLE IF NOT EXISTS weekdays (
  id          TINYINT UNSIGNED PRIMARY KEY,
  code        VARCHAR(20) NOT NULL UNIQUE,
  label       VARCHAR(20) NOT NULL UNIQUE,
  sort_order  TINYINT UNSIGNED NOT NULL UNIQUE
);

-- =====================================
-- TIME SLOTS
-- =====================================

CREATE TABLE IF NOT EXISTS time_slots (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slot_time   TIME NOT NULL UNIQUE,
  slot_label  CHAR(5) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- PUBLICATIONS
-- =====================================

CREATE TABLE IF NOT EXISTS publications (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  publisher_id        INT NOT NULL,
  organization_id     INT NOT NULL,
  venue_id            INT NULL,
  status_id           INT NOT NULL DEFAULT 1,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NULL,
  contact_phone       VARCHAR(30) NULL,
  contact_email       VARCHAR(150) NULL,
  price_amount        DECIMAL(10,2) NULL,
  gender_target       ENUM('masculino', 'femenino', 'mixto') NOT NULL DEFAULT 'mixto',
  image_url           VARCHAR(500) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  reviewed_at         DATETIME NULL,
  reviewed_by_admin_id INT NULL,
  review_notes        TEXT NULL,
  CONSTRAINT fk_publications_publisher
    FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE,
  CONSTRAINT fk_publications_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_publications_venue
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL,
  CONSTRAINT fk_publications_status
    FOREIGN KEY (status_id) REFERENCES publication_statuses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_publications_reviewed_by
    FOREIGN KEY (reviewed_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS publication_ages (
  publication_id      INT NOT NULL,
  age_id              INT NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (publication_id, age_id),
  CONSTRAINT fk_publication_ages_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_publication_ages_age
    FOREIGN KEY (age_id) REFERENCES ages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS publication_time_slots (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  publication_id      INT NOT NULL,
  weekday_id          TINYINT UNSIGNED NOT NULL,
  start_time_slot_id  SMALLINT UNSIGNED NOT NULL,
  end_time_slot_id    SMALLINT UNSIGNED NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publication_time_slots_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT fk_publication_time_slots_weekday
    FOREIGN KEY (weekday_id) REFERENCES weekdays(id) ON DELETE RESTRICT,
  CONSTRAINT fk_publication_time_slots_start
    FOREIGN KEY (start_time_slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT,
  CONSTRAINT fk_publication_time_slots_end
    FOREIGN KEY (end_time_slot_id) REFERENCES time_slots(id) ON DELETE RESTRICT,
  CONSTRAINT uq_publication_time_slot_range
    UNIQUE (publication_id, weekday_id, start_time_slot_id, end_time_slot_id)
);

CREATE TABLE IF NOT EXISTS publication_social_links (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  publication_id  INT NOT NULL,
  code            VARCHAR(50) NOT NULL,
  link            VARCHAR(500) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_publication_social_links_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  CONSTRAINT uq_publication_social_links_publication_code
    UNIQUE (publication_id, code),
  INDEX idx_publication_social_links_publication_id (publication_id)
);

-- =====================================
-- ANALYTICS
-- =====================================

CREATE TABLE IF NOT EXISTS publication_views (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  publication_id      INT NOT NULL,
  user_agent          VARCHAR(500) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_publication_views_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_publication_views_publication_id (publication_id),
  INDEX idx_publication_views_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS contact_attempts (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  publication_id      INT NOT NULL,
  method              ENUM('telefono', 'whatsapp', 'email') NOT NULL DEFAULT 'telefono',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_attempts_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_contact_attempts_publication_id (publication_id),
  INDEX idx_contact_attempts_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS social_link_clicks (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  publication_id      INT NOT NULL,
  code                VARCHAR(50) NOT NULL,
  user_agent          VARCHAR(500) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_social_link_clicks_publication
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE CASCADE,
  INDEX idx_social_link_clicks_publication_id (publication_id),
  INDEX idx_social_link_clicks_created_at (created_at),
  INDEX idx_social_link_clicks_code (code)
);

-- =====================================
-- INITIAL SEEDS / INSERTS
-- Execute this AFTER creating all tables
-- =====================================

SET NAMES utf8mb4;

-- =====================================
-- PUBLISHER STATUSES
-- =====================================

INSERT INTO publisher_statuses (code, label) VALUES
  ('activo', 'Activo'),
  ('suspendido', 'Suspendido')
ON DUPLICATE KEY UPDATE
  label = VALUES(label);

-- =====================================
-- PUBLICATION STATUSES
-- =====================================

INSERT INTO publication_statuses (code, label) VALUES
  ('en_revision', 'En revisión'),
  ('rechazada', 'Rechazada'),
  ('activa', 'Activa'),
  ('inactiva', 'Inactiva')
ON DUPLICATE KEY UPDATE
  label = VALUES(label);

-- =====================================
-- ORGANIZATION TYPES
-- =====================================

INSERT INTO organization_types (code, label) VALUES
  ('academia', 'Academia'),
  ('escuela', 'Escuela'),
  ('club', 'Club')
ON DUPLICATE KEY UPDATE
  label = VALUES(label);

-- =====================================
-- AGES
-- =====================================

INSERT INTO ages (code, label, sort_order) VALUES
  ('5', '5', 1),
  ('6', '6', 2),
  ('7', '7', 3),
  ('8', '8', 4),
  ('9', '9', 5),
  ('10', '10', 6),
  ('11', '11', 7),
  ('12', '12', 8),
  ('13', '13', 9),
  ('14', '14', 10),
  ('15', '15', 11),
  ('16', '16', 12),
  ('17', '17', 13),
  ('18', '18', 14),
  ('18_plus', '18+', 15)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  sort_order = VALUES(sort_order);

-- =====================================
-- WEEKDAYS
-- =====================================

INSERT INTO weekdays (id, code, label, sort_order) VALUES
  (1, 'lunes', 'Lunes', 1),
  (2, 'martes', 'Martes', 2),
  (3, 'miercoles', 'Miércoles', 3),
  (4, 'jueves', 'Jueves', 4),
  (5, 'viernes', 'Viernes', 5),
  (6, 'sabado', 'Sábado', 6),
  (7, 'domingo', 'Domingo', 7)
ON DUPLICATE KEY UPDATE
  code = VALUES(code),
  label = VALUES(label),
  sort_order = VALUES(sort_order);

-- =====================================
-- TIME SLOTS (00:00 to 23:45 every 15 min)
-- =====================================

INSERT INTO time_slots (slot_time, slot_label)
WITH RECURSIVE time_seed AS (
  SELECT CAST('00:00:00' AS TIME) AS slot_time
  UNION ALL
  SELECT ADDTIME(slot_time, '00:15:00')
  FROM time_seed
  WHERE slot_time < '23:45:00'
)
SELECT slot_time, DATE_FORMAT(slot_time, '%H:%i')
FROM time_seed
ON DUPLICATE KEY UPDATE
  slot_label = VALUES(slot_label);

-- =====================================
-- REGIONS
-- =====================================

INSERT INTO regions (name) VALUES
  ('Arica y Parinacota'),
  ('Tarapacá'),
  ('Antofagasta'),
  ('Atacama'),
  ('Coquimbo'),
  ('Valparaíso'),
  ('Metropolitana'),
  ('O''Higgins'),
  ('Maule'),
  ('Ñuble'),
  ('Biobío'),
  ('Araucanía'),
  ('Los Ríos'),
  ('Los Lagos'),
  ('Aysén'),
  ('Magallanes')
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- =====================================
-- COMMUNES
-- =====================================

-- Arica y Parinacota
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Arica' n
  UNION SELECT 'Camarones'
  UNION SELECT 'Putre'
  UNION SELECT 'General Lagos'
) c
WHERE r.name = 'Arica y Parinacota'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Tarapacá
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Iquique' n
  UNION SELECT 'Alto Hospicio'
  UNION SELECT 'Pozo Almonte'
  UNION SELECT 'Camiña'
  UNION SELECT 'Colchane'
  UNION SELECT 'Huara'
  UNION SELECT 'Pica'
) c
WHERE r.name = 'Tarapacá'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Antofagasta
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Antofagasta' n
  UNION SELECT 'Mejillones'
  UNION SELECT 'Sierra Gorda'
  UNION SELECT 'Taltal'
  UNION SELECT 'Calama'
  UNION SELECT 'Ollagüe'
  UNION SELECT 'San Pedro de Atacama'
  UNION SELECT 'Tocopilla'
  UNION SELECT 'María Elena'
) c
WHERE r.name = 'Antofagasta'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Atacama
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Copiapó' n
  UNION SELECT 'Caldera'
  UNION SELECT 'Tierra Amarilla'
  UNION SELECT 'Chañaral'
  UNION SELECT 'Diego de Almagro'
  UNION SELECT 'Vallenar'
  UNION SELECT 'Alto del Carmen'
  UNION SELECT 'Freirina'
  UNION SELECT 'Huasco'
) c
WHERE r.name = 'Atacama'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Coquimbo
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'La Serena' n
  UNION SELECT 'Coquimbo'
  UNION SELECT 'Andacollo'
  UNION SELECT 'La Higuera'
  UNION SELECT 'Vicuña'
  UNION SELECT 'Illapel'
  UNION SELECT 'Canela'
  UNION SELECT 'Los Vilos'
  UNION SELECT 'Salamanca'
  UNION SELECT 'Ovalle'
  UNION SELECT 'Combarbalá'
  UNION SELECT 'Monte Patria'
  UNION SELECT 'Punitaqui'
  UNION SELECT 'Paihuano'
  UNION SELECT 'Río Hurtado'
) c
WHERE r.name = 'Coquimbo'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Valparaíso
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Valparaíso' n
  UNION SELECT 'Viña del Mar'
  UNION SELECT 'Quilpué'
  UNION SELECT 'Villa Alemana'
  UNION SELECT 'Concón'
  UNION SELECT 'Casablanca'
  UNION SELECT 'Quintero'
  UNION SELECT 'Puchuncaví'
  UNION SELECT 'Algarrobo'
  UNION SELECT 'El Quisco'
  UNION SELECT 'El Tabo'
  UNION SELECT 'Santo Domingo'
  UNION SELECT 'Cartagena'
  UNION SELECT 'San Antonio'
  UNION SELECT 'Isla de Pascua'
  UNION SELECT 'Juan Fernández'
  UNION SELECT 'Los Andes'
  UNION SELECT 'Calle Larga'
  UNION SELECT 'Rinconada'
  UNION SELECT 'San Esteban'
  UNION SELECT 'Cabildo'
  UNION SELECT 'La Ligua'
  UNION SELECT 'Petorca'
  UNION SELECT 'Papudo'
  UNION SELECT 'Zapallar'
  UNION SELECT 'Quillota'
  UNION SELECT 'La Calera'
  UNION SELECT 'Hijuelas'
  UNION SELECT 'La Cruz'
  UNION SELECT 'Nogales'
  UNION SELECT 'Limache'
  UNION SELECT 'Olmué'
  UNION SELECT 'San Felipe'
  UNION SELECT 'Putaendo'
  UNION SELECT 'Santa María'
  UNION SELECT 'Catemu'
  UNION SELECT 'Llaillay'
  UNION SELECT 'Panquehue'
) c
WHERE r.name = 'Valparaíso'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Metropolitana
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Santiago' n
  UNION SELECT 'Cerrillos'
  UNION SELECT 'Cerro Navia'
  UNION SELECT 'Conchalí'
  UNION SELECT 'El Bosque'
  UNION SELECT 'Estación Central'
  UNION SELECT 'Huechuraba'
  UNION SELECT 'Independencia'
  UNION SELECT 'La Cisterna'
  UNION SELECT 'La Florida'
  UNION SELECT 'La Granja'
  UNION SELECT 'La Pintana'
  UNION SELECT 'La Reina'
  UNION SELECT 'Las Condes'
  UNION SELECT 'Lo Barnechea'
  UNION SELECT 'Lo Espejo'
  UNION SELECT 'Lo Prado'
  UNION SELECT 'Macul'
  UNION SELECT 'Maipú'
  UNION SELECT 'Ñuñoa'
  UNION SELECT 'Pedro Aguirre Cerda'
  UNION SELECT 'Peñalolén'
  UNION SELECT 'Providencia'
  UNION SELECT 'Pudahuel'
  UNION SELECT 'Quilicura'
  UNION SELECT 'Quinta Normal'
  UNION SELECT 'Recoleta'
  UNION SELECT 'Renca'
  UNION SELECT 'San Miguel'
  UNION SELECT 'San Joaquín'
  UNION SELECT 'San Ramón'
  UNION SELECT 'Vitacura'
  UNION SELECT 'Puente Alto'
  UNION SELECT 'Pirque'
  UNION SELECT 'San José de Maipo'
  UNION SELECT 'Colina'
  UNION SELECT 'Lampa'
  UNION SELECT 'Til-Til'
  UNION SELECT 'Buin'
  UNION SELECT 'Calera de Tango'
  UNION SELECT 'Paine'
  UNION SELECT 'Melipilla'
  UNION SELECT 'Alhué'
  UNION SELECT 'Curacaví'
  UNION SELECT 'María Pinto'
  UNION SELECT 'San Pedro'
  UNION SELECT 'Talagante'
  UNION SELECT 'Isla de Maipo'
  UNION SELECT 'El Monte'
  UNION SELECT 'Padre Hurtado'
  UNION SELECT 'Peñaflor'
) c
WHERE r.name = 'Metropolitana'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- O'Higgins
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Rancagua' n
  UNION SELECT 'Codegua'
  UNION SELECT 'Coinco'
  UNION SELECT 'Coltauco'
  UNION SELECT 'Doñihue'
  UNION SELECT 'Graneros'
  UNION SELECT 'Las Cabras'
  UNION SELECT 'Machalí'
  UNION SELECT 'Malloa'
  UNION SELECT 'Mostazal'
  UNION SELECT 'Olivar'
  UNION SELECT 'Peumo'
  UNION SELECT 'Pichidegua'
  UNION SELECT 'Quinta de Tilcoco'
  UNION SELECT 'Rengo'
  UNION SELECT 'Requínoa'
  UNION SELECT 'San Vicente'
  UNION SELECT 'Chimbarongo'
  UNION SELECT 'Lolol'
  UNION SELECT 'Nancagua'
  UNION SELECT 'Palmilla'
  UNION SELECT 'Paredones'
  UNION SELECT 'Peralillo'
  UNION SELECT 'Placilla'
  UNION SELECT 'Pumanque'
  UNION SELECT 'San Fernando'
  UNION SELECT 'Pichilemu'
  UNION SELECT 'La Estrella'
  UNION SELECT 'Litueche'
  UNION SELECT 'Marchihue'
  UNION SELECT 'Navidad'
) c
WHERE r.name = 'O''Higgins'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Maule
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Talca' n
  UNION SELECT 'Constitución'
  UNION SELECT 'Curepto'
  UNION SELECT 'Empedrado'
  UNION SELECT 'Maule'
  UNION SELECT 'Pelarco'
  UNION SELECT 'Pencahue'
  UNION SELECT 'Río Claro'
  UNION SELECT 'San Clemente'
  UNION SELECT 'San Rafael'
  UNION SELECT 'Curicó'
  UNION SELECT 'Hualañé'
  UNION SELECT 'Licantén'
  UNION SELECT 'Molina'
  UNION SELECT 'Rauco'
  UNION SELECT 'Romeral'
  UNION SELECT 'Sagrada Familia'
  UNION SELECT 'Teno'
  UNION SELECT 'Vichuquén'
  UNION SELECT 'Linares'
  UNION SELECT 'Colbún'
  UNION SELECT 'Longaví'
  UNION SELECT 'Parral'
  UNION SELECT 'Retiro'
  UNION SELECT 'San Javier'
  UNION SELECT 'Villa Alegre'
  UNION SELECT 'Yerbas Buenas'
  UNION SELECT 'Cauquenes'
  UNION SELECT 'Chanco'
  UNION SELECT 'Pelluhue'
) c
WHERE r.name = 'Maule'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Ñuble
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Chillán' n
  UNION SELECT 'Chillán Viejo'
  UNION SELECT 'Bulnes'
  UNION SELECT 'Cobquecura'
  UNION SELECT 'Coelemu'
  UNION SELECT 'El Carmen'
  UNION SELECT 'Ninhue'
  UNION SELECT 'Portezuelo'
  UNION SELECT 'Pemuco'
  UNION SELECT 'Pinto'
  UNION SELECT 'Quillón'
  UNION SELECT 'Quirihue'
  UNION SELECT 'Ránquil'
  UNION SELECT 'San Carlos'
  UNION SELECT 'San Fabián'
  UNION SELECT 'San Ignacio'
  UNION SELECT 'Treguaco'
  UNION SELECT 'Ñiquén'
) c
WHERE r.name = 'Ñuble'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Biobío
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Concepción' n
  UNION SELECT 'Coronel'
  UNION SELECT 'Chiguayante'
  UNION SELECT 'Florida'
  UNION SELECT 'Hualqui'
  UNION SELECT 'Lota'
  UNION SELECT 'Penco'
  UNION SELECT 'San Pedro de la Paz'
  UNION SELECT 'Santa Juana'
  UNION SELECT 'Talcahuano'
  UNION SELECT 'Tomé'
  UNION SELECT 'Hualpén'
  UNION SELECT 'Lebu'
  UNION SELECT 'Arauco'
  UNION SELECT 'Cañete'
  UNION SELECT 'Contulmo'
  UNION SELECT 'Curanilahue'
  UNION SELECT 'Los Álamos'
  UNION SELECT 'Tirúa'
  UNION SELECT 'Los Ángeles'
  UNION SELECT 'Antuco'
  UNION SELECT 'Cabrero'
  UNION SELECT 'Laja'
  UNION SELECT 'Mulchén'
  UNION SELECT 'Nacimiento'
  UNION SELECT 'Negrete'
  UNION SELECT 'Quilaco'
  UNION SELECT 'Quilleco'
  UNION SELECT 'San Rosendo'
  UNION SELECT 'Santa Bárbara'
  UNION SELECT 'Tucapel'
  UNION SELECT 'Yumbel'
  UNION SELECT 'Alto Biobío'
) c
WHERE r.name = 'Biobío'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Araucanía
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Temuco' n
  UNION SELECT 'Padre Las Casas'
  UNION SELECT 'Angol'
  UNION SELECT 'Collipulli'
  UNION SELECT 'Ercilla'
  UNION SELECT 'Lonquimay'
  UNION SELECT 'Los Sauces'
  UNION SELECT 'Lumaco'
  UNION SELECT 'Melipeuco'
  UNION SELECT 'Nueva Imperial'
  UNION SELECT 'Pucón'
  UNION SELECT 'Pitrufquén'
  UNION SELECT 'Renaico'
  UNION SELECT 'Saavedra'
  UNION SELECT 'Teodoro Schmidt'
  UNION SELECT 'Toltén'
  UNION SELECT 'Traiguén'
  UNION SELECT 'Villarrica'
  UNION SELECT 'Carahue'
  UNION SELECT 'Cholchol'
  UNION SELECT 'Cunco'
  UNION SELECT 'Curacautín'
  UNION SELECT 'Curarrehue'
  UNION SELECT 'Freire'
  UNION SELECT 'Galvarino'
  UNION SELECT 'Gorbea'
) c
WHERE r.name = 'Araucanía'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Los Ríos
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Valdivia' n
  UNION SELECT 'Corral'
  UNION SELECT 'Lanco'
  UNION SELECT 'Los Lagos'
  UNION SELECT 'Máfil'
  UNION SELECT 'Mariquina'
  UNION SELECT 'Paillaco'
  UNION SELECT 'Panguipulli'
  UNION SELECT 'Río Bueno'
  UNION SELECT 'La Unión'
  UNION SELECT 'Futrono'
) c
WHERE r.name = 'Los Ríos'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Los Lagos
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Puerto Montt' n
  UNION SELECT 'Puerto Varas'
  UNION SELECT 'Calbuco'
  UNION SELECT 'Cochamó'
  UNION SELECT 'Fresia'
  UNION SELECT 'Frutillar'
  UNION SELECT 'Llanquihue'
  UNION SELECT 'Maullín'
  UNION SELECT 'Osorno'
  UNION SELECT 'Purranque'
  UNION SELECT 'Puerto Octay'
  UNION SELECT 'Puyehue'
  UNION SELECT 'San Pablo'
  UNION SELECT 'Castro'
  UNION SELECT 'Ancud'
  UNION SELECT 'Chonchi'
  UNION SELECT 'Curaco de Vélez'
  UNION SELECT 'Dalcahue'
  UNION SELECT 'Quellón'
  UNION SELECT 'Quemchi'
  UNION SELECT 'Quinchao'
  UNION SELECT 'Chaitén'
  UNION SELECT 'Futaleufú'
  UNION SELECT 'Hualaihué'
  UNION SELECT 'Palena'
) c
WHERE r.name = 'Los Lagos'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Aysén
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Coyhaique' n
  UNION SELECT 'Puerto Aysén'
  UNION SELECT 'Chile Chico'
  UNION SELECT 'Cisnes'
  UNION SELECT 'Guaitecas'
  UNION SELECT 'Lago Verde'
  UNION SELECT 'Río Ibáñez'
  UNION SELECT 'Tortel'
) c
WHERE r.name = 'Aysén'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);

-- Magallanes
INSERT INTO communes (region_id, name)
SELECT r.id, c.n
FROM regions r
JOIN (
  SELECT 'Punta Arenas' n
  UNION SELECT 'Puerto Natales'
  UNION SELECT 'Rio Verde'
  UNION SELECT 'Laguna Blanca'
  UNION SELECT 'San Gregorio'
  UNION SELECT 'Porvenir'
  UNION SELECT 'Primavera'
  UNION SELECT 'Timaukel'
  UNION SELECT 'Antártica'
  UNION SELECT 'Cabo de Hornos'
  UNION SELECT 'Tierra del Fuego'
) c
WHERE r.name = 'Magallanes'
ON DUPLICATE KEY UPDATE
  name = VALUES(name);