import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

const Terms = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      {/* Cabeçalho */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Termos e Condições
        </h1>
        <p className="text-gray-600">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Conteúdo */}
      <div className="bg-white rounded-md shadow-lg p-6 sm:p-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceitação dos termos</h2>
          <p className="text-gray-600 leading-relaxed">
            Ao aceder e utilizar os serviços da plural IPTV, o utilizador aceita integralmente
            estes Termos e Condições. Caso não concorde com qualquer parte, deverá abster-se
            de utilizar o serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descrição do serviço</h2>
          <p className="text-gray-600 leading-relaxed">
            A plural fornece acesso a conteúdos de televisão por protocolo de internet (IPTV),
            incluindo canais ao vivo, filmes e séries. O serviço está sujeito à disponibilidade
            técnica e ao plano contratado.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Uso aceitável</h2>
          <p className="text-gray-600 leading-relaxed mb-3">
            O utilizador compromete-se a utilizar o serviço de forma legal e ética, apenas para
            consumo pessoal e não comercial. É proibido partilhar credenciais, redistribuir
            o sinal ou utilizar o serviço para fins ilícitos.
          </p>
          <p className="text-gray-600 leading-relaxed">
            A plural reserva-se o direito de suspender ou terminar o acesso em caso de violação
            destes termos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Pagamento e renovação</h2>
          <p className="text-gray-600 leading-relaxed">
            Os planos são cobrados conforme o período escolhido (mensal, trimestral ou anual).
            A renovação pode ser automática ou manual, consoante a opção selecionada no momento
            da contratação. O não pagamento na data de vencimento implica a suspensão do serviço.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Contacto</h2>
          <p className="text-gray-600 leading-relaxed">
            Para questões sobre estes termos ou sobre o serviço, utilize os canais de suporte
            indicados no site, nomeadamente a página de <Link to="/suporte" className="text-primary-600 hover:underline font-medium">Suporte</Link>.
          </p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Voltar ao início
        </Link>
      </div>
    </motion.div>
  )
}

export default Terms
