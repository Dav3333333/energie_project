# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.




# Galerie Énergie Manager

Application web **PWA mobile-first** de gestion manuelle de la distribution, du suivi et de la facturation d'électricité dans une ou plusieurs galeries commerciales.

> **Version 1 — sans IoT.** Les relevés sont saisis manuellement par un administrateur ou un technicien. L'architecture prépare l'ajout futur d'ESP32 / MQTT (voir `docs/FUTURE_IOT.md`).

## Sommaire
- [Fonctionnalités](#fonctionnalités)
- [Rôles](#rôles)
- [Stack](#stack)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration Firebase](#configuration-firebase)
- [Variables d'environnement](#variables-denvironnement)
- [Développement](#développement)
- [Création du premier SUPER_ADMIN](#création-du-premier-super_admin)
- [Déploiement](#déploiement)
- [Tests](#tests)
- [Sécurité](#sécurité)
- [Limites du MVP](#limites-du-mvp)
- [Roadmap](#roadmap)

## Fonctionnalités

- Multi-galeries, multi-boutiques, multi-compteurs
- Relevés manuels d'index (kWh) avec contrôle de cohérence
- Achats de kWh avec reçus numérotés
- Recalcul automatique du crédit énergétique restant
- Estimation de la date d'épuisement
- Alertes crédit faible / critique / épuisé + coupures
- Incidents techniques
- Factures / relevés PDF côté serveur
- Rapports de consommation
- État du courant déclaré manuellement (disponible / coupure / instable / inconnu)
- Audit de toutes les opérations sensibles
- PWA installable, responsive, utilisable hors ligne en lecture

## Rôles

| Rôle | Portée |
|---|---|
| SUPER_ADMIN | Toutes les galeries |
| GALLERY_ADMIN | Galeries assignées |
| TECHNICIAN | Relevés, incidents, état du courant |
| SHOP_OWNER | Boutiques assignées |
| SHOP_WORKER | Informations limitées de la boutique |

## Stack

- React 18 + Vite + JavaScript (pas de TypeScript)
- Tailwind CSS 3, design system mobile-first
- Firebase Auth (email + username) et Firestore
- Netlify pour l'hébergement du frontend
- TanStack React Query, Zustand, React Hook Form, Zod
- Recharts, date-fns, jsPDF, Lucide React, Sonner
- vite-plugin-pwa (Workbox)

## Prérequis

- Node.js 20 LTS
- npm 10+
- Firebase CLI 13+ (`npm i -g firebase-tools`)
- Un projet Firebase gratuit avec Authentication et Firestore activés

## Installation

```bash
git clone <votre-repo> galerie-energie-manager
cd galerie-energie-manager
npm install
cp .env.example .env
cp .firebaserc.example .firebaserc
# Renseigner .env et .firebaserc
npm run dev

## Mode gratuit

Le frontend est hébergé sur Netlify. Firebase est utilisé uniquement pour
Authentication et Firestore. Les données énergétiques sont écrites directement
dans Firestore avec les règles du fichier `firestore.rules`.

Le premier compte doit être créé manuellement dans Firebase Console :

1. Authentication > Users > Add user : créer l'email et le mot de passe.
2. Copier le UID généré.
3. Firestore > collection `users` > créer un document dont l'ID est ce UID.
4. Ajouter `uid`, `email`, `username`, `usernameNormalized`, `firstName`,
   `lastName`, `fullName`, `role: "SUPER_ADMIN"`, `status: "ACTIVE"`,
   `galleryIds: []`, `shopIds: []` et `lastLoginAt: null`.
5. Créer `usernames/{usernameNormalized}` avec `uid` et `email`.

Les fonctions PDF, Storage et la création d'autres comptes Auth sont désactivées
dans ce mode gratuit.

Pour Netlify : `npm run build` avec le dossier publié `dist`.
