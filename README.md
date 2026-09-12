# TontiGest — Gestion de tontine

TontiGest est une application de gestion de tontine (tontine camerounaise) : un serveur
Node.js/Express héberge l'API et l'interface, et stocke toutes les données dans une base
**PostgreSQL** (Render Postgres en production, local ou MySQL en développement).

Chaque rôle dispose de son espace dédié — Président, Trésorier, Secrétaire, Commissaire aux
comptes, Membre — plus un compte superadministrateur pour superviser l'ensemble,
une **messagerie interne** entre membres et des **emails automatiques**.

## Fonctionnalités principales

- **Président** : pilotage de la tontine, bureau exécutif, membres (formulaire validé + ajout en lot),
  calendrier de passage (validation notifiée, tours servis réels), sanctions, rapports, alertes,
  diffusion ciblée (tous / retardataires / bureau) avec relais email.
- **Trésorier** : cotisations (Orange Money, MTN MoMo, carte, espèces), **caisse multi-comptes
  configurables** (création, suppression, approvisionnement, retrait, virements internes, journal
  filtrable), opérations bancaires et rapprochement, pénalités, épargne (ouverture de comptes),
  prêts internes, intérêts redistribués (caisse débitée), aides sociales, rapports et clôtures.
- **Secrétaire** : séances et pointage des présences (validation archivée, absents notifiés),
  PV automatiques, convocations avec relais email, parrainages, réclamations,
  **archives exportables en PDF**.
- **Commissaire aux comptes** : audit des transactions, vue détaillée par membre
  **avec fiche d'audit PDF par membre**, rapports d'audit PDF,
  signalement de fraude notifiant réellement président et trésorier.
- **Membre** : paiement de cotisation (GeniusPay), historique et **reçus PDF**,
  calendrier de passage réel, prêts avec garants, aides, épargne,
  **messagerie interne**, **mes réclamations**, **mes pénalités**.
- **Messagerie interne** : conversations directes et de groupe entre membres d'un même club,
  compteur de non-lus, relais email automatique si Mailjet configuré.
- **Emails automatiques** : bienvenue à l'inscription, confirmation et validation de cotisation,
  convocations, nouveaux messages (Mailjet).
- **Double authentification réelle** : code généré et vérifié par le serveur (SMS Twilio ou email
  Mailjet ; mode simulation honnête affiché si aucun canal).
- **RBAC serveur** : chaque rôle ne peut écrire que ses entités (un Membre ne peut plus
  créer sanctions/pénalités via l'API).
- **Superadmin** : vue globale consolidée, clubs et utilisateurs avec recherche,
  détail riche d'un club (trésorerie, caisses, membres), suspension/réactivation.

### Exports PDF uniquement

Tous les documents de l'application se téléchargent en **PDF natif** (jsPDF, 100 % hors-ligne,
typographie A4 avec en-tête club, zébrures de tableaux et pied de page numéroté) :
reçus de cotisation, attestations de membre, listes de membres, listes de présence, procès-verbaux,
rapports financiers, rapports d'audit, fiches d'audit par membre, bordereaux bancaires,
bordereaux de versement d'épargne et archives complètes. Aucun export CSV/Excel,
aucune impression navigateur.

### Schéma relationnel complet

La base `tontigest` est **entièrement relationnelle** (34 tables) : en plus des tables de
transport `users`, `clubs`, `records` et de messagerie `conversations`,
`conversation_participants`, `messages`, chaque opération de l'application est projetée en
temps réel dans des tables dédiées — `membres`, `ordre_passage`, `comptes_caisse`,
`caisse_params`, `cotisations`, `mouvements`, `penalites`, `epargne`, `epargne_versements`,
`groupes_epargne`, `groupe_membres`, `prets`, `pret_garants`, `redistributions`,
`redistribution_parts`, `aides`, `seances`, `seance_presences`, `convocations`,
`parrainages`, `reclamations`, `sanctions`, `rapports`, `alertes`, `audits`, `annonces`,
`notifications`, `payment_transactions`.

## Prérequis

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **PostgreSQL 14+** (production) ou **MySQL 8** (développement local)

Copiez `.env.example` en `.env` puis ajustez :

- `DB_CLIENT=pg` + `DATABASE_URL` → PostgreSQL (schéma appliqué au démarrage) ;
- ou laissez `DB_CLIENT` vide + `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` → MySQL local.

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer la base + le schéma + le compte superadministrateur
npm run setup-db

# 3. Compiler l'interface et démarrer le serveur
npm start
```

L'application est ensuite accessible sur **http://localhost:8787**.

### Autres commandes

| Commande | Rôle |
|---|---|
| `npm run setup-db` | Crée la base `tontigest`, applique le schéma (31 tables), insère le superadmin |
| `npm start` | Compile le front (`vite build`) puis sert l'app sur le port 8787 |
| `npm run dev` | Mode développement : Vite (HMR) + serveur API simultanés |
| `npm run server` | Démarre uniquement le serveur Express (API + `dist/`) |
| `npm run build` | Compile uniquement l'interface dans `dist/` |
| `npm run lint` | Vérification ESLint du projet |

> Le serveur crée automatiquement la base si elle n'existe pas (MySQL) et applique le schéma
> (PostgreSQL ou MySQL) à chaque démarrage. **Aucune donnée fictive n'est insérée** : tous les
> clubs, membres et opérations sont créés depuis l'application.

## Comptes

### Superadministrateur

Défini via les variables d'environnement `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`
(fichier `.env` — voir `.env.example`). Créé automatiquement au premier démarrage.

Le superadmin voit tous les clubs et utilisateurs (avec recherche), peut ouvrir n'importe quel
club en consultation détaillée (trésorerie, caisses, membres, cotisations), suspendre/réactiver
des comptes et des clubs. Son mot de passe est modifiable depuis l'application (Mon profil).

## Architecture

```
tontigest/
├── server/            Backend Express + PostgreSQL/MySQL (API REST + serveur statique)
│   ├── index.js       Point d'entrée : démarre sur http://localhost:8787
│   ├── config.js      Paramètres (DB, port, JWT) surchargeables via .env
│   ├── db.js          Pool polyglotte pg/mysql2, schéma + migrations au démarrage
│   ├── schema.sql     DDL MySQL (développement local)
│   ├── schema.pg.sql  DDL PostgreSQL (production Render)
│   ├── relational.js  Projecteurs : chaque opération → tables relationnelles (double écriture)
│   ├── migrate.js     Migration initiale records → tables relationnelles
│   ├── seed.js        Création du superadmin uniquement (aucune donnée fictive)
│   ├── auth.js        bcrypt + JWT, middlewares requireAuth / requireSuper
│   ├── routes.js      Toutes les routes /api/* (clubs, records, messagerie, paiements, admin)
│   ├── payments.js    Passerelle GeniusPay (sandbox/production) + emails automatiques
│   └── notify.js      Emails Mailjet + SMS Twilio + 2FA multicanal
├── src/               Interface React 19 (Vite + Tailwind v4)
│   ├── lib/api.js     Client REST (JWT stocké localement)
│   ├── lib/pdf.js     Génération PDF (jsPDF) de tous les documents du club
│   ├── lib/store.jsx  État global, synchronisation diff vers l'API
│   ├── components/    UI, icônes vectorielles (lucide), mise en page, graphiques
│   └── pages/         Une page par espace (président, trésorier, messagerie, …)
└── render.yaml        Blueprint Render (web service + PostgreSQL managé)
```

L'application ne dépend d'**aucun service obligatoire en ligne** : les polices (Fraunces,
Plus Jakarta Sans) sont auto-hébergées via `@fontsource`, et les passerelles externes
(GeniusPay, Mailjet, Twilio) basculent en mode simulation honnête si elles ne sont pas
configurées — l'in-app reste la source principale.

## Sécurité et avertissements

- Le secret JWT et le mot de passe de base sont livrés par défaut pour un usage **local
  uniquement** ; surchargez-les via `.env` avant tout autre usage.
- La double authentification est **vérifiée par le serveur** ; sans passerelle SMS/Email
  configurée, le code est affiché dans l'application en mode simulation honnête.
- Un utilisateur n'accède qu'aux données de son club ; seul le superadmin peut consulter
  tous les clubs. Le RBAC serveur limite chaque rôle à ses entités d'écriture.
