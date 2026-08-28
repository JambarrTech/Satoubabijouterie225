export type UserRole = 'CUSTOMER' | 'ADMIN' | 'ARTISAN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  address?: string;
  city?: string;
  country?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  itemCount?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  category?: Category;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  likesCount: number;
  inStock: boolean;
  stockQuantity: number;
  isBestSeller?: boolean;
  isNew?: boolean;
  isPromo?: boolean;
  material?: string;
  collection?: string;
  carats?: string;
  weightGrams?: number;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedMaterial?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  quantity: number;
  selectedSize?: string;
}

export type OrderStatus = 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    notes?: string;
  };
  paymentMethod: 'WAVE' | 'ORANGE_MONEY';
  paymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentRef?: string;
  paymentUrl?: string;
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    label: string;
    date: string;
    completed: boolean;
  }[];
  createdAt: string;
}

export interface Like {
  id: string;
  productId: string;
  userId: string;
  user?: { name: string; avatar?: string };
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountPercent: number;
  expiryDate: string;
  isActive: boolean;
}

export type CustomRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'QUOTE_SENT' | 'APPROVED' | 'COMPLETED';

export interface CustomRequest {
  id: string;
  userId: string;
  jewelryType: string;
  material: string;
  description: string;
  budget?: string;
  referenceImageUrl?: string;
  phone: string;
  status: CustomRequestStatus;
  createdAt: string;
}

export type RepairRequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'DELIVERED';

export interface RepairRequest {
  id: string;
  userId: string;
  jewelryType: string;
  problemType: string;
  description: string;
  photos: string[];
  phone: string;
  status: RepairRequestStatus;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PROMO' | 'SYSTEM' | 'REPAIR';
  read: boolean;
  createdAt: string;
}
