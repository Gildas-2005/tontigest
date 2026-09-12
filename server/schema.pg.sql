-- TontiGest — Schéma PostgreSQL complet
-- Miroir exact de schema.sql (MySQL) : mêmes tables, mêmes colonnes.
-- Appliqué automatiquement au démarrage (statement par statement).
-- Types adaptés : DOUBLE→DOUBLE PRECISION, TINYINT(1)→SMALLINT,
-- ENUM→VARCHAR, DATETIME→TIMESTAMP, MEDIUMTEXT→TEXT, JSON→TEXT.

/* ============================ COMPTES ============================ */

CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  email           VARCHAR(190) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  nom             VARCHAR(190) NOT NULL DEFAULT '',
  telephone       VARCHAR(60)  NOT NULL DEFAULT '',
  photo           TEXT         NULL,
  role            VARCHAR(30)  NOT NULL DEFAULT 'Membre',
  club_id         VARCHAR(36)  NULL,
  statut          VARCHAR(30)  NOT NULL DEFAULT 'Actif',
  two_fa          SMALLINT     NOT NULL DEFAULT 0,
  two_fa_code     VARCHAR(10)  NULL,
  reset_code      VARCHAR(10)  NULL,
  onboarding_done SMALLINT     NOT NULL DEFAULT 0,
  is_superadmin   SMALLINT     NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_club ON users (club_id);

/* ============================ CLUBS ============================ */

CREATE TABLE IF NOT EXISTS clubs (
  id                 VARCHAR(36)  NOT NULL PRIMARY KEY,
  code               VARCHAR(8)   NOT NULL UNIQUE,
  nom                VARCHAR(190) NOT NULL DEFAULT 'Ma tontine',
  ville              VARCHAR(120) NOT NULL DEFAULT '',
  type               VARCHAR(40)  NOT NULL DEFAULT 'Rotative',
  devise             VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  montant_cotisation DOUBLE PRECISION NOT NULL DEFAULT 0,
  montant_tour       DOUBLE PRECISION NOT NULL DEFAULT 0,
  frequence          VARCHAR(30)  NOT NULL DEFAULT 'Mensuelle',
  penalite_retard    DOUBLE PRECISION NOT NULL DEFAULT 0,
  taux_pret          DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_debut         DATE         NULL,
  banque             VARCHAR(190) NOT NULL DEFAULT '',
  statut             VARCHAR(30)  NOT NULL DEFAULT 'Preparation',
  created_by         VARCHAR(36)  NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payload            TEXT         NULL
);
CREATE INDEX IF NOT EXISTS idx_clubs_statut ON clubs (statut);

CREATE TABLE IF NOT EXISTS ordre_passage (
  club_id    VARCHAR(36) NOT NULL,
  position   INT         NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  PRIMARY KEY (club_id, position)
);
CREATE INDEX IF NOT EXISTS idx_op_membre ON ordre_passage (membre_id);

CREATE TABLE IF NOT EXISTS comptes_caisse (
  club_id  VARCHAR(36)  NOT NULL,
  devise   VARCHAR(10)  NOT NULL,
  compte   VARCHAR(60)  NOT NULL,
  solde    DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (club_id, devise, compte)
);

/* ============================ MEMBRES ============================ */

CREATE TABLE IF NOT EXISTS membres (
  id            VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id       VARCHAR(36)  NOT NULL,
  user_id       VARCHAR(36)  NULL,
  nom           VARCHAR(190) NOT NULL DEFAULT '',
  telephone     VARCHAR(60)  NOT NULL DEFAULT '',
  email         VARCHAR(190) NOT NULL DEFAULT '',
  profession    VARCHAR(120) NOT NULL DEFAULT '',
  role          VARCHAR(30)  NOT NULL DEFAULT 'Membre',
  statut        VARCHAR(30)  NOT NULL DEFAULT 'Actif',
  date_adhesion DATE         NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_membres_club ON membres (club_id);
CREATE INDEX IF NOT EXISTS idx_membres_user ON membres (user_id);

/* ============================ FINANCE ============================ */

CREATE TABLE IF NOT EXISTS cotisations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  montant    DOUBLE PRECISION NOT NULL DEFAULT 0,
  devise     VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  periode    VARCHAR(20)  NOT NULL DEFAULT '',
  date_paiement DATE       NULL,
  methode    VARCHAR(40)  NOT NULL DEFAULT '',
  reference  VARCHAR(40)  NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cot_club ON cotisations (club_id);
CREATE INDEX IF NOT EXISTS idx_cot_membre ON cotisations (membre_id);
CREATE INDEX IF NOT EXISTS idx_cot_periode ON cotisations (club_id, periode);

CREATE TABLE IF NOT EXISTS mouvements (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  sens       VARCHAR(10)  NOT NULL DEFAULT 'in',
  compte     VARCHAR(60)  NOT NULL DEFAULT 'Caisse',
  montant    DOUBLE PRECISION NOT NULL DEFAULT 0,
  devise     VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  date_mvt   DATE         NULL,
  note       TEXT         NULL,
  piece      TEXT         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mv_club_date ON mouvements (club_id, date_mvt);
CREATE INDEX IF NOT EXISTS idx_mv_membre ON mouvements (membre_id);
CREATE INDEX IF NOT EXISTS idx_mv_type ON mouvements (club_id, type);

CREATE TABLE IF NOT EXISTS penalites (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  montant    DOUBLE PRECISION NOT NULL DEFAULT 0,
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_pen   DATE         NULL,
  payee      SMALLINT     NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pen_club ON penalites (club_id);
CREATE INDEX IF NOT EXISTS idx_pen_membre ON penalites (membre_id);

CREATE TABLE IF NOT EXISTS epargne (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(30)  NOT NULL DEFAULT 'Volontaire',
  solde      DOUBLE PRECISION NOT NULL DEFAULT 0,
  bloquee    DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ep_membre ON epargne (membre_id);

CREATE TABLE IF NOT EXISTS epargne_versements (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  epargne_id VARCHAR(64)  NOT NULL,
  montant    DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_v     DATE         NULL
);
CREATE INDEX IF NOT EXISTS idx_ev_epargne ON epargne_versements (epargne_id);

CREATE TABLE IF NOT EXISTS groupes_epargne (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  nom        VARCHAR(190) NOT NULL DEFAULT '',
  solde      DOUBLE PRECISION NOT NULL DEFAULT 0,
  objectif   DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ge_club ON groupes_epargne (club_id);

CREATE TABLE IF NOT EXISTS groupe_membres (
  groupe_id  VARCHAR(64) NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  PRIMARY KEY (groupe_id, membre_id)
);

CREATE TABLE IF NOT EXISTS prets (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id      VARCHAR(36)  NOT NULL,
  membre_id    VARCHAR(64)  NOT NULL,
  montant      DOUBLE PRECISION NOT NULL DEFAULT 0,
  taux         DOUBLE PRECISION NOT NULL DEFAULT 0,
  interet      DOUBLE PRECISION NOT NULL DEFAULT 0,
  reste        DOUBLE PRECISION NOT NULL DEFAULT 0,
  statut       VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  motif        VARCHAR(255) NOT NULL DEFAULT '',
  date_demande DATE         NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_membre ON prets (membre_id);
CREATE INDEX IF NOT EXISTS idx_pr_club_statut ON prets (club_id, statut);

CREATE TABLE IF NOT EXISTS pret_garants (
  pret_id   VARCHAR(64) NOT NULL,
  garant_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (pret_id, garant_id)
);

CREATE TABLE IF NOT EXISTS redistributions (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  total      DOUBLE PRECISION NOT NULL DEFAULT 0,
  date_red   DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rd_club ON redistributions (club_id);

CREATE TABLE IF NOT EXISTS redistribution_parts (
  redistribution_id VARCHAR(64) NOT NULL,
  membre_id         VARCHAR(64) NOT NULL,
  montant           DOUBLE PRECISION NOT NULL DEFAULT 0,
  PRIMARY KEY (redistribution_id, membre_id)
);

CREATE TABLE IF NOT EXISTS aides (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  montant    DOUBLE PRECISION NOT NULL DEFAULT 0,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_aide  DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_club ON aides (club_id);
CREATE INDEX IF NOT EXISTS idx_ai_membre ON aides (membre_id);

/* ============================ VIE DU CLUB ============================ */

CREATE TABLE IF NOT EXISTS seances (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  titre      VARCHAR(190) NOT NULL DEFAULT '',
  date_s     DATE         NULL,
  lieu       VARCHAR(190) NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Planifiée',
  pv         TEXT         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_se_club_date ON seances (club_id, date_s);

CREATE TABLE IF NOT EXISTS seance_presences (
  seance_id  VARCHAR(64) NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  present    SMALLINT    NOT NULL DEFAULT 0,
  PRIMARY KEY (seance_id, membre_id)
);

CREATE TABLE IF NOT EXISTS convocations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  seance_id  VARCHAR(64)  NULL,
  canal      VARCHAR(40)  NOT NULL DEFAULT '',
  message    TEXT         NULL,
  envoyees   INT          NOT NULL DEFAULT 0,
  date_c     TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cv_club ON convocations (club_id);

CREATE TABLE IF NOT EXISTS parrainages (
  id         VARCHAR(64) NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36) NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  parrain_id VARCHAR(64) NOT NULL,
  date_p     DATE        NULL
);
CREATE INDEX IF NOT EXISTS idx_pa_membre ON parrainages (membre_id);

CREATE TABLE IF NOT EXISTS reclamations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  sujet      VARCHAR(190) NOT NULL DEFAULT '',
  detail     TEXT         NULL,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Ouverte',
  reponse    TEXT         NULL,
  date_r     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rc_club ON reclamations (club_id);

CREATE TABLE IF NOT EXISTS sanctions (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_s     DATE         NULL
);
CREATE INDEX IF NOT EXISTS idx_sa_membre ON sanctions (membre_id);

CREATE TABLE IF NOT EXISTS rapports (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  periode    VARCHAR(40)  NOT NULL DEFAULT '',
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Soumis',
  auteur     VARCHAR(190) NOT NULL DEFAULT '',
  resume     TEXT         NULL,
  date_r     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ra_club ON rapports (club_id);

CREATE TABLE IF NOT EXISTS alertes (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  auteur     VARCHAR(190) NOT NULL DEFAULT '',
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  message    TEXT         NULL,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Ouverte',
  date_a     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_al_club ON alertes (club_id);

CREATE TABLE IF NOT EXISTS audits (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  cible      VARCHAR(190) NOT NULL DEFAULT '',
  verdict    VARCHAR(30)  NOT NULL DEFAULT '',
  note       TEXT         NULL,
  auditeur   VARCHAR(190) NOT NULL DEFAULT '',
  date_au    DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_au_club ON audits (club_id);

CREATE TABLE IF NOT EXISTS annonces (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  message    TEXT         NULL,
  canal      VARCHAR(40)  NOT NULL DEFAULT '',
  cible      VARCHAR(120) NOT NULL DEFAULT '',
  date_n     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_an_club ON annonces (club_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  titre      VARCHAR(190) NOT NULL DEFAULT '',
  message    TEXT         NULL,
  lu         SMALLINT     NOT NULL DEFAULT 0,
  date_n     TIMESTAMP    NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nt_membre ON notifications (membre_id, lu);

/* ============================ TRANSPORT (synchronisation front) ============================ */

CREATE TABLE IF NOT EXISTS records (
  entity     VARCHAR(32) NOT NULL,
  id         VARCHAR(64) NOT NULL,
  club_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NULL,
  payload    TEXT        NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity, id)
);
CREATE INDEX IF NOT EXISTS idx_club_entity ON records (club_id, entity);
