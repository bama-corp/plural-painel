import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Play, 
  Tv, 
  Smartphone, 
  Monitor, 
  Headphones, 
  Zap, 
  Shield, 
  ArrowRight,
  CheckCircle
} from 'lucide-react'
import { plans, categories } from '../utils/data'

const Home = () => {
  const features = [
    {
      icon: <Tv className="w-8 h-8" />,
      title: 'Smart TV',
      description: 'Compatível com Samsung, LG, Android TV e mais'
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: 'Smartphone',
      description: 'Apps nativos para Android e iOS'
    },
    {
      icon: <Monitor className="w-8 h-8" />,
      title: 'Computador',
      description: 'Windows, Mac e Linux suportados'
    }
  ]

  const benefits = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Acesso Imediato',
      description: 'Ativação instantânea após o pagamento'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Pagamento Seguro',
      description: 'Transações protegidas e criptografadas'
    },
    {
      icon: <Headphones className="w-6 h-6" />,
      title: 'Suporte 24/7',
      description: 'Atendimento técnico sempre disponível'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-bg text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Filmes, séries e canais ao vivo na{' '}
                <span className="text-accent-400">palma da sua mão</span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-200 mb-8">
                Mais de 5.000 canais e conteúdos sob demanda. Assista onde quiser, quando quiser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/planos" className="btn-primary text-center">
                  <Play className="w-5 h-5 mr-2 inline" />
                  Experimente Agora
                </Link>
                <Link to="/catalogo" className="btn-secondary text-center">
                  Ver Catálogo
                  <ArrowRight className="w-5 h-5 ml-2 inline" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-md rounded-md p-8 border border-white/20">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-accent-400 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">Comece Hoje Mesmo</h3>
                  <p className="text-gray-200 mb-6">
                    A partir de apenas R$ 25,00/mês
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                      <span>5.000+ canais ao vivo</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                      <span>Filmes e séries ilimitados</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                      <span>Suporte técnico 24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Compatível com todos os seus dispositivos
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Assista seus conteúdos favoritos em qualquer lugar, a qualquer hora
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="card p-8 text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher a plural?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Oferecemos a melhor experiência de IPTV com qualidade e confiabilidade
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Preview Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Escolha o plano ideal para você e comece a aproveitar o melhor do entretenimento
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className={`card p-8 relative ${plan.popular ? 'ring-2 ring-accent-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gradient">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-gray-600">
                      /{plan.period === 'monthly' ? 'mês' : plan.period === 'quarterly' ? 'trimestre' : 'ano'}
                    </span>
                  </div>
                  {plan.discount && (
                    <p className="text-accent-600 font-semibold">
                      Economia de R$ {plan.discount.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-accent-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/planos"
                  className="w-full btn-primary text-center block"
                >
                  Quero este plano
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/planos" className="btn-secondary">
              Ver todos os planos
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories Preview Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Milhares de conteúdos para todos os gostos
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore nosso vasto catálogo de filmes, séries, esportes e muito mais
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6 text-center hover:scale-105 transition-transform duration-300"
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

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/catalogo" className="btn-primary">
              Explorar Catálogo Completo
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-bg text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Pronto para transformar sua experiência de entretenimento?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Junte-se a milhares de clientes satisfeitos que já escolheram a plural
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/planos" className="btn-primary">
                <Play className="w-5 h-5 mr-2" />
                Começar Agora
              </Link>
              <Link to="/sobre" className="btn-secondary">
                Conhecer Mais
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default Home
