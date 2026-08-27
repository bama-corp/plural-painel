import { Link } from 'react-router-dom'
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react'
import { contactInfo } from '../utils/data'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    produtos: [
      { name: 'Planos', href: '/planos' },
      { name: 'Catálogo', href: '/catalogo' },
      { name: 'Área do Cliente', href: '/area-cliente' },
    ],
    empresa: [
      { name: 'Sobre Nós', href: '/sobre' },
      { name: 'Blog', href: '/blog' },
      { name: 'Carreiras', href: '/carreiras' },
    ],
    suporte: [
      { name: 'Central de Ajuda', href: '/suporte' },
      { name: 'FAQ', href: '/suporte#faq' },
      { name: 'Contato', href: '/suporte#contato' },
    ],
  }

  return (
    <footer className="bg-black text-white border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src="/logo/plural-wordmark.png" alt="plural" className="h-8 w-auto object-contain" />
            </Link>
            <p className="text-gray-300 mb-4">
              Transformando o jeito como você consome entretenimento, unindo tecnologia e acessibilidade em um só serviço.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Produtos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Produtos</h3>
            <ul className="space-y-2">
              {footerLinks.produtos.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2">
              {footerLinks.empresa.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-2">
              {footerLinks.suporte.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center space-x-2 text-gray-300">
                <Phone size={16} />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <Mail size={16} />
                <span>{contactInfo.email}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <MapPin size={16} />
                <span>Luanda, Angola</span>
              </div>
            </div>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {currentYear} plural. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacidade" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Política de Privacidade
              </Link>
              <Link to="/termos" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Termos de Uso
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
