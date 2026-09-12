# Déployer TontiGest en ligne GRATUITEMENT (Render)

Deux options gratuites — Render est la plus simple pour Node + MySQL.

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
  - **tontigest-db** (base MySQL, plan free)

### 3. Renseigner les secrets dans le dashboard Render
Avant de cliquer "Apply", Render te demande les valeurs marquées `sync: false` :
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` → choisis un mot de passe fort
- `GENIUSPAY_PUBLIC_KEY` / `GENIUSPAY_SECRET_KEY` → tes clés sandbox GeniusPay (pk_sandbox_… / sk_sandbox_…)
- `MAILJET_API_KEY` / `MAILJET_SECRET_KEY` → tes clés Mailjet
- `MAILJET_SENDER_EMAIL` → ton email expéditeur validé dans Mailjet

### 4. Déployer
Clique **Apply** — Render installe, build le front, démarre le serveur.
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
- La base MySQL gratuite est **persistante** (1 Go, 25 connexions max).
- 750 heures/mois d'exécution — largement suffisant pour une app qui tourne en continu.

## Option B — Alternative gratuite : Railway (essai) ou VPS Oracle Cloud

- **Oracle Cloud Always Free** (https://cloud.oracle.com) : 2 VMs gratuits à vie,
  mais installation manuelle de Node + MySQL — plus technique.
- **Railway** (https://railway.app) : 5$ de crédit d'essai, MySQL inclus — pas 100% gratuit à vie.

## Après le déploiement

1. Connecte-toi avec le superadmin → crée tes clubs de test
2. Teste un paiement sandbox GeniusPay depuis l'app en ligne
3. Pour passer GeniusPay en production : dans le dashboard GeniusPay, récupère tes
   clés `pk_live_…`/`sk_live_…`, puis dans Render → Environment → change
   `GENIUSPAY_PUBLIC_KEY`, `GENIUSPAY_SECRET_KEY` et mets `GENIUSPAY_SANDBOX=false`
4. Quand ton compte Mailjet est débloqué (vérifie ta boîte mail — ils t'ont sûrement
   envoyé un lien d'activation), les emails partiront automatiquement sans rien changer.

## Sauvegardes

Le plan MySQL free de Render fait des sauvegardes quotidiennes automatiques (7 jours de rétention).
Pour une sauvegarde manuelle : `mysqldump` depuis ton PC vers la base Render (ipAllowList vide =
accessible uniquement via le service Render ; ajoute ton IP dans le dashboard si besoin).
