export interface Plan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  popular?: boolean;
  discount?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  contentCount: number;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  date: string;
  tags: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'installation' | 'devices' | 'payment' | 'general';
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  subscriptionStatus: 'active' | 'expired' | 'cancelled';
  expiresAt: string;
}

export interface ContactInfo {
  whatsapp: string;
  email: string;
  phone?: string;
}
