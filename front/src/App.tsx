import { useState } from "react";
import { Link, Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Connexion from "./pages/Connexion";
import Liste from "./pages/Liste";

function App() {
  // État simulé pour l'authentification (false = non connecté)
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Composant de protection des routes
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/connexion" />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <nav>
        <Link to="/">Accueil</Link> | <Link to="/liste">Liste des offres</Link>
        {isAuthenticated ? (
          <span> | <button onClick={() => setIsAuthenticated(false)}>Déconnexion</button></span>
        ) : (
          <span> | <Link to="/connexion">Connexion</Link></span>
        )}
      </nav>

      <Routes>
        <Route path="/connexion" element={<Connexion />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <h1>Bienvenue sur la plateforme</h1>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/liste" 
          element={
            <ProtectedRoute>
              <Liste />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
