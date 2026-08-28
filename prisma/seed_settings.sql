DELETE FROM StoreSettings;
INSERT INTO StoreSettings (id, `key`, value, description) VALUES
('ss-1', 'brand_name', 'SaTouba Bijouterie', 'Nom de la marque'),
('ss-2', 'tagline', 'Moderne & de la Joie', 'Slogan de la marque'),
('ss-3', 'description', 'Vente de bijoux en or 18K, diamants, argent & accessoires de luxe — Coursier SaTouba (Abidjan & environs)', 'Description de la boutique'),
('ss-4', 'address', 'Koumassi, feux de prodomo, juste à la rentrée de Sopim, Abidjan — Coursier SaTouba (Abidjan & environs)', 'Adresse de la boutique'),
('ss-5', 'phone_main', '+225 05 54 13 07 46', 'Téléphone principal'),
('ss-6', 'phone_secondary', '+225 07 47 13 52 01', 'Téléphone secondaire'),
('ss-7', 'phone_tertiary', '+225 01 02 65 68 40', 'Téléphone tertiary'),
('ss-8', 'email', 'contact@satouba-bijouterie.ci', 'Email de contact'),
('ss-9', 'whatsapp', '2250554130746', 'Numéro WhatsApp'),
('ss-10', 'instagram', 'Satouba225_bijouterie', 'Compte Instagram'),
('ss-11', 'opening_hours', 'Lundi au Samedi : 09h00 - 19h00', 'Horaires'),
('ss-12', 'currency', 'FCFA', 'Devise'),
('ss-13', 'shipping_fee', '5000', 'Frais de livraison'),
('ss-14', 'free_shipping_threshold', '200000', 'Seuil livraison gratuite');

DELETE FROM MaterialPricing;
INSERT INTO MaterialPricing (id, name, pricePerGram, type, description) VALUES
('mp-1', 'Or Jaune 18K', 45000, 'MATERIAL', 'Prix par gramme'),
('mp-2', 'Or Blanc 18K', 48000, 'MATERIAL', 'Prix par gramme'),
('mp-3', 'Or Rose 18K', 47000, 'MATERIAL', 'Prix par gramme'),
('mp-4', 'Argent Massif', 5000, 'MATERIAL', 'Prix par gramme'),
('mp-5', 'Diamant SaTouba', 150000, 'STONE', 'Prix par pierre'),
('mp-6', 'Rubis / Saphir', 120000, 'STONE', 'Prix par pierre'),
('mp-7', 'Émeraude', 180000, 'STONE', 'Prix par pierre'),
('mp-8', 'Zirconium éclat', 35000, 'STONE', 'Prix par pierre'),
('mp-9', 'Main d''oeuvre', 45000, 'LABOR', 'Frais fixe');
