import { Plan, Category, BlogPost, FAQ, ContactInfo } from '../types'

export const plans: Plan[] = [
  {
    id: '1',
    name: 'Plano Mensal',
    price: 25.00,
    period: 'monthly',
    features: [
      '5.000+ canais ao vivo',
      'Filmes e séries ilimitados',
      'Compatível com Smart TV, Smartphone e PC',
      'Suporte técnico 24/7',
      'Qualidade HD/FHD',
      'Sem fidelidade'
    ]
  },
  {
    id: '2',
    name: 'Plano Trimestral',
    price: 65.00,
    period: 'quarterly',
    features: [
      '5.000+ canais ao vivo',
      'Filmes e séries ilimitados',
      'Compatível com Smart TV, Smartphone e PC',
      'Suporte técnico 24/7',
      'Qualidade HD/FHD',
      'Economia de R$ 10,00',
      'Canais premium incluídos'
    ],
    discount: 10
  },
  {
    id: '3',
    name: 'Plano Anual',
    price: 220.00,
    period: 'yearly',
    features: [
      '5.000+ canais ao vivo',
      'Filmes e séries ilimitados',
      'Compatível com Smart TV, Smartphone e PC',
      'Suporte técnico 24/7',
      'Qualidade HD/FHD/4K',
      'Economia de R$ 80,00',
      'Canais premium incluídos',
      'Conteúdo adulto',
      'Múltiplos dispositivos'
    ],
    popular: true,
    discount: 80
  }
]

export const categories: Category[] = [
  {
    id: '1',
    name: 'Filmes',
    icon: '🎬',
    description: 'Milhares de filmes dos mais variados gêneros',
    contentCount: 15000
  },
  {
    id: '2',
    name: 'Séries',
    icon: '📺',
    description: 'Séries completas e episódios atualizados',
    contentCount: 8000
  },
  {
    id: '3',
    name: 'Esportes',
    icon: '⚽',
    description: 'Canais esportivos nacionais e internacionais',
    contentCount: 500
  },
  {
    id: '4',
    name: 'Infantis',
    icon: '🧸',
    description: 'Conteúdo educativo e divertido para crianças',
    contentCount: 300
  },
  {
    id: '5',
    name: 'Notícias',
    icon: '📰',
    description: 'Canais de notícias 24 horas',
    contentCount: 200
  },
  {
    id: '6',
    name: 'Documentários',
    icon: '📚',
    description: 'Documentários educativos e informativos',
    contentCount: 1000
  },
  {
    id: '7',
    name: 'Adultos',
    icon: '🔞',
    description: 'Conteúdo adulto exclusivo',
    contentCount: 500
  }
]

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Como configurar IPTV na sua Smart TV',
    excerpt: 'Aprenda o passo a passo para configurar o IPTV da plural na sua Smart TV Samsung, LG ou outras marcas.',
    content: 'Conteúdo completo do artigo...',
    image: '/blog/smart-tv-setup.jpg',
    author: 'Equipe plural',
    date: '2024-01-15',
    tags: ['configuração', 'smart-tv', 'tutorial']
  },
  {
    id: '2',
    title: 'Os melhores filmes de 2024',
    excerpt: 'Confira nossa seleção dos melhores filmes lançados em 2024 que você pode assistir na plural.',
    content: 'Conteúdo completo do artigo...',
    image: '/blog/best-movies-2024.jpg',
    author: 'Equipe plural',
    date: '2024-01-10',
    tags: ['filmes', '2024', 'lançamentos']
  },
  {
    id: '3',
    title: 'Dicas para melhorar a qualidade do streaming',
    excerpt: 'Descubra como otimizar sua conexão para ter a melhor experiência possível com o IPTV.',
    content: 'Conteúdo completo do artigo...',
    image: '/blog/streaming-quality.jpg',
    author: 'Equipe plural',
    date: '2024-01-05',
    tags: ['qualidade', 'streaming', 'dicas']
  }
]

export const faqs: FAQ[] = [
  {
    id: '1',
    question: 'Como instalar o IPTV da plural?',
    answer: 'O processo é simples! Após a assinatura, você receberá um link de download do aplicativo e as credenciais de acesso. Nossa equipe também oferece suporte remoto para instalação.',
    category: 'installation'
  },
  {
    id: '2',
    question: 'Quais dispositivos são compatíveis?',
    answer: 'O IPTV da plural é compatível com Smart TVs (Samsung, LG, Android TV), smartphones (Android e iOS), tablets e computadores (Windows, Mac, Linux).',
    category: 'devices'
  },
  {
    id: '3',
    question: 'Como funciona o pagamento?',
    answer: 'Aceitamos cartões de crédito/débito, PIX, transferência bancária e PayPal. O pagamento é processado de forma segura e você recebe acesso imediato após a confirmação.',
    category: 'payment'
  },
  {
    id: '4',
    question: 'Posso assistir em múltiplos dispositivos?',
    answer: 'Sim! Dependendo do seu plano, você pode usar em até 3 dispositivos simultaneamente. O plano anual permite uso em até 5 dispositivos.',
    category: 'general'
  },
  {
    id: '5',
    question: 'O que fazer se o canal não carregar?',
    answer: 'Primeiro, verifique sua conexão com a internet. Se o problema persistir, entre em contato conosco via WhatsApp para suporte técnico imediato.',
    category: 'general'
  }
]

export const contactInfo: ContactInfo = {
  whatsapp: '+244123456789',
  email: 'contato@rove-plus.com',
  phone: '+244123456789'
}
