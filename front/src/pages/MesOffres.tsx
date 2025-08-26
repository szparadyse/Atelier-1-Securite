import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { useEffect, useState } from "react";
import type { Offer } from "../interface/Liste";

function MesOffres() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les offres de l'utilisateur connecté depuis le backend
  useEffect(() => {
    // Récupérer le token JWT du localStorage
    const token = localStorage.getItem("token");
    
    if (!token) {
      setError("Vous devez être connecté pour voir vos offres");
      setLoading(false);
      return;
    }
    
    // Configurer les headers avec le token JWT
    const config = {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };

    // Faire la requête avec le token
    axios
      .get("http://localhost:3000/api/my-offers", config)
      .then((res) => {
        setOffers(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (axios.isAxiosError(err) && err.response) {
          setError(err.response.data.error || "Erreur lors du chargement de vos offres");
        } else {
          setError("Erreur de connexion au serveur");
        }
        console.error("Erreur lors du fetch des offres:", err);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement de vos offres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Mes Offres</h1>
          <Button>Créer une nouvelle offre</Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!error && offers.length === 0 ? (
          <Card className="w-full">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Vous n'avez pas encore créé d'offres.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => (
              <Card key={offer.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle>{offer.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {offer.description}
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-muted/50 pt-2">
                  <Badge variant="secondary" className="font-medium">
                    {offer.price}€
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                    <Button variant="destructive" size="sm">
                      Supprimer
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MesOffres;
