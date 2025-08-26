// Interface pour les utilisateurs
export interface User {
  id: number;
  username: string;
  email: string;
  password: string; // Stocké de façon sécurisée dans la base
  role: 'admin' | 'standard';
  createdAt: string;
}

// Interface pour les réservations/acquisitions
export interface Reservation {
  id: number;
  userId: number;
  offerId: number;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}