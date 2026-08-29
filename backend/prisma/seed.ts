import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const IMG = (file: string) => `/uploads/products/${file}`;

async function main() {
  console.log('Seeding database...');

  await prisma.passwordResetToken.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.like.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.customRequest.deleteMany();
  await prisma.repairRequest.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ChangeMe@2026', 12);
  const admin = await prisma.user.create({
    data: {
      id: 'user-1',
      name: 'Matar Mbow',
      identifier: 'gerantSatoubaBijouterie6002',
      password: adminPassword,
      phone: '+225 07 47 13 52 01',
      role: 'ADMIN',
      address: 'Koumassi, feux de prodomo, juste à la rentrée de Sopim, Abidjan',
      city: 'Abidjan',
      country: 'Cote d\'Ivoire',
    },
  });

  // === 6 CATEGORIES ===
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        id: 'cat-1', name: 'Bagues', slug: 'bagues',
        image: IMG('category-bagues.jpg'),
        description: "Bagues d'exception en or 18K et diamants",
      },
    }),
    prisma.category.create({
      data: {
        id: 'cat-2', name: 'Colliers', slug: 'colliers',
        image: IMG('category-colliers.jpg'),
        description: 'Colliers et pendentifs raffines',
      },
    }),
    prisma.category.create({
      data: {
        id: 'cat-3', name: 'Bracelets', slug: 'bracelets',
        image: IMG('category-bracelets.jpg'),
        description: 'Bracelets et joncs precieux',
      },
    }),
    prisma.category.create({
      data: {
        id: 'cat-4', name: "Boucles d'oreilles", slug: 'boucles-oreilles',
        image: IMG('category-creoles.jpg'),
        description: 'Creoles et puces etincelantes',
      },
    }),
    prisma.category.create({
      data: {
        id: 'cat-5', name: 'Alliances', slug: 'alliances',
        image: IMG('category-alliances.jpg'),
        description: 'Symboles eternels de votre union',
      },
    }),
    prisma.category.create({
      data: {
        id: 'cat-6', name: 'Montres', slug: 'montres',
        image: IMG('category-montres.jpg'),
        description: 'Horlogerie de prestige',
      },
    }),
  ]);

  // === 12 PRODUITS (2 par categorie) ===
  const products = await Promise.all([
    // — BAGUES —
    prisma.product.create({
      data: {
        id: 'prod-1',
        name: 'Bague Royale Diamant Or Jaune 18K',
        slug: 'bague-royale-diamant-or-jaune',
        categoryId: 'cat-1',
        description: "Fabriquee a la main par nos maitres artisans, cette bague incarne le summum du raffinement SaTouba. Diamant etincelant certifie serti sur de l'or jaune pur 18 carats, monture en pave pour une luminosite maximale.",
        price: 450000,
        compareAtPrice: 520000,
        images: JSON.stringify([IMG('bague-royale.jpg')]),
        likesCount: 38,
        inStock: true,
        stockQuantity: 5,
        isBestSeller: true,
        isPromo: true,
        material: 'Or Jaune 18K',
        collection: 'Royale',
        carats: '0.75 ct',
        weightGrams: 6.4,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-2',
        name: 'Bague Solitaire Diamant Serti Pont',
        slug: 'bague-solitaire-diamant-seri-pont',
        categoryId: 'cat-1',
        description: "Un solitaire intemporel serti d'un diamant brillant de 0.50 ct sur une monture en or blanc 18K. Le serti pont maximise la luminosite de la pierre pour un eclat incomparable.",
        price: 380000,
        images: JSON.stringify([IMG('bague-solitaire.jpg')]),
        likesCount: 21,
        inStock: true,
        stockQuantity: 7,
        material: 'Or Blanc 18K',
        collection: 'Solitaire',
        carats: '0.50 ct',
        weightGrams: 4.8,
      },
    }),

    // — COLLIERS —
    prisma.product.create({
      data: {
        id: 'prod-3',
        name: 'Collier Eclat Saphir & Or Blanc',
        slug: 'collier-eclat-saphir-or-blanc',
        categoryId: 'cat-2',
        description: "Un collier somptueux mariant la purete de l'or blanc et la profondeur envoutante d'un saphir royal entoure d'un halo de diamants. Piece unique de la collection Prestige.",
        price: 680000,
        images: JSON.stringify([IMG('collier-saphir.jpg')]),
        likesCount: 19,
        inStock: true,
        stockQuantity: 3,
        isBestSeller: true,
        isNew: true,
        material: 'Or Blanc 18K',
        collection: 'Prestige',
        carats: '1.20 ct',
        weightGrams: 12.8,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-4',
        name: 'Collier Riviera Diamants Paves',
        slug: 'collier-riviera-diamants-paves',
        categoryId: 'cat-2',
        description: "Collier riviera serti de diamants taille brillant paves le long d'un collier en or blanc 18K. Un classique de la haute joaillerie, parfait pour les occasions exceptionnelles.",
        price: 1250000,
        compareAtPrice: 1400000,
        images: JSON.stringify([IMG('collier-riviera.jpg')]),
        likesCount: 8,
        inStock: true,
        stockQuantity: 2,
        isPromo: true,
        material: 'Or Blanc 18K',
        collection: 'Haute Joaillerie',
        carats: '3.50 ct total',
        weightGrams: 18.2,
      },
    }),

    // — BRACELETS —
    prisma.product.create({
      data: {
        id: 'prod-5',
        name: 'Bracelet Jonc Tradition Or Jaune',
        slug: 'bracelet-jonc-tradition-or-jaune',
        categoryId: 'cat-3',
        description: "Inspire des parures traditionnelles revisitees avec une touche contemporaine luxueuse. Finition polie miroir, or jaune 18K massif. Un classique intemporel.",
        price: 320000,
        compareAtPrice: 350000,
        images: JSON.stringify([IMG('bracelet-jonc.jpg')]),
        likesCount: 45,
        inStock: true,
        stockQuantity: 8,
        isBestSeller: true,
        material: 'Or Jaune 18K',
        collection: 'Tradition',
        weightGrams: 18.5,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-6',
        name: 'Bracelet Tennis Diamants & Or Blanc',
        slug: 'bracelet-tennis-diamants-or-blanc',
        categoryId: 'cat-3',
        description: "Le bracelet tennis revisite par SaTouba. Diamants taille brillant uniformes serti sur un bracelet souple en or blanc 18K. Fermoir a clip securise.",
        price: 520000,
        images: JSON.stringify([IMG('bracelet-tennis.jpg')]),
        likesCount: 17,
        inStock: true,
        stockQuantity: 4,
        material: 'Or Blanc 18K',
        collection: 'Eclat',
        carats: '2.00 ct total',
        weightGrams: 12.3,
      },
    }),

    // — BOUCLES D'OREILLES —
    prisma.product.create({
      data: {
        id: 'prod-7',
        name: "Creoles Diamant Pave Or Blanc",
        slug: 'creoles-diamant-pave-or-blanc',
        categoryId: 'cat-4',
        description: "Creoles serties de diamants paves sur toute la courbe. Fermoir a clip invisible pour un confort parfait. Or blanc 18K, diamants certifies.",
        price: 275000,
        images: JSON.stringify([IMG('creoles-diamant.jpg')]),
        likesCount: 22,
        inStock: true,
        stockQuantity: 10,
        material: 'Or Blanc 18K',
        collection: 'Eclat',
        carats: '0.50 ct',
        weightGrams: 4.2,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-8',
        name: "Creoles Classiques Or Jaune Massif",
        slug: 'creoles-classiques-or-jaune-massif',
        categoryId: 'cat-4',
        description: "Creoles classiques en or jaune 18K massif. Finition brosssee pour un rendu moderne, fermoir a scroll confortable. Un incontournable du quotidien.",
        price: 125000,
        images: JSON.stringify([IMG('creoles-classiques.jpg')]),
        likesCount: 41,
        inStock: true,
        stockQuantity: 15,
        isBestSeller: true,
        material: 'Or Jaune 18K',
        collection: 'Classique',
        weightGrams: 6.8,
      },
    }),

    // — ALLIANCES —
    prisma.product.create({
      data: {
        id: 'prod-9',
        name: 'Alliance Classique Or Jaune',
        slug: 'alliance-classique-or-jaune',
        categoryId: 'cat-5',
        description: "L'alliance intemporelle par excellence. Or jaune massif 18 carats, finition brosssee pour un rendu moderne et elegant. Confort ergonomique au port quotidien.",
        price: 180000,
        images: JSON.stringify([IMG('alliance-classique.jpg')]),
        likesCount: 67,
        inStock: true,
        stockQuantity: 15,
        isBestSeller: true,
        material: 'Or Jaune 18K',
        collection: 'Classique',
        weightGrams: 5.8,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-10',
        name: 'Alliance Couple Or Jaune & Or Rose',
        slug: 'alliance-couple-or-jaune-or-rose',
        categoryId: 'cat-5',
        description: "Lot de deux alliances assorties : lui or jaune 18K brosse, elle or rose 18K poli. Gravure personnalisee incluse. Le symbole parfait de votre engagement.",
        price: 350000,
        images: JSON.stringify([IMG('alliance-couple.jpg')]),
        likesCount: 34,
        inStock: true,
        stockQuantity: 11,
        material: 'Or Jaune & Rose 18K',
        collection: 'Duo',
        weightGrams: 10.2,
      },
    }),

    // — MONTRES —
    prisma.product.create({
      data: {
        id: 'prod-11',
        name: 'Montre Prestige Or & Cuir',
        slug: 'montre-prestige-or-cuir',
        categoryId: 'cat-6',
        description: "Mouvement suisse certifie, boitier en or 18K, bracelet en cuir italien. L'alliance du luxe et de la precision. Etancheite 50m.",
        price: 890000,
        compareAtPrice: 950000,
        images: JSON.stringify([IMG('montre-prestige.jpg')]),
        likesCount: 12,
        inStock: true,
        stockQuantity: 2,
        isNew: true,
        material: 'Or Jaune 18K',
        collection: 'Prestige',
        weightGrams: 85,
      },
    }),
    prisma.product.create({
      data: {
        id: 'prod-12',
        name: 'Montre Classique Acier & Or',
        slug: 'montre-classique-acier-or',
        categoryId: 'cat-6',
        description: "Boitier en acier inoxydable avec couronne et indexes en or 18K. Bracelet milanais, verre saphir, etancheite 100m. Sport luxe elegant.",
        price: 420000,
        images: JSON.stringify([IMG('montre-classique.jpg')]),
        likesCount: 16,
        inStock: true,
        stockQuantity: 5,
        material: 'Acier & Or 18K',
        collection: 'Sport Luxe',
        weightGrams: 120,
      },
    }),
  ]);

  // Cart admin
  await prisma.cart.create({
    data: {
      id: 'cart-1', userId: 'user-1',
      items: { create: [{ productId: 'prod-1', quantity: 1, selectedSize: '52', selectedMaterial: 'Or Jaune 18K' }] },
    },
  });

  // Favorites
  await Promise.all([
    prisma.favorite.create({ data: { userId: 'user-1', productId: 'prod-1' } }),
    prisma.favorite.create({ data: { userId: 'user-1', productId: 'prod-3' } }),
  ]);

  // Notifications
  await Promise.all([
    prisma.notification.create({
      data: {
        id: 'notif-1', userId: 'user-1',
        title: 'Commande en Atelier',
        message: 'Votre commande #ORD-9281 est en cours de fabrication.',
        type: 'ORDER', read: false,
      },
    }),
    prisma.notification.create({
      data: {
        id: 'notif-2', userId: 'user-1',
        title: 'Bienvenue',
        message: 'Bienvenue chez SaTouba Bijouterie !',
        type: 'SYSTEM', read: true,
      },
    }),
  ]);

  // Order
  await prisma.order.create({
    data: {
      id: 'ORD-9281', orderNumber: 'ORD-9281', userId: 'user-1',
      customerName: admin.name,
      phone: admin.phone || '', address: admin.address || '',
      totalAmount: 450000, status: 'PREPARING',
      shippingAddress: JSON.stringify({ fullName: admin.name, phone: admin.phone, address: admin.address, city: admin.city }),
      statusHistory: JSON.stringify([
        { status: 'CONFIRMED', label: 'Confirmee', date: new Date().toISOString(), completed: true },
        { status: 'PREPARING', label: 'En fabrication', date: new Date().toISOString(), completed: true },
      ]),
      items: {
        create: [{
          productId: 'prod-1', productName: 'Bague Royale Diamant Or Jaune 18K',
          productImage: IMG('bague-royale.jpg'), price: 450000, quantity: 1, selectedSize: '52',
        }],
      },
    },
  });

  // Likes (sample)
  await Promise.all([
    prisma.like.create({ data: { userId: 'user-1', productId: 'prod-1' } }),
    prisma.like.create({ data: { userId: 'user-1', productId: 'prod-3' } }),
  ]);

  // Custom request
  await prisma.customRequest.create({
    data: {
      id: 'CUST-101', userId: 'user-1',
      jewelryType: 'Bague de Fiancailles', material: 'Or Jaune 18K',
      description: "Gravure 'A&M' a l'interieur, sertissage clos.",
      budget: '550 000 FCFA', phone: '+225 07 11 22 33 44', status: 'PENDING',
    },
  });

  // Repair request
  await prisma.repairRequest.create({
    data: {
      id: 'REP-501', userId: 'user-1',
      jewelryType: 'Chaine Or', problemType: 'Soudure',
      description: "Chaine en or 18K cassee au niveau du fermoir",
      phone: '+225 07 03 33 44 55', status: 'RECEIVED',
    },
  });

  console.log('Database seeded successfully!');
  console.log(`- Admin: ${admin.identifier} / (mot de passe depuis ADMIN_PASSWORD)`);
  console.log(`- ${categories.length} categories`);
  console.log(`- ${products.length} products`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
