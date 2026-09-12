# Déployer TontiGest en ligne GRATUITEMENT (Render)

Stack de production : **web service Node (free) + Render PostgreSQL (free)**.
La migration de la base est automatique — le serveur détecte `DB_CLIENT=pg` +
`DATABASE_URL`, applique le schéma PostgreSQL au premier démarrage et crée
le compte superadmin.

## Option A — Render (recommandé, 100% gratuit)

### 1. Préparer le dépôt GitHub
```bash
# Dans le dossier du projet :
git add -A
git commit -m "TontiGest prêt pour déploiement"
git push origin main
```
⚠️ Vérifie que `.env` est bien dans `.gitignore` (déjà fait) — tes clés ne doivent JAMAIS être sur GitHub.

### 2. Créer le compte Render
- Va sur **https://render.com** → sign up avec GitHub (gratuit)
- Clique **New + → Blueprint** et sélectionne ton repo TontiGest
- Render lit automatiquement le fichier `render.yaml` présent à la racine et crée :
  - **tontigest** (web service Node, plan free)
  - **tontigest-db** (base **PostgreSQL**, plan free, 1 Go)

### 3. Renseigner les secrets dans le dashboard Render
Avant de cliquer "Apply", Render te demande les valeurs marquées `sync: false` :
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` → choisis un mot de passe fort
- `GENIUSPAY_PUBLIC_KEY` / `GENIUSPAY_SECRET_KEY` → tes clés sandbox GeniusPay (pk_sandbox_… / sk_sandbox_…)
- `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` → tes clés Mailjet
- `MAILJET_SENDER_EMAIL` → ton email expéditeur validé dans Mailjet

`DATABASE_URL` est injecté automatiquement par Render depuis la base créée —
tu n'as rien à configurer pour la base.

### 4. Déployer
Clique **Apply** — Render installe, build le front, démarre le serveur.
Au premier démarrage, le serveur :
1. se connecte à PostgreSQL via `DATABASE_URL` (TLS interne Render) ;
2. applique `server/schema.pg.sql` (34 tables) ;
3. crée le superadmin depuis `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.

Ton app est en ligne sur `https://tontigest.onrender.com` (URL exacte affichée dans le dashboard).

### 5. Renseigner le retour GeniusPay
Dans ton dashboard GeniusPay (geniuspay.ci/dashboard), pointe l'URL de notification vers :
```
https://TON-URL-RENDER.onrender.com/api/payments/geniuspay/notify
```

## ⚠️ Limites du plan gratuit Render
- **Le service web s'endort après 15 min sans visiteur** — la première visite après une pause prend ~30 s (réveil).
  - Solution gratuite : crée un cron sur **https://cron-job.org** (gratuit) qui appelle
    `https://ton-app.onrender.com/api/health` toutes les 10 minutes → jamais d'endormissement.
- **La base PostgreSQL free expire 90 jours après sa création** (les bases free de
  Render sont temporaires). Render t'envoie un email avant l'expiration — recrée
  simplement une base et change `DATABASE_URL` (les données peuvent être exportées
  avant via `pg_dump`). Pour une base permanente : plan Starter (~7 $/mois).
- PostgreSQL free : 1 Go, 20 connexions max (largement suffisant pour un club).
- 750 heures/mois d'exécution — largement suffisant pour une app qui tourne en continu.

## Option B — Alternative gratuite : VPS Oracle Cloud

- **Oracle Cloud Always Free** (https://cloud.oracle.com) : 2 VMs gratuits à vie,
  mais installation manuelle de Node + PostgreSQL — plus technique.
- **Railway** (https://railway.app) : 5$ de crédit d'essai — pas 100% gratuit à vie.

## Après le déploiement

1. Connecte-toi avec le superadmin → crée tes clubs de test
2. Teste un paiement sandbox GeniusPay depuis l'app en ligne
3. Teste la messagerie interne : deux comptes, une conversation, un message
4. Pour passer GeniusPay en production : dans le dashboard GeniusPay, récupère tes
   clés `pk_live_…`/`sk_live_…`, puis dans Render → Environment → change
   `GENIUSPAY_PUBLIC_KEY`, `GENIUSPAY_SECRET_KEY` et mets `GENIUSPAY_SANDBOX=false`
5. Quand ton compte Mailjet est débloqué (vérifie ta boîte mail — ils t'ont sûrement
   envoyé un lien d'activation), les emails partiront automatiquement sans rien changer.

## Sauvegardes

Pour sauvegarder la base PostgreSQL : depuis ton PC avec `psql`/`pg_dump` en utilisant
la **External Database URL** du dashboard Render (ajoute ton IP dans Access Control
si nécessaire) :
```bash
pg_dump "postgresql://user:pass@host/tontigest_db" -F c -f sauvegarde-tontigest.pg
```
