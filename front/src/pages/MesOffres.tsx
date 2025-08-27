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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Offer } from "../interface/Liste";

function MesOffres() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: ""
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Gérer les changements dans le formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData({
      ...formData,
      [id]: value
    });
  };

  // Fonction pour soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);
    setIsSubmitting(true);

    try {
      // Validation côté client
      const errors: string[] = [];
      if (formData.title.length < 3) {
        errors.push("Le titre doit contenir au moins 3 caractères");
      }
      if (formData.description.length < 10) {
        errors.push("La description doit contenir au moins 10 caractères");
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        errors.push("Le prix doit être un nombre positif");
      }

      if (errors.length > 0) {
        setFormErrors(errors);
        setIsSubmitting(false);
        return;
      }

      // Récupérer le token JWT du localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        setFormErrors(["Vous devez être connecté pour créer une offre"]);
        setIsSubmitting(false);
        return;
      }

      // Configurer les headers avec le token JWT
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // Préparer les données à envoyer
      const offerData = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price)
      };

      // Envoyer la requête au backend
      const response = await axios.post("http://localhost:3000/api/offers", offerData, config);
      
      // Ajouter la nouvelle offre à la liste
      setOffers([response.data, ...offers]);
      
      // Réinitialiser le formulaire
      setFormData({
        title: "",
        description: "",
        price: ""
      });
      
      // Fermer le modal
      setIsDialogOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.data.details) {
          setFormErrors(err.response.data.details);
        } else {
          setFormErrors([err.response.data.error || "Erreur lors de la création de l'offre"]);
        }
      } else {
        setFormErrors(["Erreur de connexion au serveur"]);
      }
      console.error("Erreur lors de la création de l'offre:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>Créer une nouvelle offre</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle offre</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer une nouvelle offre.
                </DialogDescription>
              </DialogHeader>
              <form className="grid gap-4 py-4" onSubmit={handleSubmit}>
                {formErrors.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {formErrors.map((err, index) => (
                          <li key={index}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Titre
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Titre de l'offre"
                    className="col-span-3"
                    required
                    minLength={3}
                    maxLength={100}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Description détaillée de l'offre"
                    className="col-span-3"
                    required
                    minLength={10}
                    maxLength={1000}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">
                    Prix (€)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="col-span-3"
                    required
                    min={0}
                    step="0.01"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Création...
                      </>
                    ) : (
                      "Créer l'offre"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
