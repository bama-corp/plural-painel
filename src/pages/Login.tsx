import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, User, LifeBuoy } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { defaultPanelPath } from '../lib/panelRoles'
import { LoginThemeSwapButton } from '../components/LoginThemeSwap'

const fieldShadow =
  'border-0 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.06)] focus:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_0_0_1.5px_rgba(0,0,0,0.18)]'
const btnShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.14),0_8px_20px_rgba(0,0,0,0.12)]'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { showError } = useAlert()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const loggedIn = await login(email, password)
      navigate(defaultPanelPath(loggedIn.role), { replace: true })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="relative min-h-screen bg-[#fafafa] text-black font-sans overflow-hidden"
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <button
        type="button"
        className="absolute -top-1 left-5 sm:-top-2 sm:left-8 z-20"
        aria-label="plural"
      >
        <span className="plural-wordmark-mask block h-36 sm:h-44 w-[14rem] sm:w-[18rem] bg-black" />
      </button>

      <div
        aria-hidden
        className="plural-mark-mask pointer-events-none absolute left-[58%] top-[62%] z-0 h-[min(160vmin,1400px)] w-[min(160vmin,1400px)] -translate-x-1/2 -translate-y-1/2 bg-black opacity-[0.08] sm:left-[60%] sm:top-[64%] sm:h-[min(170vmin,1600px)] sm:w-[min(170vmin,1600px)]"
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative w-full max-w-[400px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute top-[8%] bottom-[8%] -right-3 w-10 rounded-sm bg-black/[0.12] blur-2xl sm:-right-4 sm:w-14"
          />

          <div className="relative rounded-md bg-[#fafafa] px-7 py-9 sm:px-9 sm:py-10">
            <h1 className="text-[1.75rem] sm:text-[2rem] font-bold tracking-tight text-black leading-tight">
              Bem-vindo ao Plural
            </h1>
            <p className="mt-2 text-[15px] text-neutral-500 leading-snug">
              Gestão de clientes, servidores e renovações num só painel.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@roveplus.com')
                  setPassword('admin123')
                }}
                className={`w-full rounded-md bg-white px-3.5 py-3 text-left transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.12)] ${fieldShadow}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Acesso provisório
                </p>
                <p className="mt-1 text-sm text-black">
                  <span className="font-medium">admin@roveplus.com</span>
                  <span className="text-neutral-400"> · </span>
                  <span className="font-mono text-[13px]">admin123</span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">Clique para preencher</p>
              </button>

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-semibold text-black">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden
                  />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full rounded-md bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-black placeholder:text-neutral-400 outline-none transition-shadow ${fieldShadow}`}
                    placeholder="Escreva o seu email"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-semibold text-black">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                    aria-hidden
                  />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full rounded-md bg-white py-2.5 pl-10 pr-3.5 text-[15px] text-black placeholder:text-neutral-400 outline-none transition-shadow ${fieldShadow}`}
                    placeholder="Escreva a sua senha"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-[15px] font-medium text-white transition-all hover:bg-neutral-800 disabled:opacity-50 ${btnShadow}`}
              >
                {loading ? 'A entrar...' : 'Continuar'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </form>

            <div className="mt-8 space-y-2.5 text-center text-sm text-neutral-500">
              <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <LifeBuoy className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                Esqueceu a senha?{' '}
                <span className="text-black font-medium">Contacte o administrador</span>
              </p>
              <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <User className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                É cliente?{' '}
                <LoginThemeSwapButton
                  to="/"
                  theme="dark"
                  className="text-black font-medium underline underline-offset-2 hover:no-underline"
                >
                  Área do cliente
                </LoginThemeSwapButton>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
