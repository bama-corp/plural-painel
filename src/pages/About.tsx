import { motion } from 'framer-motion'
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Shield,
  Zap,
  Headphones
} from 'lucide-react'

const About = () => {
  const values = [
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Paixão pelo Cliente',
      description: 'Colocamos nossos clientes em primeiro lugar, sempre buscando superar suas expectativas.'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Inovação Constante',
      description: 'Sempre em busca das melhores tecnologias para oferecer a melhor experiência.'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Confiabilidade',
      description: 'Compromisso com a qualidade e estabilidade do nosso serviço.'
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Trabalho em Equipe',
      description: 'Valorizamos a colaboração e o respeito mútuo em tudo que fazemos.'
    }
  ]

  const milestones = [
    { year: '2020', title: 'Fundação', description: 'A plural nasceu com a missão de democratizar o entretenimento' },
    { year: '2021', title: 'Primeiros Clientes', description: 'Alcançamos nossos primeiros 1.000 clientes satisfeitos' },
    { year: '2022', title: 'Expansão', description: 'Ampliamos nossa cobertura para todo o território nacional' },
    { year: '2023', title: 'Inovação', description: 'Lançamos novos recursos e melhoramos a qualidade do serviço' },
    { year: '2024', title: 'Liderança', description: 'Nos tornamos referência em IPTV premium no mercado' }
  ]

  const team = [
    {
      name: 'João Silva',
      role: 'CEO & Fundador',
      description: 'Especialista em tecnologia com mais de 10 anos de experiência no setor de streaming.'
    },
    {
      name: 'Maria Santos',
      role: 'CTO',
      description: 'Responsável pela arquitetura técnica e inovação da plataforma.'
    },
    {
      name: 'Pedro Costa',
      role: 'Diretor de Operações',
      description: 'Garante a excelência operacional e a satisfação dos clientes.'
    },
    {
      name: 'Ana Oliveira',
      role: 'Diretora de Marketing',
      description: 'Estratégias de crescimento e relacionamento com o cliente.'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Sobre a plural
          </h1>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            A plural nasceu para transformar o jeito como você consome entretenimento, 
            unindo tecnologia e acessibilidade em um só serviço. Somos apaixonados por 
            oferecer a melhor experiência de IPTV para nossos clientes.
          </p>
        </motion.div>

        {/* Mission, Vision, Values */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
              <Target className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Nossa Missão</h3>
            <p className="text-gray-600">
              Democratizar o acesso ao entretenimento de qualidade, oferecendo uma 
              plataforma confiável e acessível para todos os brasileiros.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
              <Eye className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Nossa Visão</h3>
            <p className="text-gray-600">
              Ser a principal referência em IPTV premium no Brasil, reconhecida pela 
              qualidade, inovação e compromisso com o cliente.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="card p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-accent-500 to-accent-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Nossos Valores</h3>
            <p className="text-gray-600">
              Paixão pelo cliente, inovação constante, confiabilidade e trabalho em equipe 
              são os pilares que guiam nossas ações diárias.
            </p>
          </motion.div>
        </div>

        {/* Values Detail */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Nossos Valores em Detalhes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                className="card p-6"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-md flex items-center justify-center text-white flex-shrink-0">
                    {value.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {value.title}
                    </h3>
                    <p className="text-gray-600">
                      {value.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Nossa Jornada
          </h2>
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-primary-500 to-secondary-500"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={milestone.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="card p-6">
                      <div className="text-2xl font-bold text-gradient mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-gray-600">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full border-4 border-white shadow-lg relative z-10"></div>
                  <div className="w-1/2"></div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Team */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="mb-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Nossa Equipe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="card p-6 text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">
                  {member.name.charAt(0)}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <p className="text-accent-600 font-semibold mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 text-sm">
                  {member.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-md p-8 text-white text-center"
        >
          <h2 className="text-3xl font-bold mb-8">
            Números que nos orgulham
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">50.000+</div>
              <div className="text-gray-200">Clientes satisfeitos</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-gray-200">Uptime garantido</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-gray-200">Suporte disponível</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.8</div>
              <div className="text-gray-200">Avaliação média</div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
          className="text-center mt-20"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Faça parte da nossa história
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Junte-se a milhares de clientes que já escolheram a plural para seu entretenimento
          </p>
          <button
            onClick={() => {
              const message = encodeURIComponent('Olá! Gostaria de saber mais sobre a plural e seus planos.')
              const whatsappUrl = `https://wa.me/244123456789?text=${message}`
              window.open(whatsappUrl, '_blank')
            }}
            className="btn-primary"
          >
            <Headphones className="w-5 h-5 mr-2" />
            Falar Conosco
          </button>
        </motion.div>
      </div>
    </div>
  )
}

export default About
