import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import axios from "axios";
import DOMPurify from "dompurify";
import { AlertCircleIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface RegisterError {
  error: string;
  passwordErrors?: string[];
}

interface CsrfResponse {
  csrfToken: string;
}

const Inscription: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Récupérer un token CSRF au chargement du composant
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        // Configurer axios pour envoyer les cookies
        axios.defaults.withCredentials = true;
        
        const response = await axios.get<CsrfResponse>("http://localhost:3000/api/csrf-token");
        setCsrfToken(response.data.csrfToken);
      } catch (err) {
        console.error("Erreur lors de la récupération du token CSRF:", err);
        setError("Impossible de sécuriser le formulaire. Veuillez réessayer plus tard.");
      }
    };
    
    fetchCsrfToken();
  }, []);

  // Fonction pour assainir les entrées utilisateur
  const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input.trim());
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordErrors([]);
    
    // Vérifier si le token CSRF est disponible
    if (!csrfToken) {
      setError("Impossible de sécuriser le formulaire. Veuillez rafraîchir la page.");
      return;
    }
    
    // Assainir les entrées utilisateur
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedEmail = sanitizeInput(email);
    
    // Validation côté client
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    
    setLoading(true);
    
    try {
      // Configurer axios pour envoyer les cookies et le token CSRF
      axios.defaults.withCredentials = true;
      
      const response = await axios.post("http://localhost:3000/api/register", 
        {
          username: sanitizedUsername,
          email: sanitizedEmail,
          password,
          confirmPassword
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Stocker le token JWT dans le localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      // Rediriger vers la page Liste
      navigate("/liste");
      
      // Optionnel: rafraîchir la page pour mettre à jour l'état d'authentification
      window.location.reload();
    } catch (err) {
      setLoading(false);
      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data as RegisterError;
        setError(errorData.error || "Erreur lors de l'inscription");
        
        // Afficher les erreurs spécifiques au mot de passe si elles existent
        if (errorData.passwordErrors) {
          setPasswordErrors(errorData.passwordErrors);
        }
      } else {
        setError("Erreur de connexion au serveur");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">S'inscrire</CardTitle>
          <CardDescription>
            Créez un compte pour accéder à nos services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Erreur d'inscription</AlertTitle>
              <AlertDescription>
                {error}
                {passwordErrors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5">
                    {passwordErrors.map((err, index) => (
                      <li key={index} className="text-sm">{err}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Entrez votre nom d'utilisateur"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Entrez votre adresse email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Créez votre mot de passe"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirmez votre mot de passe"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            
            <CardFooter className="flex-col gap-2 px-0 pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Inscription en cours..." : "S'inscrire"}
              </Button>
            </CardFooter>
            
            <div className="text-center mt-4">
              <p className="text-sm">
                Déjà inscrit ? <Link to="/connexion" className="text-primary hover:underline">Se connecter</Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inscription;