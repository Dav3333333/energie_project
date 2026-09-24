# Guide d'utilisation

## 1. Architecture de l'application

L'application utilise trois services distincts :

- **Netlify** : hébergement du frontend React/Vite.
- **Firebase Authentication** : connexion des utilisateurs par email ou nom d'utilisateur.
- **Cloud Firestore** : stockage des galeries, boutiques, compteurs, relevés et achats d'énergie.

Le projet n'utilise pas Firebase Hosting. Le mode actuel n'utilise pas non plus Firebase Storage ni les Cloud Functions Firebase.

## 2. Configuration Firebase

Le projet Firebase utilisé est `currentgestionf`.

Dans Firebase Console, vérifier les éléments suivants :

1. Ouvrir le projet Firebase `currentgestionf`.
2. Activer **Authentication > Sign-in method > Email/Password**.
3. Créer la base **Firestore Database** en mode production.
4. Publier les règles du projet depuis la racine :

```bash
firebase deploy --only firestore:rules --project currentgestionf
```

Les règles limitent les données selon le rôle de l'utilisateur.

## 3. Création du premier SUPER_ADMIN

La création du premier administrateur se fait en deux parties.

### 3.1 Créer le compte Auth

Dans Firebase Console :

1. Ouvrir **Authentication > Users**.
2. Cliquer sur **Add user**.
3. Saisir l'email et un mot de passe.
4. Valider puis copier le **UID** généré.

### 3.2 Créer le profil Firestore

Dans **Firestore Database > Data** :

1. Créer la collection `users`.
2. Créer un document dont l'identifiant est exactement le UID copié.
3. Ajouter les champs suivants :

| Champ | Type | Exemple |
|---|---|---|
| `uid` | string | UID Firebase |
| `email` | string | `admin@example.com` |
| `username` | string | `admin` |
| `usernameNormalized` | string | `admin` |
| `firstName` | string | `Super` |
| `lastName` | string | `Admin` |
| `fullName` | string | `Super Admin` |
| `role` | string | `SUPER_ADMIN` |
| `status` | string | `ACTIVE` |
| `galleryIds` | array | `[]` |
| `shopIds` | array | `[]` |
| `phone` | null | `null` |
| `lastLoginAt` | null | `null` |

Le document doit être enregistré à l'adresse :

```text
users/{UID_FIREBASE}
```

### 3.3 Créer le nom d'utilisateur

Pour permettre la connexion avec `admin` :

1. Créer la collection `usernames`.
2. Créer le document `admin`.
3. Ajouter :

```text
uid: UID_FIREBASE
email: admin@example.com
```

Le nom du document doit être la valeur minuscule de `usernameNormalized`.

## 4. Connexion

Ouvrir l'application puis saisir :

- l'email Firebase, ou
- le nom d'utilisateur enregistré dans `usernames` ;
- le mot de passe créé dans Authentication.

Si le message **Profil utilisateur introuvable** apparaît, le document `users/{UID}` est absent ou son identifiant ne correspond pas au UID Authentication.

Si le message **compte non actif** apparaît, vérifier que :

```text
status = ACTIVE
```

## 5. Navigation

Après connexion, le bouton de menu situé dans la barre supérieure ouvre les fonctionnalités autorisées par le rôle.

Le `SUPER_ADMIN` dispose de l'accès global à :

- Tableau de bord
- Galeries
- Boutiques
- Compteurs
- Relevés
- Achats d'énergie
- Alertes
- Incidents
- État du courant
- Rapports
- Factures
- Utilisateurs
- Paramètres
- Profil

Le bouton retour des pages de détail et de création utilise l'historique du navigateur.

## 6. Parcours recommandé de démarrage

Suivre cet ordre pour initialiser une installation vide :

1. Se connecter avec le `SUPER_ADMIN`.
2. Ouvrir **Galeries**.
3. Cliquer sur **Nouvelle**.
4. Saisir le nom, le code, la ville, la devise et le prix par kWh.
5. Enregistrer la galerie.
6. Ouvrir **Boutiques** puis **Nouvelle**.
7. Sélectionner la galerie cible si nécessaire.
8. Saisir le nom et le code de la boutique.
9. Enregistrer la boutique.
10. Ouvrir la boutique créée.
11. Ajouter un compteur.
12. Saisir l'index initial du compteur.

Les documents sont alors créés dans Firestore :

```text
galleries/{galleryId}
shops/{shopId}
meters/{meterId}
```

## 7. Gestion de l'énergie

### 7.1 Ajouter un compteur

Un compteur appartient à une boutique. Il contient notamment :

- type : compteur principal ou sous-compteur ;
- code ;
- nom ;
- index initial en kWh ;
- dernier index connu.

Un `SUPER_ADMIN` peut créer un compteur dans n'importe quelle galerie. Les autres rôles doivent avoir accès à la galerie concernée.

### 7.2 Saisir un relevé

Depuis la fiche d'un compteur :

1. Cliquer sur **Nouveau relevé**.
2. Saisir le nouvel index en kWh.
3. Ajouter éventuellement la date et une note.
4. Enregistrer.

L'application refuse un index inférieur au dernier index valide.

La consommation est calculée ainsi :

```text
consommation = nouvel index - ancien index
```

Le relevé est enregistré dans :

```text
readings/{readingId}
```

Le compteur est mis à jour avec le nouvel index.

### 7.3 Enregistrer un achat de kWh

Depuis une boutique :

1. Ouvrir **Nouvel achat kWh**.
2. Saisir la quantité achetée.
3. Vérifier ou modifier le prix par kWh.
4. Choisir la devise et le moyen de paiement.
5. Ajouter une référence de paiement si nécessaire.
6. Enregistrer.

L'achat est enregistré dans :

```text
energyPurchases/{purchaseId}
```

Le solde est recalculé après l'achat.

### 7.4 Solde énergétique

Pour une boutique :

```text
kWh restants = kWh achetés - kWh consommés
```

Les états possibles sont :

- `OK` : crédit normal ;
- `LOW` : crédit faible ;
- `CRITICAL` : crédit critique ;
- `EXHAUSTED` : crédit épuisé ;
- `UNKNOWN` : aucun calcul disponible.

Les seuils sont définis au niveau de la galerie et peuvent être personnalisés au niveau de la boutique.

## 8. Collections Firestore

| Collection | Utilisation |
|---|---|
| `users` | Profils et rôles des utilisateurs |
| `usernames` | Correspondance nom d'utilisateur / email |
| `galleries` | Galeries commerciales |
| `shops` | Boutiques rattachées à une galerie |
| `meters` | Compteurs rattachés aux boutiques |
| `readings` | Relevés manuels d'index |
| `energyPurchases` | Achats de kWh |
| `alerts` | Alertes de crédit et d'exploitation |
| `incidents` | Incidents techniques |
| `invoices` | Données de facturation existantes |
| `auditLogs` | Journal des opérations sensibles |

Une collection Firestore n'apparaît dans la console qu'après la création de son premier document.

## 9. Rôles et permissions

| Rôle | Accès principal |
|---|---|
| `SUPER_ADMIN` | Toutes les galeries, boutiques, compteurs et opérations |
| `GALLERY_ADMIN` | Galeries qui lui sont assignées |
| `TECHNICIAN` | Compteurs, relevés, incidents et état du courant de ses galeries |
| `SHOP_OWNER` | Boutiques qui lui sont assignées et achats autorisés |
| `SHOP_WORKER` | Consultation limitée de sa boutique |

Le `SUPER_ADMIN` peut avoir `galleryIds: []` et `shopIds: []`. Cela signifie qu'il possède un accès global, et non qu'il n'a aucun accès.

## 10. Déploiement Netlify

Le fichier `netlify.toml` configure :

```text
Build command: npm run build
Publish directory: dist
```

Dans Netlify, ajouter les variables d'environnement suivantes :

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_USE_FIREBASE_EMULATORS=false
```

Les variables du fichier `.env` local ne sont pas transmises automatiquement à Netlify.

Après chaque modification des variables Netlify, déclencher un nouveau déploiement.

Dans Firebase Console, ajouter le domaine Netlify dans :

```text
Authentication > Settings > Authorized domains
```

## 11. Développement local

Installer les dépendances :

```bash
npm install --legacy-peer-deps
```

Lancer l'application :

```bash
npm run dev
```

Ouvrir :

```text
http://localhost:5173
```

Le fichier `.env` local doit contenir `VITE_USE_FIREBASE_EMULATORS=false` ou laisser cette variable absente. Dans ce cas, l'application se connecte au projet Firebase en ligne.

## 12. Vérifications et dépannage

### Les galeries ou boutiques sont vides

Vérifier :

1. le `projectId` est bien `currentgestionf` ;
2. `VITE_USE_FIREBASE_EMULATORS` n'est pas à `true` ;
3. l'utilisateur est connecté avec le bon compte ;
4. le profil `users/{UID}` contient `role: SUPER_ADMIN` et `status: ACTIVE` ;
5. les boutiques contiennent un champ `galleryId` valide ;
6. la console du navigateur ne signale pas une erreur Firestore.

### Profil introuvable après connexion

Vérifier que l'ID du document Firestore est exactement le UID du compte Authentication.

### Permission refusée

Vérifier le rôle, le statut `ACTIVE`, le `galleryId` du document et publier les règles :

```bash
firebase deploy --only firestore:rules --project currentgestionf
```

### La page est vide après un déploiement Netlify

Vérifier les variables Netlify puis relancer un déploiement. Le projet utilise un fallback SPA dans `netlify.toml`, nécessaire pour les routes React.

## 13. Limites actuelles du mode gratuit

- Les comptes Auth supplémentaires sont créés manuellement dans Firebase Console.
- Les factures PDF automatiques et Firebase Storage ne sont pas utilisés dans ce mode.
- Les opérations énergétiques sont réalisées directement par le frontend avec les règles Firestore.
- Les tests d'émulateur Firestore nécessitent Java 21 ou une version supérieure.
