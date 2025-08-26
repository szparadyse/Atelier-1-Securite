const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const logger = require("./logger"); // import du module de log
const crypto = require("crypto-js"); // import du module de cryptage

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
