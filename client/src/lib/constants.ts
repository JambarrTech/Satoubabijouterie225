// Constantes boutique — centralise les valeurs en dur métier (mêmes valeurs qu'avant).
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const VALID_TABS = [
  'home',
  'catalogue',
  'produit',
  'favoris',
  'panier',
  'commandes',
  'sur-mesure',
  'reparation',
  'profil',
  'chat',
  'cgv',
  'confidentialite',
] as const;

export const PHONE_REGEX = /^\+?\d{8,}$/;

// Tarifs simulateur sur-mesure (FCFA) — affichés tels quels, source unique côté boutique.
export const MATERIAL_PRICES: Record<string, number> = {
  'Or Jaune 18K': 35000,
  'Or Blanc 18K': 38000,
  'Or Rose 18K': 37000,
  'Argent Massif': 2500,
};
export const STONE_COST: Record<string, number> = {
  'Diamant Satouba Bijouterie 255': 500000,
  'Rubis / Saphir': 300000,
  'Émeraude': 250000,
  'Zirconium éclat': 50000,
  'Aucune (Or pur)': 0,
};
export const LABOR_FEE = 5000;
export const PRICE_ROUND_STEP = 5000;
export const DEFAULT_MATERIAL_RATE = 35000;

// Notifications in-app : polling léger tant que l'utilisateur est connecté
// (pas de push temps réel : pas de FCM/SW côté front, cf. colonne pushTokens supprimée).
export const NOTIFICATIONS_POLL_MS = 60 * 1000;
