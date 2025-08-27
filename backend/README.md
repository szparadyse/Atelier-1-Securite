# Backend Sécurisé

Ce backend a été restructuré pour améliorer la maintenabilité et la lisibilité du code.

## Structure du projet

```
backend/
├── config/             # Configuration de l'application
│   └── config.js       # Paramètres de configuration centralisés
├── middleware/         # Middlewares Express
│   ├── auth.js         # Middlewares d'authentification
│   ├── error.js        # Gestion des erreurs
│   └── validators.js   # Validateurs de données
├── models/             # Modèles de données
│   └── db.js           # Initialisation et gestion de la base de données
├── routes/             # Routes API
│   ├── admin.js        # Routes administrateur
│   ├── auth.js         # Routes d'authentification
│   ├── offers.js       # Routes pour les offres
│   └── test.js         # Routes de test
├── utils/              # Utilitaires
│   ├── auth.js         # Fonctions d'authentification
│   └── logger.js       # Module de journalisation
├── logs/               # Fichiers de logs
│   └── app.log         # Journal d'application
├── database.db         # Base de données SQLite
├── server.js           # Point d'entrée principal
└── README.md           # Documentation
```

## Points d'entrée API

### Authentification

- `POST /api/auth/register` - Inscription d'un nouvel utilisateur
- `POST /api/auth/login` - Connexion utilisateur
- `GET /api/auth/profile` - Récupération du profil utilisateur (authentification requise)

> **Note de compatibilité** : Les anciennes routes `/api/register` et `/api/login` sont toujours supportées et redirigent automatiquement vers les nouvelles routes.

### Offres

- `GET /api/offers` - Récupération de toutes les offres
- `POST /api/offers` - Création d'une offre (authentification requise)
- `GET /api/offers/my-offers` - Récupération des offres de l'utilisateur connecté (authentification requise)
- `GET /api/offers/:id` - Récupération d'une offre spécifique

> **Note de compatibilité** : L'ancienne route `/api/my-offers` est toujours supportée et redirige automatiquement vers `/api/offers/my-offers`.

### Administration

- `GET /api/admin/users` - Liste de tous les utilisateurs (admin uniquement)
- `GET /api/admin/reservations` - Liste de toutes les réservations (admin uniquement)

### Test et utilitaires

- `GET /api/test-error` - Test de gestion d'erreur
- `GET /api/csrf-token` - Récupération d'un token CSRF

## Sécurité

Le backend implémente plusieurs mesures de sécurité :

- Authentification par JWT
- Protection CSRF
- Validation des entrées
- Limitation des tentatives de connexion
- En-têtes HTTP sécurisés (Helmet)
- Hashage des mots de passe
- Requêtes paramétrées pour prévenir les injections SQL
- Journalisation des événements de sécurité

## Démarrage

```bash
cd backend
npm install
node server.js
```

Le serveur démarrera sur http://localhost:3000 par défaut.
