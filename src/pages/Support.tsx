import { motion } from 'framer-motion'
import { useState } from 'react'
import { 
  MessageCircle, 
  Mail, 
  Phone, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Headphones,
  Zap,
  Users
} from 'lucide-react'
import { faqs, contactInfo } from '../utils/data'

const Support = () => {
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = [
    { id: 'all', name: 'Todas', count: faqs.length },
    { id: 'installation', name: 'Instalação', count: faqs.filter(faq => faq.category === 'installation').length },
    { id: 'devices', name: 'Dispositivos', count: faqs.filter(faq => faq.category === 'devices').length },
    { id: 'payment', name: 'Pagamento', count: faqs.filter(faq => faq.category === 'payment').length },
    { id: 'general', name: 'Geral', count: faqs.filter(faq => faq.category === 'general').length }
  ]

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory)

  const handleWhatsAppContact = () => {
    const message = encodeURIComponent(
      'Olá! Preciso de ajuda com o IPTV da plural. Pode me ajudar?'
    )
    const whatsappUrl = `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  const supportChannels = [
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: 'WhatsApp',
      description: 'Suporte rápido e direto',
      contact: contactInfo.whatsapp,
      action: handleWhatsAppContact,
      color: 'from-green-500 to-green-600'
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: 'E-mail',
      description: 'Para questões mais detalhadas',
      contact: contactInfo.email,
      action: () => window.open(`mailto:${contactInfo.email}`, '_blank'),
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: <Phone className="w-8 h-8" />,
      title: 'Telefone',
      description: 'Atendimento por voz',
      contact: contactInfo.phone || contactInfo.whatsapp,
      action: () => window.open(`tel:${contactInfo.phone || contactInfo.whatsapp}`, '_blank'),
      color: 'from-purple-500 to-purple-600'
    }
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
            Central de Suporte
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Estamos aqui para ajudar você a aproveitar ao máximo o IPTV da plural. 
            Encontre respostas rápidas ou entre em contato conosco.
          </p>
        </motion.div>

        {/* Support Channels */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Canais de Atendimento
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supportChannels.map((channel, index) => (
              <motion.div
                key={channel.title}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="card p-8 text-center hover:scale-105 transition-transform duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${channel.color} rounded-full flex items-center justify-center mx-auto mb-6 text-white`}>
                  {channel.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {channel.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {channel.description}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  {channel.contact}
                </p>
                <button
                  onClick={channel.action}
                  className="btn-primary w-full"
                >
                  Entrar em Contato
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Perguntas Frequentes
          </h2>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                  activeCategory === category.id
                    ? 'bg-white text-black'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                >
                  <h3 className="font-semibold text-gray-900 pr-4">
                    {faq.question}
                  </h3>
                  {openFaq === faq.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {openFaq === faq.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-4"
                  >
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-20"
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Envie sua Mensagem
            </h2>
            <div className="card p-8">
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Assunto
                  </label>
                  <select
                    id="subject"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Selecione um assunto</option>
                    <option value="technical">Problema Técnico</option>
                    <option value="billing">Cobrança</option>
                    <option value="account">Conta</option>
                    <option value="general">Geral</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Descreva sua dúvida ou problema..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full btn-primary"
                >
                  Enviar Mensagem
                </button>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Support Features */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Por que escolher nosso suporte?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Disponibilidade 24/7
              </h3>
              <p className="text-gray-600">
                Nossa equipe está sempre disponível para ajudar você, a qualquer hora do dia ou da noite.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Resposta Rápida
              </h3>
              <p className="text-gray-600">
                Tempo médio de resposta de menos de 5 minutos via WhatsApp e 2 horas por e-mail.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Especialistas Qualificados
              </h3>
              <p className="text-gray-600">
                Equipe técnica especializada em IPTV com anos de experiência no mercado.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-md p-8 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ainda precisa de ajuda?
            </h2>
            <p className="text-xl mb-8 text-gray-100">
              Nossa equipe está pronta para resolver qualquer problema que você tenha
            </p>
            <button
              onClick={handleWhatsAppContact}
              className="bg-white text-primary-600 font-semibold py-3 px-8 rounded-md hover:bg-gray-100 transition-colors duration-200"
            >
              <Headphones className="w-5 h-5 mr-2 inline" />
              Falar com Especialista
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Support
