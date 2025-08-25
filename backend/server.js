const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const logger = require("./logger"); // import du module de log

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

// Création de la table si elle n'existe pas déjà
db.run(`
  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    price REAL
  )
`, (err) => {
  if (err) {
    logger.error(`Erreur lors de la création de la table: ${err.message}`);
  } else {
    logger.info("Table 'offers' vérifiée/créée avec succès");
    
    // Insertion des données de mock
    const mockData = [
      { title: "Appartement T3 Centre-Ville", description: "Bel appartement lumineux avec vue sur la ville", price: 250000 },
      { title: "Maison 4 chambres avec jardin", description: "Maison familiale dans quartier calme", price: 320000 },
      { title: "Studio étudiant", description: "Proche des universités, entièrement meublé", price: 120000 },
      { title: "Villa avec piscine", description: "Grande villa moderne avec piscine chauffée", price: 450000 },
      { title: "Loft industriel", description: "Espace ouvert rénové dans ancien bâtiment industriel", price: 280000 }
    ];
    
    // Vérification si la table est vide avant d'insérer les données
    db.get("SELECT COUNT(*) as count FROM offers", [], (err, result) => {
      if (err) {
        logger.error(`Erreur lors de la vérification des données: ${err.message}`);
      } else if (result.count === 0) {
        // La table est vide, on insère les données de mock
        mockData.forEach(offer => {
          db.run(
            "INSERT INTO offers (title, description, price) VALUES (?, ?, ?)",
            [offer.title, offer.description, offer.price],
            function(err) {
              if (err) {
                logger.error(`Erreur lors de l'insertion des données mock: ${err.message}`);
              } else {
                logger.info(`Données mock insérées: ID=${this.lastID}, titre=${offer.title}`);
              }
            }
          );
        });
        logger.info("Données de mock ajoutées avec succès");
      } else {
        logger.info("Des données existent déjà dans la table, pas d'insertion de mock");
      }
    });
  }
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
  const { title, description, price } = req.body;
  logger.debug(`Requête POST /api/offers avec données: ${JSON.stringify(req.body)}`);
  
  db.run(
    "INSERT INTO offers (title, description, price) VALUES (?, ?, ?)",
    [title, description, price],
    function (err) {
      if (err) {
        logger.error(`Erreur INSERT offer: ${err.message}`);
        res.status(500).json({ error: err.message });
      } else {
        logger.info(`Nouvelle offre ajoutée avec ID=${this.lastID}`);
        res.json({ id: this.lastID, title, description, price });
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
