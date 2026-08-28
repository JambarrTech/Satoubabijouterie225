INSERT IGNORE INTO `StoreSettings` (`id`, `key`, `value`, `description`) VALUES
('ss-1', 'brand_name', 'SaTouba Bijouterie', 'Nom de la marque'),
('ss-2', 'tagline', 'L''excellence de la joaillerie ivoirienne', 'Slogan'),
('ss-3', 'whatsapp', '2250554130746', 'Numero WhatsApp'),
('ss-4', 'phone_main', '+225 05 54 13 07 46', 'Telephone principal'),
('ss-5', 'email', 'contact@satouba-bijouterie.ci', 'Email contact'),
('ss-6', 'address', 'Koumassi, feux de prodomo, juste à la rentrée de Sopim, Abidjan — Coursier SaTouba (Abidjan & environs)', 'Adresse atelier'),
('ss-7', 'shipping_fee', '0', 'Frais de livraison (FCFA) — Coursier SaTouba (Abidjan & environs) Gratuit'),
('ss-8', 'free_shipping_threshold', '0', 'Seuil livraison gratuite (FCFA) — Gratuit Abidjan'),
('ss-9', 'welcome_message', 'Bienvenue chez SaTouba Bijouterie', 'Message d accueil'),
('ss-10', 'currency', 'FCFA', 'Devise');

INSERT IGNORE INTO `MaterialPricing` (`id`, `name`, `pricePerGram`, `type`, `description`) VALUES
('mp-1', 'Or Jaune 18K', 55000, 'MATERIAL', 'Or jaune 18 carats'),
('mp-2', 'Or Blanc 18K', 58000, 'MATERIAL', 'Or blanc 18 carats'),
('mp-3', 'Or Rose 18K', 56000, 'MATERIAL', 'Or rose 18 carats'),
('mp-4', 'Diamant', 350000, 'STONE', 'Diamant serti'),
('mp-5', 'Saphir', 120000, 'STONE', 'Saphir bleu'),
('mp-6', 'Emeraude', 150000, 'STONE', 'Emeraude naturelle'),
('mp-7', 'Rubis', 180000, 'STONE', 'Rubis naturel'),
('mp-8', 'Perle', 25000, 'STONE', 'Perle de Culture'),
('mp-9', 'Argent 925', 8000, 'MATERIAL', 'Argent sterling');
