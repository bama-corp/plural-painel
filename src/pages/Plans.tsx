import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Star, ArrowRight, Zap, Shield, Headphones } from 'lucide-react'
import { plans } from '../utils/data'

const Plans = () => {
  const features = [
    '5.000+ canais ao vivo',
    'Filmes e séries ilimitados',
    'Compatível com Smart TV, Smartphone e PC',
    'Suporte técnico 24/7',
    'Qualidade HD/FHD',
    'Sem fidelidade',
    'Canais premium incluídos',
    'Qualidade 4K',
    'Conteúdo adulto',
    'Múltiplos dispositivos',
    'Economia garantida'
  ]

  const getFeatureValue = (plan: typeof plans[0], feature: string) => {
    if (feature === '5.000+ canais ao vivo') return true
    if (feature === 'Filmes e séries ilimitados') return true
    if (feature === 'Compatível com Smart TV, Smartphone e PC') return true
    if (feature === 'Suporte técnico 24/7') return true
    if (feature === 'Sem fidelidade') return true
    
    if (feature === 'Qualidade HD/FHD') {
      return plan.period === 'yearly' ? 'HD/FHD/4K' : 'HD/FHD'
    }
    
    if (feature === 'Canais premium incluídos') {
      return plan.period !== 'monthly'
    }
    
    if (feature === 'Qualidade 4K') {
      return plan.period === 'yearly'
    }
    
    if (feature === 'Conteúdo adulto') {
      return plan.period === 'yearly'
    }
    
    if (feature === 'Múltiplos dispositivos') {
      return plan.period === 'yearly' ? 'Até 5 dispositivos' : 'Até 3 dispositivos'
    }
    
    if (feature === 'Economia garantida') {
      return plan.discount ? `R$ ${plan.discount.toFixed(2).replace('.', ',')}` : false
    }
    
    return false
  }

  const handleWhatsAppContact = (planName: string) => {
    const message = encodeURIComponent(
      `Olá! Gostaria de assinar o ${planName} da plural IPTV. Pode me ajudar com o processo?`
    )
    const whatsappUrl = `https://wa.me/244123456789?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

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
            Escolha o plano ideal para você
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Todos os nossos planos incluem acesso completo ao catálogo. 
            Quanto mais tempo você assinar, mais você economiza!
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`card p-8 relative ${plan.popular ? 'ring-2 ring-accent-500 scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Mais Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gradient">
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-gray-600 text-lg">
                    /{plan.period === 'monthly' ? 'mês' : plan.period === 'quarterly' ? 'trimestre' : 'ano'}
                  </span>
                </div>
                {plan.discount && (
                  <p className="text-accent-600 font-semibold text-lg">
                    Economia de R$ {plan.discount.toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-accent-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleWhatsAppContact(plan.name)}
                className="w-full btn-primary"
              >
                Quero este plano
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="bg-white rounded-md shadow-xl overflow-hidden"
        >
          <div className="px-6 py-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Comparativo Completo
            </h2>
            <p className="text-gray-600 text-center mt-2">
              Veja todas as diferenças entre nossos planos
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                    Recursos
                  </th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-900 mb-2">
                        {plan.name}
                      </div>
                      <div className="text-2xl font-bold text-gradient">
                        R$ {plan.price.toFixed(2).replace('.', ',')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {features.map((feature, index) => (
                  <tr key={feature} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {feature}
                    </td>
                    {plans.map((plan) => {
                      const value = getFeatureValue(plan, feature)
                      return (
                        <td key={plan.id} className="px-6 py-4 text-center">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CheckCircle className="w-5 h-5 text-accent-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {value}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Benefícios exclusivos da plural
            </h2>
            <p className="text-xl text-gray-600">
              Além de um catálogo incrível, oferecemos muito mais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Ativação Instantânea
              </h3>
              <p className="text-gray-600">
                Receba acesso imediatamente após a confirmação do pagamento
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Pagamento Seguro
              </h3>
              <p className="text-gray-600">
                Transações protegidas com criptografia de ponta a ponta
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Suporte 24/7
              </h3>
              <p className="text-gray-600">
                Equipe técnica sempre disponível para ajudar você
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-md p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ainda tem dúvidas?
            </h2>
            <p className="text-xl mb-8 text-gray-100">
              Nossa equipe está pronta para ajudar você a escolher o plano ideal
            </p>
            <button
              onClick={() => handleWhatsAppContact('melhor plano')}
              className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-md hover:bg-gray-100 transition-colors duration-200"
            >
              Falar com Especialista
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Plans
