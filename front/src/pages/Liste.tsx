import axios from "axios";
import { useEffect, useState } from "react";
import type { Offer } from "../interface/Liste";

function Liste() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les offres depuis le backend
  useEffect(() => {
    axios
      .get("http://localhost:3000/api/offers")
      .then((res) => {
        setOffers(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur lors du fetch des offres:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Chargement des offres...</p>;
  }

  return (
    <div>
      <h1>Liste des Offres</h1>
      {offers.length === 0 ? (
        <p>Aucune offre disponible.</p>
      ) : (
        <ul>
          {offers.map((o) => (
            <li key={o.id}>
              <strong>{o.title}</strong> - {o.description} ({o.price}€)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Liste;
