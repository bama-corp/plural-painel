import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { contactInfo } from '../utils/data'

const WhatsAppButton = () => {
  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(
      'Olá! Gostaria de saber mais sobre os planos da plural IPTV. Pode me ajudar?'
    )
    const whatsappUrl = `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <motion.button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <MessageCircle size={24} />
      <span className="sr-only">Contato via WhatsApp</span>
    </motion.button>
  )
}

export default WhatsAppButton
