import { useEffect, useState } from "react";
import { Link, Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Connexion from "./pages/Connexion";
import Liste from "./pages/Liste";
import MesOffres from "./pages/MesOffres";

function App() {
  // Vérifier si l'utilisateur est authentifié en vérifiant le localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Vérifier l'authentification au chargement de l'application
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fonction de déconnexion
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/connexion";
  };

  // Composant de protection des routes
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/connexion" />;
    }
    return <>{children}</>;
  };

  return (
    <Router>
      <nav className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex gap-4">
            <Link to="/" className="hover:underline">Accueil</Link>
            <Link to="/liste" className="hover:underline">Liste des offres</Link>
            {isAuthenticated && (
              <Link to="/mes-offres" className="hover:underline">Mes offres</Link>
            )}
          </div>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span>Bonjour, {user?.username}</span>
                <button 
                  onClick={handleLogout}
                  className="bg-primary-foreground text-primary px-3 py-1 rounded-md hover:bg-opacity-90"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link 
                to="/connexion"
                className="bg-primary-foreground text-primary px-3 py-1 rounded-md hover:bg-opacity-90"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto py-4">
        <Routes>
          <Route path="/connexion" element={
            isAuthenticated ? <Navigate to="/liste" /> : <Connexion />
          } />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <h1 className="text-3xl font-bold mb-6">Bienvenue sur la plateforme</h1>
                <p>Vous êtes connecté en tant que {user?.username} avec le rôle {user?.role}</p>
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
          <Route 
            path="/mes-offres" 
            element={
              <ProtectedRoute>
                <MesOffres />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
