import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, User } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Início', href: '/' },
    { name: 'Planos', href: '/planos' },
    { name: 'Catálogo', href: '/catalogo' },
    { name: 'Sobre', href: '/sobre' },
    { name: 'Suporte', href: '/suporte' },
    { name: 'Blog', href: '/blog' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-black shadow-lg sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src="/logo/plural-wordmark.png" alt="plural" className="h-8 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`relative px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {item.name}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/area-cliente"
              className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
            >
              <User size={20} />
              <span>Área do Cliente</span>
            </Link>
            <Link to="/planos" className="btn-primary">
              Assinar Agora
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white/70 hover:text-white transition-colors duration-200"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-white bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-2">
                <Link
                  to="/area-cliente"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-white/70 hover:text-white transition-colors duration-200"
                >
                  <User size={20} />
                  <span>Área do Cliente</span>
                </Link>
                <Link
                  to="/planos"
                  onClick={() => setIsMenuOpen(false)}
                  className="block w-full text-center btn-primary"
                >
                  Assinar Agora
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}

export default Header
