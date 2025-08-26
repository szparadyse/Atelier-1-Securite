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
import { AlertCircleIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
  };
}

interface LoginError {
  error: string;
  blockedUntil?: number;
  remainingTime?: number;
  attemptsLeft?: number;
}

const Connexion: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setBlockedUntil] = useState<number | null>(null); // On garde setBlockedUntil pour la logique mais on n'utilise pas blockedUntil
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const navigate = useNavigate();

  // Effet pour gérer le compte à rebours
  useEffect(() => {
    let timer: number | undefined;
    
    if (remainingTime && remainingTime > 0) {
      timer = window.setInterval(() => {
        setRemainingTime(prev => {
          if (prev && prev > 1) {
            return prev - 1;
          } else {
            // Temps écoulé, on réinitialise
            setBlockedUntil(null);
            setError(null);
            return null;
          }
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [remainingTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post<LoginResponse>("http://localhost:3000/api/login", {
        username,
        password
      });

      // Stocker le token JWT dans le localStorage
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      // Mettre à jour l'état global d'authentification
      // On pourrait utiliser un contexte React pour ça, mais pour simplifier
      // on va recharger la page qui va vérifier le localStorage
      setLoading(false);
      
      // Rediriger vers la page Liste
      navigate("/liste");
      
      // Optionnel: rafraîchir la page pour mettre à jour l'état d'authentification
      window.location.reload();
    } catch (err) {
      setLoading(false);
      if (axios.isAxiosError(err) && err.response) {
        const errorData = err.response.data as LoginError;
        setError(errorData.error || "Identifiants incorrects");
        
        // Gestion des tentatives restantes
        if (errorData.attemptsLeft !== undefined) {
          setAttemptsLeft(errorData.attemptsLeft);
        }
        
        // Gestion du blocage temporaire
        if (errorData.blockedUntil) {
          setBlockedUntil(errorData.blockedUntil);
          if (errorData.remainingTime) {
            setRemainingTime(errorData.remainingTime);
          }
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
          <CardTitle>Connexion à votre compte</CardTitle>
          <CardDescription>
            Entrez vos identifiants pour vous connecter
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Erreur de connexion</AlertTitle>
              <AlertDescription>
                {error}
                {remainingTime && remainingTime > 0 && (
                  <div className="mt-2 font-semibold">
                    Veuillez attendre {remainingTime} secondes avant de réessayer.
                  </div>
                )}
                {attemptsLeft !== null && attemptsLeft > 0 && !remainingTime && (
                  <div className="mt-2">
                    Il vous reste {attemptsLeft} tentative{attemptsLeft > 1 ? 's' : ''} avant le blocage temporaire.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <label htmlFor="username" className="text-sm font-medium">Nom d'utilisateur</label>
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
                <div className="flex items-center">
                  <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Mot de passe oublié?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <CardFooter className="flex-col gap-2 px-0 pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || (remainingTime !== null && remainingTime > 0)}
              >
                {loading ? "Connexion en cours..." : 
                 (remainingTime !== null && remainingTime > 0) ? 
                 `Réessayer dans ${remainingTime}s` : "Se connecter"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Connexion;
