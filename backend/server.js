const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const logger = require("./logger"); // import du module de log
const crypto = require("crypto-js"); // import du module de cryptage
const jwt = require("jsonwebtoken"); // import du module JWT
const helmet = require("helmet"); // import du module helmet pour sécuriser les en-têtes HTTP
const { body, validationResult } = require("express-validator"); // import du module express-validator
const cookieParser = require("cookie-parser"); // import du module cookie-parser
const csrf = require("csurf"); // import du module csurf

const app = express();
const PORT = 3000;

// Système de limitation des tentatives de connexion
const loginAttempts = {}; // { username: { count: number, lastAttempt: timestamp, blockedUntil: timestamp } }

// Clé secrète pour les JWT (à stocker dans une variable d'environnement en production)
const JWT_SECRET = "votre_cle_secrete_tres_complexe_a_changer_en_production";

// Configuration du CSRF
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true en production
    sameSite: "strict"
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:5173", // Autoriser uniquement l'origine du frontend
  credentials: true // Permettre l'envoi de cookies
}));
app.use(express.json({ limit: "1mb" })); // Limiter la taille des requêtes JSON
app.use(express.urlencoded({ extended: true, limit: "1mb" })); // Pour parser les données des formulaires
app.use(cookieParser()); // Pour parser les cookies
app.use(helmet()); // Ajouter des en-têtes de sécurité

// Middleware d'authentification
const auth = (req, res, next) => {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Tentative d'accès à une route protégée sans token valide`);
      return res.status(401).json({ error: "Authentification requise" });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decodedToken = jwt.verify(token, JWT_SECRET);
    
    // Ajouter les informations utilisateur à l'objet requête
    req.user = {
      userId: decodedToken.userId,
      username: decodedToken.username,
      role: decodedToken.role
    };
    
    logger.debug(`Utilisateur authentifié: ${req.user.username} (ID: ${req.user.userId}, Rôle: ${req.user.role})`);
    next();
  } catch (error) {
    logger.error(`Erreur d'authentification: ${error.message}`);
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
};

// Middleware pour vérifier le rôle admin
const isAdmin = (req, res, next) => {
  // Ce middleware doit être utilisé après le middleware auth
  if (!req.user) {
    logger.error("Middleware isAdmin utilisé sans middleware auth préalable");
    return res.status(500).json({ error: "Erreur de configuration serveur" });
  }
  
  if (req.user.role !== 'admin') {
    logger.warn(`Tentative d'accès à une route admin par un utilisateur non-admin: ${req.user.username}`);
    return res.status(403).json({ error: "Accès refusé. Privilèges administrateur requis." });
  }
  
  logger.debug(`Accès admin autorisé pour: ${req.user.username}`);
  next();
};

// Connexion à SQLite
const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    logger.error(`Erreur connexion DB: ${err.message}`);
  } else {
    logger.info("✅ Connecté à SQLite");
  }
});

// Création des tables si elles n'existent pas déjà
db.serialize(() => {
  // Table utilisateurs
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'standard')) NOT NULL DEFAULT 'standard',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      version INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) {
      logger.error(`Erreur lors de la création de la table users: ${err.message}`);
    } else {
      logger.info("Table 'users' vérifiée/créée avec succès");
      
      // Vérification si la table est vide avant d'insérer les données
      db.get("SELECT COUNT(*) as count FROM users", [], (err, result) => {
        if (err) {
          logger.error(`Erreur lors de la vérification des données users: ${err.message}`);
        } else if (result.count === 0) {
          // Insertion d'utilisateurs de test
          const mockUsers = [
            { username: 'admin', email: 'admin@example.com', password: 'adminpass', role: 'admin' },
            { username: 'user1', email: 'user1@example.com', password: 'userpass', role: 'standard' },
            { username: 'user2', email: 'user2@example.com', password: 'userpass', role: 'standard' }
          ];
          
          // Fonction pour hasher les mots de passe avec SHA256
          const hashPassword = (password) => {
            return crypto.SHA256(password).toString();
          };
          
          mockUsers.forEach(user => {
            // Hashage du mot de passe avant insertion en base
            const hashedPassword = hashPassword(user.password);
            logger.debug(`Mot de passe hashé pour ${user.username}: ${hashedPassword}`);
            
            db.run(
              "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
              [user.username, user.email, hashedPassword, user.role],
              function(err) {
                if (err) {
                  logger.error(`Erreur lors de l'insertion des utilisateurs mock: ${err.message}`);
                } else {
                  logger.info(`Utilisateur mock inséré: ID=${this.lastID}, username=${user.username}`);
                }
              }
            );
          });
        }
      });
    }
  });

  // Table offers modifiée pour inclure la référence à l'utilisateur
  db.run(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      logger.error(`Erreur lors de la création de la table offers: ${err.message}`);
    } else {
      logger.info("Table 'offers' vérifiée/créée avec succès");
      
      // Vérification si la table est vide avant d'insérer les données
      db.get("SELECT COUNT(*) as count FROM offers", [], (err, result) => {
        if (err) {
          logger.error(`Erreur lors de la vérification des données offers: ${err.message}`);
        } else if (result.count === 0) {
          // La table est vide, on insère les données de mock
          // On attend que les utilisateurs soient insérés
          setTimeout(() => {
            // Récupération des IDs des utilisateurs pour les associer aux offres
            db.all("SELECT id, role FROM users", [], (err, users) => {
              if (err) {
                logger.error(`Erreur lors de la récupération des utilisateurs: ${err.message}`);
                return;
              }
              
              // Trouver un utilisateur admin et un utilisateur standard
              const adminUser = users.find(user => user.role === 'admin');
              const standardUsers = users.filter(user => user.role === 'standard');
              
              if (!adminUser || standardUsers.length === 0) {
                logger.error("Impossible de trouver les utilisateurs nécessaires pour créer les offres");
                return;
              }
              
              const mockData = [
                { 
                  title: "Appartement T3 Centre-Ville", 
                  description: "Bel appartement lumineux avec vue sur la ville", 
                  price: 250000, 
                  created_by: adminUser.id 
                },
                { 
                  title: "Maison 4 chambres avec jardin", 
                  description: "Maison familiale dans quartier calme", 
                  price: 320000, 
                  created_by: standardUsers[0].id 
                },
                { 
                  title: "Studio étudiant", 
                  description: "Proche des universités, entièrement meublé", 
                  price: 120000, 
                  created_by: standardUsers[0].id 
                },
                { 
                  title: "Villa avec piscine", 
                  description: "Grande villa moderne avec piscine chauffée", 
                  price: 450000, 
                  created_by: adminUser.id 
                },
                { 
                  title: "Loft industriel", 
                  description: "Espace ouvert rénové dans ancien bâtiment industriel", 
                  price: 280000, 
                  created_by: standardUsers.length > 1 ? standardUsers[1].id : standardUsers[0].id 
                }
              ];
              
              mockData.forEach(offer => {
                db.run(
                  "INSERT INTO offers (title, description, price, created_by) VALUES (?, ?, ?, ?)",
                  [offer.title, offer.description, offer.price, offer.created_by],
                  function(err) {
                    if (err) {
                      logger.error(`Erreur lors de l'insertion des données mock: ${err.message}`);
                    } else {
                      logger.info(`Données mock insérées: ID=${this.lastID}, titre=${offer.title}, créé par utilisateur ID=${offer.created_by}`);
                    }
                  }
                );
              });
              
              logger.info("Données de mock ajoutées avec succès");
            });
          }, 500); // Délai pour s'assurer que les utilisateurs sont insérés
        } else {
          logger.info("Des données existent déjà dans la table offers, pas d'insertion de mock");
        }
      });
    }
  });

  // Table réservations/acquisitions
  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      offer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'confirmed', 'cancelled')) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (offer_id) REFERENCES offers(id)
    )
  `, (err) => {
    if (err) {
      logger.error(`Erreur lors de la création de la table reservations: ${err.message}`);
    } else {
      logger.info("Table 'reservations' vérifiée/créée avec succès");
      
      // Insertion de quelques réservations de test
      db.get("SELECT COUNT(*) as count FROM reservations", [], (err, result) => {
        if (err) {
          logger.error(`Erreur lors de la vérification des données reservations: ${err.message}`);
        } else if (result.count === 0) {
          // On attend que les tables users et offers soient remplies
          setTimeout(() => {
            const mockReservations = [
              { user_id: 2, offer_id: 1, date: new Date().toISOString().split('T')[0], status: 'confirmed' },
              { user_id: 3, offer_id: 2, date: new Date().toISOString().split('T')[0], status: 'pending' }
            ];
            
            mockReservations.forEach(reservation => {
              db.run(
                "INSERT INTO reservations (user_id, offer_id, date, status) VALUES (?, ?, ?, ?)",
                [reservation.user_id, reservation.offer_id, reservation.date, reservation.status],
                function(err) {
                  if (err) {
                    logger.error(`Erreur lors de l'insertion des réservations mock: ${err.message}`);
                  } else {
                    logger.info(`Réservation mock insérée: ID=${this.lastID}, user_id=${reservation.user_id}, offer_id=${reservation.offer_id}`);
                  }
                }
              );
            });
          }, 1000); // Délai pour s'assurer que les autres tables sont remplies
        }
      });
    }
  });
});



// Route pour tester la gestion d'erreur (génère une erreur 500)
app.get("/api/test-error", (req, res, next) => {
  logger.debug("Requête GET /api/test-error reçue (test d'erreur)");
  try {
    // Générer une erreur intentionnellement
    throw new Error("Ceci est une erreur de test");
  } catch (error) {
    next(error); // Transmet l'erreur au middleware de gestion d'erreurs
  }
});

// Exemple de route GET
app.get("/api/offers", (req, res) => {
  logger.debug("Requête GET /api/offers reçue");
  db.all("SELECT * FROM offers", [], (err, rows) => {
    if (err) {
      logger.error(`Erreur SELECT offers: ${err.message}`);
      res.status(500).json({ error: err.message });
    } else {
      logger.info(`Récupération de ${rows.length} offre(s)`);
      res.json(rows);
    }
  });
});

// Exemple de route POST
app.post("/api/offers", (req, res) => {
  const { title, description, price, created_by } = req.body;
  logger.debug(`Requête POST /api/offers avec données: ${JSON.stringify(req.body)}`);
  
  // Validation des données
  if (!title || !price) {
    return res.status(400).json({ error: "Le titre et le prix sont obligatoires" });
  }
  
  db.run(
    "INSERT INTO offers (title, description, price, created_by) VALUES (?, ?, ?, ?)",
    [title, description, price, created_by || null],
    function (err) {
      if (err) {
        logger.error(`Erreur INSERT offer: ${err.message}`);
        res.status(500).json({ error: err.message });
      } else {
        logger.info(`Nouvelle offre ajoutée avec ID=${this.lastID}`);
        res.json({ 
          id: this.lastID, 
          title, 
          description, 
          price,
          created_by: created_by || null,
          created_at: new Date().toISOString()
        });
      }
    }
  );
});

// Fonction pour valider la complexité du mot de passe
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre majuscule");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une lettre minuscule");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un caractère spécial");
  }
  
  return errors;
};

// Route pour obtenir un token CSRF
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Route pour l'inscription utilisateur avec validation et protection CSRF
app.post("/api/register", [
  // Validation des entrées avec express-validator
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage("Le nom d'utilisateur doit contenir entre 3 et 30 caractères")
    .matches(/^[a-zA-Z0-9_]+$/).withMessage("Le nom d'utilisateur ne peut contenir que des lettres, des chiffres et des underscores")
    .escape(), // Protection contre les XSS
  body("email")
    .trim()
    .isEmail().withMessage("Format d'email invalide")
    .normalizeEmail(), // Normaliser l'email
  body("password")
    .isLength({ min: 8 }).withMessage("Le mot de passe doit contenir au moins 8 caractères")
    .matches(/[A-Z]/).withMessage("Le mot de passe doit contenir au moins une lettre majuscule")
    .matches(/[a-z]/).withMessage("Le mot de passe doit contenir au moins une lettre minuscule")
    .matches(/[0-9]/).withMessage("Le mot de passe doit contenir au moins un chiffre")
    .matches(/[^A-Za-z0-9]/).withMessage("Le mot de passe doit contenir au moins un caractère spécial"),
  body("confirmPassword")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      return true;
    })
], (req, res) => {
  // Vérification des erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Extraction des messages d'erreur
    const errorMessages = errors.array();
    const passwordErrors = errorMessages
      .filter(err => ["password", "confirmPassword"].includes(err.path))
      .map(err => err.msg);
    
    // Erreur principale (premier message ou message générique)
    const mainError = errorMessages.length > 0 ? 
      errorMessages[0].msg : 
      "Données d'inscription invalides";
    
    logger.warn(`Tentative d'inscription échouée: validation échouée pour ${req.body.username || 'utilisateur inconnu'}`);
    return res.status(400).json({ 
      error: mainError, 
      passwordErrors: passwordErrors.length > 0 ? passwordErrors : undefined 
    });
  }
  
  const { username, email, password } = req.body;
  logger.info(`Tentative d'inscription pour l'utilisateur: ${username}`);
  
  // Hashage du mot de passe avec une méthode plus sécurisée
  const hashedPassword = crypto.SHA256(password).toString();
  
  // Vérification que l'username et l'email n'existent pas déjà avec des requêtes paramétrées
  db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], (err, user) => {
    if (err) {
      logger.error(`Erreur lors de la vérification des identifiants: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
    }
    
    if (user) {
      // Vérification plus précise pour donner un message d'erreur plus spécifique
      db.get("SELECT id FROM users WHERE username = ?", [username], (err, usernameExists) => {
        if (err) {
          logger.error(`Erreur lors de la vérification du nom d'utilisateur: ${err.message}`);
          return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
        }
        
        if (usernameExists) {
          logger.warn(`Tentative d'inscription échouée: nom d'utilisateur ${username} déjà utilisé`);
          return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé" });
        } else {
          logger.warn(`Tentative d'inscription échouée: email ${email} déjà utilisé`);
          return res.status(400).json({ error: "Cet email est déjà utilisé" });
        }
      });
      return;
    }
    
    // Utilisation de requêtes paramétrées pour éviter les injections SQL
    db.run(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, 'standard'],
      function(err) {
        if (err) {
          logger.error(`Erreur lors de l'inscription: ${err.message}`);
          return res.status(500).json({ error: "Erreur serveur lors de l'inscription" });
        }
        
        const userId = this.lastID;
        
        // Création du token JWT pour connecter directement l'utilisateur
        const token = jwt.sign(
          { 
            userId: userId, 
            username: username, 
            role: 'standard' 
          },
          JWT_SECRET,
          { expiresIn: '24h' } // Token valide pendant 24h
        );
        
        logger.info(`Inscription réussie pour l'utilisateur: ${username} (ID: ${userId})`);
        
        // Retourner le token et les informations de l'utilisateur
        res.status(201).json({
          message: "Inscription réussie",
          token,
          user: {
            id: userId,
            username: username,
            role: 'standard'
          }
        });
      }
    );
  });
});

// Route pour la connexion utilisateur
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  logger.info(`Tentative de connexion pour l'utilisateur: ${username}`);
  
  // Validation des données
  if (!username || !password) {
    logger.warn(`Tentative de connexion échouée: identifiants incomplets pour ${username || 'utilisateur inconnu'}`);
    return res.status(400).json({ error: "Le nom d'utilisateur et le mot de passe sont obligatoires" });
  }
  
  // Vérification des tentatives de connexion
  const now = Date.now();
  if (loginAttempts[username]) {
    // Vérifier si l'utilisateur est bloqué
    if (loginAttempts[username].blockedUntil && loginAttempts[username].blockedUntil > now) {
      const remainingTimeMs = loginAttempts[username].blockedUntil - now;
      const remainingTimeSec = Math.ceil(remainingTimeMs / 1000);
      logger.warn(`Tentative de connexion bloquée pour l'utilisateur ${username} (encore ${remainingTimeSec} secondes)`);
      return res.status(429).json({ 
        error: "Trop de tentatives échouées", 
        blockedUntil: loginAttempts[username].blockedUntil,
        remainingTime: remainingTimeSec
      });
    }
  } else {
    // Initialiser les tentatives pour cet utilisateur
    loginAttempts[username] = { count: 0, lastAttempt: now };
  }
  
  // Hashage du mot de passe pour la comparaison
  const hashedPassword = crypto.SHA256(password).toString();
  
  // Recherche de l'utilisateur dans la base de données
  db.get(
    "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
    [username, hashedPassword],
    (err, user) => {
      if (err) {
        logger.error(`Erreur lors de la vérification des identifiants: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur lors de la connexion" });
      }
      
      if (!user) {
        // Incrémenter le compteur de tentatives échouées
        loginAttempts[username].count += 1;
        loginAttempts[username].lastAttempt = now;
        
        // Vérifier si l'utilisateur doit être bloqué (5 tentatives échouées)
        if (loginAttempts[username].count >= 5) {
          // Bloquer pour 1 minute (60000 ms)
          const blockUntil = now + 60000;
          loginAttempts[username].blockedUntil = blockUntil;
          
          // Log critique pour signaler le blocage
          logger.critical(`SÉCURITÉ: Compte ${username} bloqué après ${loginAttempts[username].count} tentatives de connexion échouées`);
          
          return res.status(429).json({ 
            error: "Trop de tentatives échouées. Compte temporairement bloqué pendant 1 minute.", 
            blockedUntil: blockUntil,
            remainingTime: 60
          });
        }
        
        logger.warn(`Tentative de connexion échouée: identifiants incorrects pour ${username} (tentative ${loginAttempts[username].count}/5)`);
        return res.status(401).json({ 
          error: "Identifiants incorrects", 
          attemptsLeft: 5 - loginAttempts[username].count 
        });
      }
      
      // Connexion réussie - réinitialiser le compteur de tentatives
      if (loginAttempts[username]) {
        loginAttempts[username].count = 0;
        loginAttempts[username].blockedUntil = null;
      }
      
      // Création du token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' } // Token valide pendant 24h
      );
      
      logger.info(`Connexion réussie pour l'utilisateur: ${username} (ID: ${user.id}, Rôle: ${user.role})`);
      
      // Retourner le token et les informations de l'utilisateur
      res.json({
        message: "Connexion réussie",
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    }
  );
});

// Route protégée - nécessite une authentification
app.get("/api/profile", auth, (req, res) => {
  logger.info(`Accès au profil pour l'utilisateur: ${req.user.username}`);
  
  // Récupérer les informations complètes de l'utilisateur depuis la base de données
  db.get(
    "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
    [req.user.userId],
    (err, user) => {
      if (err) {
        logger.error(`Erreur lors de la récupération du profil: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      
      if (!user) {
        logger.error(`Utilisateur introuvable pour l'ID: ${req.user.userId}`);
        return res.status(404).json({ error: "Utilisateur introuvable" });
      }
      
      // Retourner les informations de l'utilisateur (sans le mot de passe)
      res.json(user);
    }
  );
});

// Route pour récupérer les offres créées par l'utilisateur connecté
app.get("/api/my-offers", auth, (req, res) => {
  logger.info(`Récupération des offres pour l'utilisateur: ${req.user.username} (ID: ${req.user.userId})`);
  
  db.all(
    "SELECT * FROM offers WHERE created_by = ?",
    [req.user.userId],
    (err, offers) => {
      if (err) {
        logger.error(`Erreur lors de la récupération des offres de l'utilisateur: ${err.message}`);
        return res.status(500).json({ error: "Erreur serveur" });
      }
      
      logger.info(`${offers.length} offre(s) récupérée(s) pour l'utilisateur ${req.user.username}`);
      res.json(offers);
    }
  );
});

// Route protégée - nécessite des privilèges administrateur
app.get("/api/users", auth, isAdmin, (req, res) => {
  logger.info(`Accès à la liste des utilisateurs par l'admin: ${req.user.username}`);
  
  db.all("SELECT id, username, email, role, created_at FROM users", [], (err, users) => {
    if (err) {
      logger.error(`Erreur lors de la récupération des utilisateurs: ${err.message}`);
      return res.status(500).json({ error: "Erreur serveur" });
    }
    
    logger.info(`${users.length} utilisateurs récupérés par l'admin ${req.user.username}`);
    res.json(users);
  });
});

// Middleware pour gérer les erreurs 404 (routes non trouvées)
app.use((req, res, next) => {
  logger.warn(`404 - Route non trouvée: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 404,
    message: "Route non trouvée",
    path: req.originalUrl
  });
});

// Middleware pour gérer les autres erreurs
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorMessage = err.message || "Erreur interne du serveur";
  
  if (statusCode === 500) {
    logger.error(`500 - Erreur serveur: ${errorMessage}`);
    logger.error(`Stack: ${err.stack}`);
  } else {
    logger.warn(`${statusCode} - ${errorMessage} - ${req.method} ${req.originalUrl}`);
  }
  
  res.status(statusCode).json({
    status: statusCode,
    message: errorMessage
  });
});

// Lancer le serveur
app.listen(PORT, () => {
  logger.critical(`🚀 Application lancée ! Backend démarré sur http://localhost:${PORT}`);
});
