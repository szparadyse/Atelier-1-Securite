// Interface pour les offres correspondant à la structure de la table offers
export interface Offer {
  id: number;
  title: string;
  description: string;
  price: number;
  created_by?: number; // ID de l'utilisateur qui a créé l'offre
  created_at?: string; // Date de création
  buyer_id?: number | null; // ID de l'acheteur (null si pas encore vendu)
  status?: string; // 'disponible' ou 'vendu'
}
