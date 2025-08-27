const sqlite3 = require("sqlite3").verbose();
const logger = require("../utils/logger");
const config = require("../config/config");

// Connexion à SQLite
const db = new sqlite3.Database(config.DATABASE.path, (err) => {
  if (err) {
    logger.error(`Erreur connexion DB: ${err.message}`);
  } else {
    logger.info("✅ Connecté à SQLite");
  }
});

// Fonction pour initialiser les tables de la base de données
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Table utilisateurs
      createUsersTable()
        .then(() => createOffersTable())
        .then(() => createReservationsTable())
        .then(() => {
          logger.info("Base de données initialisée avec succès");
          resolve();
        })
        .catch(error => {
          logger.error(`Erreur lors de l'initialisation de la base de données: ${error.message}`);
          reject(error);
        });
    });
  });
};

// Création de la table users
const createUsersTable = () => {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        logger.info("Table 'users' vérifiée/créée avec succès");
        
        // Vérification si la table est vide avant d'insérer les données
        db.get("SELECT COUNT(*) as count FROM users", [], (err, result) => {
          if (err) {
            logger.error(`Erreur lors de la vérification des données users: ${err.message}`);
            reject(err);
          } else if (result.count === 0) {
            insertMockUsers()
              .then(resolve)
              .catch(reject);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

// Insertion des utilisateurs de test
const insertMockUsers = () => {
  return new Promise((resolve, reject) => {
    const crypto = require("crypto-js");
    
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
    
    const promises = mockUsers.map(user => {
      return new Promise((resolve, reject) => {
        // Hashage du mot de passe avant insertion en base
        const hashedPassword = hashPassword(user.password);
        logger.debug(`Mot de passe hashé pour ${user.username}: ${hashedPassword}`);
        
        db.run(
          "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
          [user.username, user.email, hashedPassword, user.role],
          function(err) {
            if (err) {
              logger.error(`Erreur lors de l'insertion des utilisateurs mock: ${err.message}`);
              reject(err);
            } else {
              logger.info(`Utilisateur mock inséré: ID=${this.lastID}, username=${user.username}`);
              resolve();
            }
          }
        );
      });
    });
    
    Promise.all(promises)
      .then(resolve)
      .catch(reject);
  });
};

// Création de la table offers
const createOffersTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        created_by INTEGER,
        buyer_id INTEGER DEFAULT NULL,
        status TEXT CHECK(status IN ('disponible', 'vendu')) NOT NULL DEFAULT 'disponible',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (buyer_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        logger.error(`Erreur lors de la création de la table offers: ${err.message}`);
        reject(err);
      } else {
        logger.info("Table 'offers' vérifiée/créée avec succès");
        
        // Vérification si la table est vide avant d'insérer les données
        db.get("SELECT COUNT(*) as count FROM offers", [], (err, result) => {
          if (err) {
            logger.error(`Erreur lors de la vérification des données offers: ${err.message}`);
            reject(err);
          } else if (result.count === 0) {
            // La table est vide, on insère les données de mock
            // On attend que les utilisateurs soient insérés
            setTimeout(() => {
              insertMockOffers()
                .then(resolve)
                .catch(reject);
            }, 500);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

// Insertion des offres de test
const insertMockOffers = () => {
  return new Promise((resolve, reject) => {
    // Récupération des IDs des utilisateurs pour les associer aux offres
    db.all("SELECT id, role FROM users", [], (err, users) => {
      if (err) {
        logger.error(`Erreur lors de la récupération des utilisateurs: ${err.message}`);
        reject(err);
        return;
      }
      
      // Trouver un utilisateur admin et un utilisateur standard
      const adminUser = users.find(user => user.role === 'admin');
      const standardUsers = users.filter(user => user.role === 'standard');
      
      if (!adminUser || standardUsers.length === 0) {
        const error = new Error("Impossible de trouver les utilisateurs nécessaires pour créer les offres");
        logger.error(error.message);
        reject(error);
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
      
      const promises = mockData.map(offer => {
        return new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO offers (title, description, price, created_by) VALUES (?, ?, ?, ?)",
            [offer.title, offer.description, offer.price, offer.created_by],
            function(err) {
              if (err) {
                logger.error(`Erreur lors de l'insertion des données mock: ${err.message}`);
                reject(err);
              } else {
                logger.info(`Données mock insérées: ID=${this.lastID}, titre=${offer.title}, créé par utilisateur ID=${offer.created_by}`);
                resolve();
              }
            }
          );
        });
      });
      
      Promise.all(promises)
        .then(() => {
          logger.info("Données de mock ajoutées avec succès");
          resolve();
        })
        .catch(reject);
    });
  });
};

// Création de la table reservations
const createReservationsTable = () => {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        logger.info("Table 'reservations' vérifiée/créée avec succès");
        
        // Insertion de quelques réservations de test
        db.get("SELECT COUNT(*) as count FROM reservations", [], (err, result) => {
          if (err) {
            logger.error(`Erreur lors de la vérification des données reservations: ${err.message}`);
            reject(err);
          } else if (result.count === 0) {
            // On attend que les tables users et offers soient remplies
            setTimeout(() => {
              insertMockReservations()
                .then(resolve)
                .catch(reject);
            }, 1000);
          } else {
            resolve();
          }
        });
      }
    });
  });
};

// Insertion des réservations de test
const insertMockReservations = () => {
  return new Promise((resolve, reject) => {
    const mockReservations = [
      { user_id: 2, offer_id: 1, date: new Date().toISOString().split('T')[0], status: 'confirmed' },
      { user_id: 3, offer_id: 2, date: new Date().toISOString().split('T')[0], status: 'pending' }
    ];
    
    const promises = mockReservations.map(reservation => {
      return new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO reservations (user_id, offer_id, date, status) VALUES (?, ?, ?, ?)",
          [reservation.user_id, reservation.offer_id, reservation.date, reservation.status],
          function(err) {
            if (err) {
              logger.error(`Erreur lors de l'insertion des réservations mock: ${err.message}`);
              reject(err);
            } else {
              logger.info(`Réservation mock insérée: ID=${this.lastID}, user_id=${reservation.user_id}, offer_id=${reservation.offer_id}`);
              resolve();
            }
          }
        );
      });
    });
    
    Promise.all(promises)
      .then(resolve)
      .catch(reject);
  });
};

module.exports = {
  db,
  initDatabase
};
