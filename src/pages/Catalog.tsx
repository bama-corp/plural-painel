import { motion } from 'framer-motion'
import { useState } from 'react'
import { ArrowRight, Play, Star, Clock, Users } from 'lucide-react'
import { categories } from '../utils/data'

const Catalog = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const featuredContent = [
    {
      id: '1',
      title: 'Vingadores: Ultimato',
      type: 'Filme',
      category: 'Ação',
      rating: 4.8,
      duration: '3h 1min',
      year: 2019,
      image: '/movies/avengers.jpg',
      description: 'Os Vingadores se reúnem mais uma vez para reverter as ações de Thanos e restaurar o equilíbrio do universo.'
    },
    {
      id: '2',
      title: 'Stranger Things',
      type: 'Série',
      category: 'Drama',
      rating: 4.7,
      duration: '4 temporadas',
      year: 2016,
      image: '/series/stranger-things.jpg',
      description: 'Um grupo de crianças descobre segredos sobrenaturais em sua pequena cidade.'
    },
    {
      id: '3',
      title: 'The Crown',
      type: 'Série',
      category: 'Drama',
      rating: 4.6,
      duration: '6 temporadas',
      year: 2016,
      image: '/series/crown.jpg',
      description: 'A história da rainha Elizabeth II e dos eventos que moldaram a segunda metade do século XX.'
    },
    {
      id: '4',
      title: 'Dune',
      type: 'Filme',
      category: 'Ficção Científica',
      rating: 4.5,
      duration: '2h 35min',
      year: 2021,
      image: '/movies/dune.jpg',
      description: 'Paul Atreides lidera uma rebelião para restaurar o planeta deserto de Arrakis.'
    }
  ]

  const popularChannels = [
    { name: 'Globo', category: 'Entretenimento', viewers: '2.5M' },
    { name: 'SBT', category: 'Entretenimento', viewers: '1.8M' },
    { name: 'Record', category: 'Entretenimento', viewers: '1.2M' },
    { name: 'Band', category: 'Entretenimento', viewers: '900K' },
    { name: 'ESPN', category: 'Esportes', viewers: '1.5M' },
    { name: 'Sportv', category: 'Esportes', viewers: '1.1M' },
    { name: 'CNN', category: 'Notícias', viewers: '800K' },
    { name: 'BBC', category: 'Notícias', viewers: '750K' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Explore nosso vasto catálogo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Mais de 25.000 títulos entre filmes, séries, documentários e canais ao vivo. 
            Tudo organizado para você encontrar exatamente o que procura.
          </p>
        </motion.div>

        {/* Categories Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Categorias
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                className={`card p-6 text-center cursor-pointer transition-all duration-300 ${
                  selectedCategory === category.id 
                    ? 'ring-2 ring-accent-500 scale-105' 
                    : 'hover:scale-105'
                }`}
              >
                <div className="text-4xl mb-4">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {category.description}
                </p>
                <div className="text-accent-600 font-semibold text-sm">
                  {category.contentCount.toLocaleString()}+ títulos
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Featured Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Destaques
            </h2>
            <button className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredContent.map((content, index) => (
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="card overflow-hidden group"
              >
                <div className="relative h-48 bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                  <div className="text-6xl text-white opacity-20">
                    {content.type === 'Filme' ? '🎬' : '📺'}
                  </div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                  <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-accent-600">
                      {content.type}
                    </span>
                    <div className="flex items-center text-yellow-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-semibold ml-1">
                        {content.rating}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                    {content.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {content.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{content.duration}</span>
                    </div>
                    <span>{content.year}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Popular Channels */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Canais Populares
            </h2>
            <button className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
              Ver todos os canais
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularChannels.map((channel, index) => (
              <motion.div
                key={channel.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="card p-6 hover:scale-105 transition-transform duration-300"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-md flex items-center justify-center text-white font-bold text-xl mb-4">
                  {channel.name.charAt(0)}
                </div>
                
                <h3 className="font-bold text-gray-900 mb-2">
                  {channel.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3">
                  {channel.category}
                </p>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-1" />
                  <span>{channel.viewers} espectadores</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-md p-8 text-white text-center"
        >
          <h2 className="text-3xl font-bold mb-8">
            Números impressionantes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">5.000+</div>
              <div className="text-gray-200">Canais ao vivo</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25.000+</div>
              <div className="text-gray-200">Filmes e séries</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50.000+</div>
              <div className="text-gray-200">Clientes satisfeitos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-gray-200">Suporte disponível</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Catalog
