# TontiGest — Gestion de tontine

TontiGest est une application de gestion de tontine (tontine camerounaise) qui fonctionne
**entièrement en local**, sans service distant : un serveur Node.js/Express héberge l'API et
l'interface, et stocke toutes les données dans une base **MySQL** installée sur votre machine.

Chaque rôle dispose de son espace dédié — Président, Trésorier, Secrétaire, Commissaire aux
comptes, Membre — plus un compte superadministrateur pour superviser l'ensemble.

## Fonctionnalités principales

- **Président** : pilotage de la tontine, bureau exécutif, membres (formulaire validé + ajout en lot),
  sanctions, rapports, alertes, diffusion.
- **Trésorier** : cotisations (Orange Money, MTN MoMo, carte, espèces), **caisse multi-comptes
  configurables** (création, suppression, approvisionnement, retrait, virements internes, journal
  filtrable), opérations bancaires et rapprochement, pénalités, épargne, prêts internes,
  intérêts redistribués, aides sociales, enchères, rapports et clôtures.
- **Secrétaire** : séances et pointage des présences, PV automatiques, convocations, parrainages,
  réclamations, **archives exportables en PDF**.
- **Commissaire aux comptes** : audit des transactions, vue détaillée par membre (cotisations, pénalités,
  épargne, prêts, aides, sanctions, assiduité) **avec fiche d'audit PDF par membre**, rapports d'audit PDF,
  signalement de fraude au président.
- **Membre** : paiement de cotisation, historique et **reçus PDF**, calendrier de passage, prêts avec garants
  (formulaire validé), aides, épargne, enchères, **attestation de membre PDF**.
- **Bascule de rôle** : tout membre du bureau peut basculer à tout moment vers son espace Membre.
- **Démarrage sécurisé** : la tontine ne peut démarrer que lorsque le Président et le Trésorier sont nommés.
- **Double authentification** et réinitialisation de mot de passe (codes affichés dans l'app — mode local,
  sans passerelle SMS).

### Exports PDF uniquement

Tous les documents de l'application se téléchargent en **PDF natif** (jsPDF, 100 % hors-ligne,
typographie A4 avec en-tête club, zébrures de tableaux et pied de page numéroté) :
reçus de cotisation, attestations de membre, listes de membres, listes de présence, procès-verbaux,
rapports financiers, rapports d'audit, fiches d'audit par membre, bordereaux bancaires,
bordereaux de versement d'épargne et archives complètes. Aucun export CSV/Excel,
aucune impression navigateur.

### Schéma relationnel complet

La base MySQL `tontigest` est **entièrement relationnelle** (31 tables) : en plus des tables de
transport `users`, `clubs` et `records`, chaque opération de l'application est projetée en temps réel
dans des tables dédiées — `membres`, `ordre_passage`, `comptes_caisse`, `cotisations`, `mouvements`,
`penalites`, `epargne`, `epargne_versements`, `groupes_epargne`, `groupe_membres`, `prets`,
`pret_garants`, `redistributions`, `redistribution_parts`, `aides`, `encheres`, `enchere_offres`,
`seances`, `seance_presences`, `convocations`, `parrainages`, `reclamations`, `sanctions`,
`rapports`, `alertes`, `audits`, `annonces`, `notifications`. Le superadmin visualise l'état de
chaque table (lignes peuplées) depuis son tableau de bord.

## Prérequis

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **MySQL 8** installé et démarré localement (port 3306)

La connexion par défaut est `root` / `gildas123` sur `127.0.0.1:3306`. Pour utiliser d'autres
identifiants, copiez `.env.example` en `.env` et ajustez `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
et `DB_NAME`.

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

> Le serveur crée automatiquement la base si elle n'existe pas et applique le schéma à chaque
> démarrage. **Aucune donnée fictive n'est insérée** : tous les clubs, membres et opérations sont
> créés depuis l'application et enregistrés dans MySQL.

## Comptes

### Superadministrateur

| Email | Mot de passe |
|---|---|
| `admin@tontigest.cm` | `SuperAdmin2026!` |

Le superadmin voit tous les clubs et utilisateurs, peut ouvrir n'importe quel club en consultation
et réinitialiser les mots de passe. Le sien est modifiable depuis l'application (Mon profil).

## Architecture

```
tontigest/
├── server/            Backend Express + MySQL (API REST + serveur statique)
│   ├── index.js       Point d'entrée : démarre sur http://localhost:8787
│   ├── config.js      Paramètres (MySQL, port, JWT) surchargeables via .env
│   ├── db.js          Pool mysql2, création base + schéma + migrations au démarrage
│   ├── schema.sql     DDL MySQL complet (31 tables relationnelles)
│   ├── relational.js  Projecteurs : chaque opération → tables relationnelles (double écriture)
│   ├── migrate.js     Migration initiale records → tables relationnelles
│   ├── seed.js        Création du superadmin uniquement (aucune donnée fictive)
│   ├── auth.js        bcrypt + JWT, middlewares requireAuth / requireSuper
│   ├── routes.js      Toutes les routes /api/* (dont /admin/db-stats)
│   └── setup.js       Script `npm run setup-db`
├── src/               Interface React 19 (Vite + Tailwind v4)
│   ├── lib/api.js     Client REST (JWT stocké localement)
│   ├── lib/pdf.js     Génération PDF (jsPDF) de tous les documents du club
│   ├── lib/store.jsx  État global, synchronisation diff vers l'API
│   ├── components/    UI, icônes vectorielles (lucide), mise en page, graphiques
│   └── pages/         Une page par espace (président, trésorier, …)
└── db/schema.sql      Renvoie vers server/schema.sql (historique)
```

L'application ne dépend d'**aucun service en ligne** : les polices (Fraunces, Plus Jakarta Sans)
sont auto-hébergées via `@fontsource`, et toutes les données restent dans MySQL.

## Sécurité et avertissements

- Le secret JWT et le mot de passe MySQL sont livrés par défaut pour un usage **local uniquement** ;
  surchargez-les via `.env` avant tout autre usage.
- La double authentification et la réinitialisation de mot de passe fonctionnent **sans passerelle
  SMS/Email** : le code à saisir est affiché directement dans l'application (choix assumé du mode local).
- Un utilisateur n'accède qu'aux données de son club ; seul le superadmin peut consulter tous les clubs.
