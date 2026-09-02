import React from 'react';

// Human-friendly emoji icons with custom styling
export const Icons = {
  // Sparkles for special/premium items
  Sparkles: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>✨</span>
  ),
  
  // Arrow for navigation
  ArrowRight: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>→</span>
  ),
  
  // Shopping cart
  ShoppingCart: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🛍️</span>
  ),
  
  // Heart for favorites
  Heart: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>❤️</span>
  ),
  
  // Search icon
  Search: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🔍</span>
  ),
  
  // Menu icon
  Menu: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>☰</span>
  ),
  
  // Close icon
  X: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>✕</span>
  ),
  
  // Check mark
  Check: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>✓</span>
  ),
  
  // Chat/Message
  MessageCircle: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>💬</span>
  ),
  
  // User profile
  User: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>👤</span>
  ),
  
  // Home
  Home: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🏠</span>
  ),
  
  // Settings
  Settings: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>⚙️</span>
  ),
  
  // Bell for notifications
  Bell: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🔔</span>
  ),
  
  // Star for ratings
  Star: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>⭐</span>
  ),
  
  // Truck for delivery
  Truck: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🚚</span>
  ),
  
  // Package
  Package: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>📦</span>
  ),
  
  // Edit/Pencil
  Edit: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>✏️</span>
  ),
  
  // Trash/Delete
  Trash: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🗑️</span>
  ),
  
  // Filter
  Filter: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🔽</span>
  ),
  
  // Eye for visibility
  Eye: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>👁️</span>
  ),
  
  // Briefcase/Business
  Briefcase: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>💼</span>
  ),
  
  // Clock/Time
  Clock: (props: React.SVGProps<SVGSVGElement>) => (
    <span className="inline-flex items-center justify-center" {...props as any}>🕐</span>
  ),
};

// Export individual components for convenience
export const Sparkles = (props: React.SVGProps<SVGSVGElement>) => Icons.Sparkles(props);
export const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => Icons.ArrowRight(props);
export const ShoppingCart = (props: React.SVGProps<SVGSVGElement>) => Icons.ShoppingCart(props);
export const Heart = (props: React.SVGProps<SVGSVGElement>) => Icons.Heart(props);
export const Search = (props: React.SVGProps<SVGSVGElement>) => Icons.Search(props);
export const Menu = (props: React.SVGProps<SVGSVGElement>) => Icons.Menu(props);
export const X = (props: React.SVGProps<SVGSVGElement>) => Icons.X(props);
export const Check = (props: React.SVGProps<SVGSVGElement>) => Icons.Check(props);
export const MessageCircle = (props: React.SVGProps<SVGSVGElement>) => Icons.MessageCircle(props);
export const User = (props: React.SVGProps<SVGSVGElement>) => Icons.User(props);
export const Home = (props: React.SVGProps<SVGSVGElement>) => Icons.Home(props);
export const Settings = (props: React.SVGProps<SVGSVGElement>) => Icons.Settings(props);
export const Bell = (props: React.SVGProps<SVGSVGElement>) => Icons.Bell(props);
export const Star = (props: React.SVGProps<SVGSVGElement>) => Icons.Star(props);
export const Truck = (props: React.SVGProps<SVGSVGElement>) => Icons.Truck(props);
export const Package = (props: React.SVGProps<SVGSVGElement>) => Icons.Package(props);
export const Edit = (props: React.SVGProps<SVGSVGElement>) => Icons.Edit(props);
export const Trash = (props: React.SVGProps<SVGSVGElement>) => Icons.Trash(props);
export const Filter = (props: React.SVGProps<SVGSVGElement>) => Icons.Filter(props);
export const Eye = (props: React.SVGProps<SVGSVGElement>) => Icons.Eye(props);
export const Briefcase = (props: React.SVGProps<SVGSVGElement>) => Icons.Briefcase(props);
export const Clock = (props: React.SVGProps<SVGSVGElement>) => Icons.Clock(props);
export const ShoppingBag = ShoppingCart;
export const MessageSquare = MessageCircle;
export const CheckCircle = Check;
export const CheckCircle2 = Check;
export const Info = Bell;
export const AlertCircle = Bell;
export const Tag = Star;
export const Phone = MessageCircle;
export const MapPin = MessageCircle;
export const ShieldCheck = Check;
export const Calculator = Settings;
export const Gem = Sparkles;
export const Send = ArrowRight;
export const ArrowLeft = ArrowRight;
export const RefreshCw = Settings;
export const ChevronLeft = ArrowLeft;
export const ChevronRight = ArrowRight;
export const EyeOff = Eye;
export const Lock = Settings;
export const KeyRound = Settings;
export const Wrench = Settings;
export const LogOut = ArrowRight;
export const Share2 = ArrowRight;
export const Instagram = Star;
export const Loader2 = Settings;
export const DollarSign = Star;
export const TrendingUp = ArrowRight;
export const Users = User;
export const LayoutDashboard = Home;
export const UserCog = User;
export const ClipboardList = Package;
export const ExternalLink = ArrowRight;
export const Trash2 = Trash;
export const Shield = ShieldCheck;
export const UserCheck = User;
export const Calendar = Clock;
export const Plus = Check;
export const Store = Home;
export const LogIn = ArrowRight;
export const Upload = ArrowRight;
export const Minus = ArrowRight;
export const Square = Check;
export const CheckSquare = Check;
