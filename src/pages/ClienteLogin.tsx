import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, LifeBuoy, Globe, ExternalLink } from 'lucide-react'
import { RoveModalOverlay } from '../components/RoveModalOverlay'
import { useLoginThemeSwap } from '../components/LoginThemeSwap'
import { WhatsappAoInput } from '../components/WhatsappAoInput'
import { ROVE_PUBLIC_SITE_URL } from '../lib/roveSite'
import { useClientPortal } from '../contexts/ClientPortalContext'
import { useAlert } from '../contexts/AlertContext'
import { clientPortalApi } from '../api/clientPortal'
import { emptyWhatsapp } from '../utils/whatsapp'

const fieldShadow =
  'border-0 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.4)] focus:shadow-[0_0_0_1.5px_rgba(255,255,255,0.35),0_1px_3px_rgba(0,0,0,0.5)]'
const btnShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.35)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.4)]'

const STAFF_TAPS_NEEDED = 8
const STAFF_TAP_WINDOW_MS = 3500

export default function ClienteLogin() {
  const [whatsapp, setWhatsapp] = useState(() => emptyWhatsapp())
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRecover, setShowRecover] = useState(false)
  const [recoverWhatsapp, setRecoverWhatsapp] = useState(() => emptyWhatsapp())
  const [recoverMsg, setRecoverMsg] = useState('')
  const [recoverLoading, setRecoverLoading] = useState(false)
  const logoTaps = useRef<{ count: number; firstAt: number }>({ count: 0, firstAt: 0 })
  const { login } = useClientPortal()
  const { showError } = useAlert()
  const navigate = useNavigate()
  const { swapTo } = useLoginThemeSwap()

  const handleLogoSecretTap = useCallback(() => {
    const now = Date.now()
    if (now - logoTaps.current.firstAt > STAFF_TAP_WINDOW_MS) {
      logoTaps.current = { count: 1, firstAt: now }
      return
    }
    logoTaps.current.count += 1
    if (logoTaps.current.count >= STAFF_TAPS_NEEDED) {
      logoTaps.current = { count: 0, firstAt: 0 }
      swapTo('/login', 'light')
    }
  }, [swapTo])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(whatsapp, pin)
      navigate('/cliente', { replace: true })
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleRecoverPin(e: React.FormEvent) {
    e.preventDefault()
    setRecoverMsg('')
    setRecoverLoading(true)
    try {
      const r = await clientPortalApi.post<{ ok: boolean; message?: string }>(
        '/api/client-portal/recover-pin',
        { whatsapp: recoverWhatsapp }
      )
      setRecoverMsg(r.message || 'Pedido processado. Verifique o seu WhatsApp.')
    } catch (err) {
      setRecoverMsg(err instanceof Error ? err.message : 'Erro ao recuperar PIN.')
    } finally {
      setRecoverLoading(false)
    }
  }

  return (
    <motion.div
      className="relative min-h-screen bg-black text-white font-sans overflow-hidden"
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <button
        type="button"
        onClick={handleLogoSecretTap}
        className="absolute left-4 top-3 z-20 cursor-default select-none sm:-top-2 sm:left-8"
        aria-label="plural"
      >
        <span className="plural-wordmark-mask block h-16 w-[9.5rem] bg-white sm:h-44 sm:w-[18rem]" />
      </button>

      <div
        aria-hidden
        className="plural-mark-mask pointer-events-none absolute left-[58%] top-[62%] z-0 h-[min(160vmin,1400px)] w-[min(160vmin,1400px)] -translate-x-1/2 -translate-y-1/2 bg-white opacity-[0.07] sm:left-[60%] sm:top-[64%] sm:h-[min(170vmin,1600px)] sm:w-[min(170vmin,1600px)]"
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
            className="pointer-events-none absolute top-[8%] bottom-[8%] -right-3 w-10 rounded-sm bg-white/[0.14] blur-2xl sm:-right-4 sm:w-14"
          />

          <div className="relative rounded-md bg-black px-7 py-9 sm:px-9 sm:py-10">
            <h1 className="text-[1.75rem] sm:text-[2rem] font-bold tracking-tight text-white leading-tight">
              Área do cliente
            </h1>
            <p className="mt-2 text-[15px] text-neutral-400 leading-snug">
              Entre com o WhatsApp registado e o PIN da área cliente.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="cl-whatsapp" className="block text-sm font-semibold text-white">
                  WhatsApp
                </label>
                <WhatsappAoInput
                  id="cl-whatsapp"
                  value={whatsapp}
                  onChange={setWhatsapp}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="cl-pin" className="block text-sm font-semibold text-white">
                  PIN
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    aria-hidden
                  />
                  <input
                    id="cl-pin"
                    type="password"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className={`w-full rounded-md bg-[#111] py-2.5 pl-10 pr-3.5 text-[15px] text-white placeholder:text-neutral-600 outline-none transition-shadow tracking-widest ${fieldShadow}`}
                    placeholder="••••••"
                    required
                    minLength={4}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-2.5 text-[15px] font-medium text-black transition-all hover:bg-neutral-200 disabled:opacity-50 ${btnShadow}`}
              >
                {loading ? 'A entrar…' : 'Continuar'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </form>

            <div className="mt-8 space-y-2.5 text-center text-sm text-neutral-500">
              <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
                <LifeBuoy className="h-3.5 w-3.5 text-neutral-600" aria-hidden />
                Esqueceu o PIN?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRecoverWhatsapp(whatsapp || emptyWhatsapp())
                    setRecoverMsg('')
                    setShowRecover(true)
                  }}
                  className="text-white font-medium underline underline-offset-2 hover:no-underline"
                >
                  Recuperar
                </button>
              </p>
              <p>
                <a
                  href={ROVE_PUBLIC_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden />
                  Site da plural
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {showRecover && (
        <RoveModalOverlay dimClassName="bg-black/70 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-sm rounded-md bg-[#0a0a0a] p-6 shadow-[8px_0_32px_-8px_rgba(255,255,255,0.08)]"
          >
            <h3 className="text-lg font-bold tracking-tight text-white">Recuperar PIN</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Enviaremos um PIN temporário por WhatsApp.
            </p>
            <form onSubmit={handleRecoverPin} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="recover-wa" className="block text-sm font-semibold text-white">
                  WhatsApp
                </label>
                <WhatsappAoInput
                  id="recover-wa"
                  value={recoverWhatsapp}
                  onChange={setRecoverWhatsapp}
                  required
                />
              </div>
              {recoverMsg && (
                <p className="text-sm text-neutral-300 rounded-md bg-[#111] px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                  {recoverMsg}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRecover(false)}
                  className={`flex-1 rounded-md bg-[#111] py-2.5 text-sm font-medium text-white transition-shadow ${fieldShadow}`}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={recoverLoading}
                  className={`flex-1 rounded-md bg-white py-2.5 text-sm font-medium text-black transition-all hover:bg-neutral-200 disabled:opacity-50 ${btnShadow}`}
                >
                  {recoverLoading ? 'A enviar…' : 'Enviar PIN'}
                </button>
              </div>
            </form>
          </motion.div>
        </RoveModalOverlay>
      )}
    </motion.div>
  )
}
