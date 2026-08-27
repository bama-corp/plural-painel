import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  Calendar, 
  User, 
  ArrowRight, 
  Search,
  Filter,
  Clock
} from 'lucide-react'
import { blogPosts } from '../utils/data'

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('all')

  const allTags = Array.from(new Set(blogPosts.flatMap(post => post.tags)))
  
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = selectedTag === 'all' || post.tags.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const featuredPost = blogPosts[0]

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
            Blog plural
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Dicas, novidades e tudo sobre o mundo do IPTV. Fique por dentro das últimas 
            tendências e aprenda a aproveitar ao máximo seu entretenimento.
          </p>
        </motion.div>

        {/* Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar artigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">Filtrar por:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">Todas as categorias</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Featured Post */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Artigo em Destaque</h2>
          <div className="card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="relative h-64 lg:h-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                <div className="text-8xl text-white opacity-20">📺</div>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute top-4 left-4">
                  <span className="bg-accent-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Destaque
                  </span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(featuredPost.date)}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {featuredPost.author}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {featuredPost.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex space-x-2">
                    {featuredPost.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button className="text-primary-600 hover:text-primary-700 font-semibold flex items-center">
                    Ler mais
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Posts Grid */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Últimos Artigos</h2>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhum artigo encontrado com os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.slice(1).map((post, index) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="card overflow-hidden hover:scale-105 transition-transform duration-300"
                >
                  <div className="relative h-48 bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                    <div className="text-6xl text-white opacity-20">📝</div>
                    <div className="absolute inset-0 bg-black/20"></div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {formatDate(post.date)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        5 min leitura
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {post.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 font-semibold flex items-center text-sm">
                        Ler mais
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </motion.div>

        {/* Popular Tags */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Categorias Populares</h2>
          <div className="flex flex-wrap gap-3">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? 'all' : tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  selectedTag === tag
                    ? 'bg-white text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-md p-8 text-white text-center"
        >
          <h2 className="text-3xl font-bold mb-4">
            Fique por dentro das novidades
          </h2>
          <p className="text-xl mb-8 text-gray-100">
            Receba as últimas dicas e novidades sobre IPTV diretamente no seu e-mail
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Seu melhor e-mail"
              className="flex-1 px-4 py-3 rounded-md text-gray-900 focus:ring-2 focus:ring-white focus:outline-none"
            />
            <button className="bg-white text-primary-600 font-semibold px-6 py-3 rounded-md hover:bg-gray-100 transition-colors duration-200">
              Inscrever
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Blog
