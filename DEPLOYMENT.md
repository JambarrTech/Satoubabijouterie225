# Déploiement — Vercel (frontend + backend serverless) + Neon (PostgreSQL)

Ce guide décrit comment déployer la plateforme Satouba Bijouterie 255 en production : Vercel pour le
frontend React et le backend Express (serverless), Neon pour la base PostgreSQL, Vercel Blob
pour les uploads d'images et Upstash Redis pour le rate limiting partagé.

## Architecture du monorepo

- `backend/` — API Express (`backend/app.ts`), Prisma (`backend/prisma/`), serveur complet
  (`backend/server.ts` qui monte l'API + les 2 frontends buildés).
- `client/` — boutique en ligne (React + Vite), build dans `client/dist`.
- `gerant/` — espace d'administration (React + Vite, base `/gerant/`), build dans `gerant/dist`.
- `api/index.ts` — handler Vercel serverless qui ré-exporte `backend/app.ts`.

## Architecture

- **Vercel Functions** : `api/index.ts` expose l'app Express (`backend/app.ts`) comme
  handler serverless. Toutes les routes `/api/*` sont réécrites vers `/api`.
- **Vercel Blob** : les uploads d'images passent par `@vercel/blob/client` côté frontend
  (flag `VITE_UPLOAD_BLOB=true`) avec fallback disque local (multer) en dev.
- **Upstash Redis** : rate limiting côté serveur via REST (fail-open si indisponible).
- **Neon (PostgreSQL)** : Prisma avec `provider = "postgresql"`. Le schéma a été migré de
  MySQL vers Postgres (`backend/prisma/schema.prisma`, migration `20260829000000_init`).

## Variables d'environnement à créer dans Vercel

Dans le projet, ajouter (Project Settings → Environment Variables, scope Production) :

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Connection string Neon `postgresql://...?sslmode=require` (endpoint pooled `-pooler`) |
| `DIRECT_URL` | Endpoint Neon **direct** (sans `-pooler`) pour Prisma `db push` |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Secret aléatoire long pour signer les JWT |
| `BLOB_READ_WRITE_TOKEN` | Token du store Vercel Blob (créer via Vercel Storage) |
| `VITE_UPLOAD_BLOB` | `true` (activer l'upload Vercel Blob côté frontend) |
| `UPSTASH_REDIS_REST_URL` | REST URL de la base Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de la base Upstash Redis |
| `APP_URL` / `API_URL` | URL de production `https://<ton-domaine>.vercel.app` |
| `CORS_ORIGIN` | Origines autorisées, ex. `https://satouba.vercel.app` |

| Variable | Valeur |
| --- | --- |
| `COUNTRY_CODE` | `225` (Côte d'Ivoire) |
| `CONTACT_PHONE` | Ex. `+225 07 47 13 52 01` |

### Firestore / Push / SMS
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Admin SDK) +
  les `VITE_FIREBASE_*` (frontend).
- `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID`.

> Les variables préfixées `VITE_` doivent étre définies **avec** leur valeur réelle dans
> Vercel (elles sont inlinées au build). `VITE_FIREBASE_PRIVATE_KEY` contient des `\n` :
> les encoder en `\\n` dans la valeur envoyée. Les configs Vite (`client/`, `gerant/`)
> pointent `envDir` vers la racine : un seul `.env` suffit.

## Étapes de déploiement

1. **Base de données** : créer un projet sur Neon, copier la connection string
   `postgresql://...`, définir `DATABASE_URL`.
2. **Migrations** : pousser le schéma sur la base Neon.
   ```
   npm run db:push    # prisma db push --schema backend/prisma/schema.prisma
   ```
   > ⚠️ **Neon + `prisma migrate deploy`** : Neon ne supporte pas de façon fiable les
   > advisory locks de session (`pg_advisory_lock`) utilisés par `prisma migrate` → la
   > commande échoue par timeout. Utilise donc **`prisma db push`** (testé OK, ne dépend pas
   > des advisory locks) pour déployer/pousser le schéma. Le pipeline de migration
   > (`prisma/migrations/.../migration.sql`) reste disponible pour les autres environnements.
   >
   > `DB_*` : le schéma définit `url = env("DATABASE_URL")` (pooled) et
   > `directUrl = env("DIRECT_URL")` (endpoint Neon direct sans `-pooler`). Le client
   > utilise `DATABASE_URL` ; les opérations d'administration peuvent passer par `DIRECT_URL`.
3. **Storage Blob** : Vercel → Storage → Create → Blob. Copier le token
   `BLOB_READ_WRITE_TOKEN`. Définir `VITE_UPLOAD_BLOB=true`.
4. **Upstash** : console.upstash.com → Create database → copier REST URL et token.
5. **Vercel** : importer le repo. Le `vercel.json` gére le build
   (`prisma generate` puis `vite build` de `client` et `gerant`), l'assemble des deux
   builds dans `dist/` (`assemble-vercel.mjs`), l'`outputDirectory: "dist"`, les rewrites
   `/api/*` → `/api`, `/gerant/*` → `/gerant/index.html`, le fallback SPA client, ainsi
   que la config de la fonction API (30 s max, 1024 MB).
6. Ajouter toutes les variables d'environnement, puis **Deploy**.

## Vérifications

- `npm run lint` (tsc --noEmit backend + client + gérant) → 0 erreur.
- `npm run test` → 27 tests passent.
- `npm run build` → `client/dist`, `gerant/dist`, `backend/dist/server.cjs`.
- `npm run start` (`node backend/dist/server.cjs`) sert l'API + les 2 frontends en statique.

## Dev local (MySQL via XAMPP)

Le serveur `npm run dev` sert l'API Express + les 2 Vite middleware (client à la racine,
gérant sous `/gerant`). Pour le faire tourner en local :

1. **XAMPP** : démarrer MySQL depuis le panneau de contrôle XAMPP.
2. **Créer la base** : dans phpMyAdmin (`http://localhost/phpmyadmin`), créer une base
   nommée `satouba` (utf8mb4).
3. **Configurer** : le fichier `.env.local` (à la racine) est pré-configuré pour MySQL local :
   ```
   DB_PROVIDER="mysql"
   DATABASE_URL="mysql://root:@localhost:3306/satouba"
   ```
4. **Pousser le schéma** :
   ```
   npm run db:push:local
   ```
5. **Seeder** (optionnel) :
   ```
   npm run db:seed:local
   ```
6. **Lancer** :
   ```
   npm run dev
   ```

> Le provider est `env("DB_PROVIDER")` : `"mysql"` en local, `"postgresql"` en prod (Neon).
> Le serveur charge `.env.local` puis `.env` au démarrage (voir `backend/server.ts`).

## Vulnérabilités npm

- `uuid` (moderate, 8) : transitives via la pile `firebase-admin`/Google Cloud. Ne pas
  forcer `npm audit fix --force` (casserait firebase-admin 12 → 14, breaking). Low risk
  pratique.
