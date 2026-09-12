-- TontiGest — Schéma MySQL complet
-- Appliqué automatiquement au démarrage du serveur (CREATE ... IF NOT EXISTS).
--
-- Architecture : les tables relationnelles ci-dessous sont la source de vérité
-- pour la lecture (/clubs/:id/data). Le transport d'écriture historique
-- (`records`, payload JSON par entité) est conservé pour la synchronisation
-- diff du front, et chaque écriture est dupliquée dans les tables dédiées.
-- Une migration de peuplement (seed ou import) remplit les tables relationnelles
-- à partir des `records` existants (voir server/migrate.js).

/* ============================ COMPTES ============================ */

CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY,
  email           VARCHAR(190) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  nom             VARCHAR(190) NOT NULL DEFAULT '',
  telephone       VARCHAR(60)  NOT NULL DEFAULT '',
  photo           MEDIUMTEXT   NULL,
  role            VARCHAR(30)  NOT NULL DEFAULT 'Membre',
  club_id         VARCHAR(36)  NULL,
  statut          VARCHAR(30)  NOT NULL DEFAULT 'Actif',
  two_fa          TINYINT(1)   NOT NULL DEFAULT 0,
  two_fa_code     VARCHAR(10)  NULL,
  reset_code      VARCHAR(10)  NULL,
  onboarding_done TINYINT(1)   NOT NULL DEFAULT 0,
  is_superadmin   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ============================ CLUBS ============================ */

CREATE TABLE IF NOT EXISTS clubs (
  id                 VARCHAR(36)  NOT NULL PRIMARY KEY,
  code               VARCHAR(8)   NOT NULL UNIQUE,
  nom                VARCHAR(190) NOT NULL DEFAULT 'Ma tontine',
  ville              VARCHAR(120) NOT NULL DEFAULT '',
  type               VARCHAR(40)  NOT NULL DEFAULT 'Rotative',
  devise             VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  montant_cotisation DOUBLE       NOT NULL DEFAULT 0,
  montant_tour       DOUBLE       NOT NULL DEFAULT 0,
  frequence          VARCHAR(30)  NOT NULL DEFAULT 'Mensuelle',
  penalite_retard    DOUBLE       NOT NULL DEFAULT 0,
  taux_pret          DOUBLE       NOT NULL DEFAULT 0,
  date_debut         DATE         NULL,
  banque             VARCHAR(190) NOT NULL DEFAULT '',
  statut             VARCHAR(30)  NOT NULL DEFAULT 'Preparation',
  created_by         VARCHAR(36)  NULL,
  created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clubs_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ordre de passage (séquence des tours) : une ligne par position.
CREATE TABLE IF NOT EXISTS ordre_passage (
  club_id    VARCHAR(36) NOT NULL,
  position   INT         NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  PRIMARY KEY (club_id, position),
  INDEX idx_op_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Comptes de caisse : soldes par devise/compte (ex. XAF/Caisse, XAF/OM…).
CREATE TABLE IF NOT EXISTS comptes_caisse (
  club_id  VARCHAR(36)  NOT NULL,
  devise   VARCHAR(10)  NOT NULL,
  compte   VARCHAR(60)  NOT NULL,
  solde    DOUBLE       NOT NULL DEFAULT 0,
  PRIMARY KEY (club_id, devise, compte)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_membres_club (club_id),
  INDEX idx_membres_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ============================ FINANCE ============================ */

CREATE TABLE IF NOT EXISTS cotisations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  montant    DOUBLE       NOT NULL DEFAULT 0,
  devise     VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  periode    VARCHAR(20)  NOT NULL DEFAULT '',
  date_paiement DATE      NULL,
  methode    VARCHAR(40)  NOT NULL DEFAULT '',
  reference  VARCHAR(40)  NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cot_club (club_id),
  INDEX idx_cot_membre (membre_id),
  INDEX idx_cot_periode (club_id, periode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mouvements (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  sens       ENUM('in','out') NOT NULL DEFAULT 'in',
  compte     VARCHAR(60)  NOT NULL DEFAULT 'Caisse',
  montant    DOUBLE       NOT NULL DEFAULT 0,
  devise     VARCHAR(10)  NOT NULL DEFAULT 'XAF',
  date_mvt   DATE         NULL,
  note       TEXT         NULL,
  piece      TEXT          NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mv_club_date (club_id, date_mvt),
  INDEX idx_mv_membre (membre_id),
  INDEX idx_mv_type (club_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS penalites (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  montant    DOUBLE       NOT NULL DEFAULT 0,
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_pen   DATE         NULL,
  payee      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pen_club (club_id),
  INDEX idx_pen_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS epargne (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(30)  NOT NULL DEFAULT 'Volontaire',
  solde      DOUBLE       NOT NULL DEFAULT 0,
  bloquee    DOUBLE       NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ep_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Versements d'épargne (historique détaillé).
CREATE TABLE IF NOT EXISTS epargne_versements (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  epargne_id VARCHAR(64)  NOT NULL,
  montant    DOUBLE       NOT NULL DEFAULT 0,
  date_v     DATE         NULL,
  INDEX idx_ev_epargne (epargne_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS groupes_epargne (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  nom        VARCHAR(190) NOT NULL DEFAULT '',
  solde      DOUBLE       NOT NULL DEFAULT 0,
  objectif   DOUBLE       NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ge_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Composition des groupes (n-n).
CREATE TABLE IF NOT EXISTS groupe_membres (
  groupe_id  VARCHAR(64) NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  PRIMARY KEY (groupe_id, membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS prets (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id      VARCHAR(36)  NOT NULL,
  membre_id    VARCHAR(64)  NOT NULL,
  montant      DOUBLE       NOT NULL DEFAULT 0,
  taux         DOUBLE       NOT NULL DEFAULT 0,
  interet      DOUBLE       NOT NULL DEFAULT 0,
  reste        DOUBLE       NOT NULL DEFAULT 0,
  statut       VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  motif        VARCHAR(255) NOT NULL DEFAULT '',
  date_demande DATE         NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_membre (membre_id),
  INDEX idx_pr_club_statut (club_id, statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Garants d'un prêt (n-n).
CREATE TABLE IF NOT EXISTS pret_garants (
  pret_id   VARCHAR(64) NOT NULL,
  garant_id VARCHAR(64) NOT NULL,
  PRIMARY KEY (pret_id, garant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS redistributions (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  total      DOUBLE       NOT NULL DEFAULT 0,
  date_red   DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rd_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Parts individuelles d'une redistribution.
CREATE TABLE IF NOT EXISTS redistribution_parts (
  redistribution_id VARCHAR(64) NOT NULL,
  membre_id         VARCHAR(64) NOT NULL,
  montant           DOUBLE     NOT NULL DEFAULT 0,
  PRIMARY KEY (redistribution_id, membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS aides (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  montant    DOUBLE       NOT NULL DEFAULT 0,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'En attente',
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_aide  DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ai_club (club_id),
  INDEX idx_ai_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ============================ VIE DU CLUB ============================ */

CREATE TABLE IF NOT EXISTS seances (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  titre      VARCHAR(190) NOT NULL DEFAULT '',
  date_s     DATE         NULL,
  lieu       VARCHAR(190) NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Planifiée',
  pv         TEXT         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_se_club_date (club_id, date_s)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pointage des présences par séance.
CREATE TABLE IF NOT EXISTS seance_presences (
  seance_id  VARCHAR(64) NOT NULL,
  membre_id  VARCHAR(64) NOT NULL,
  present    TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (seance_id, membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS convocations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  seance_id  VARCHAR(64)  NULL,
  canal      VARCHAR(40)  NOT NULL DEFAULT '',
  message    TEXT         NULL,
  envoyees   INT          NOT NULL DEFAULT 0,
  date_c     DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cv_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parrainages (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  parrain_id VARCHAR(64)  NOT NULL,
  date_p     DATE         NULL,
  INDEX idx_pa_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reclamations (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  sujet      VARCHAR(190) NOT NULL DEFAULT '',
  detail     TEXT         NULL,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Ouverte',
  reponse    TEXT         NULL,
  date_r     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rc_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sanctions (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  motif      VARCHAR(255) NOT NULL DEFAULT '',
  date_s     DATE         NULL,
  INDEX idx_sa_membre (membre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rapports (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  periode    VARCHAR(40)  NOT NULL DEFAULT '',
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Soumis',
  auteur     VARCHAR(190) NOT NULL DEFAULT '',
  resume     TEXT         NULL,
  date_r     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ra_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alertes (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  auteur     VARCHAR(190) NOT NULL DEFAULT '',
  type       VARCHAR(40)  NOT NULL DEFAULT '',
  message    TEXT         NULL,
  statut     VARCHAR(30)  NOT NULL DEFAULT 'Ouverte',
  date_a     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audits (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  cible      VARCHAR(190) NOT NULL DEFAULT '',
  verdict    VARCHAR(30)  NOT NULL DEFAULT '',
  note       TEXT         NULL,
  auditeur   VARCHAR(190) NOT NULL DEFAULT '',
  date_au    DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_au_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS annonces (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  message    TEXT         NULL,
  canal      VARCHAR(40)  NOT NULL DEFAULT '',
  cible      VARCHAR(120) NOT NULL DEFAULT '',
  date_n     DATE         NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_an_club (club_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  club_id    VARCHAR(36)  NOT NULL,
  membre_id  VARCHAR(64)  NOT NULL,
  titre      VARCHAR(190) NOT NULL DEFAULT '',
  message    TEXT         NULL,
  lu         TINYINT(1)   NOT NULL DEFAULT 0,
  date_n     DATETIME     NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_nt_membre (membre_id, lu)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/* ============================ TRANSPORT (synchronisation front) ============================ */

CREATE TABLE IF NOT EXISTS records (
  entity     VARCHAR(32) NOT NULL,
  id         VARCHAR(64) NOT NULL,
  club_id    VARCHAR(36) NOT NULL,
  user_id    VARCHAR(36) NULL,
  payload    JSON        NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (entity, id),
  INDEX idx_club_entity (club_id, entity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
