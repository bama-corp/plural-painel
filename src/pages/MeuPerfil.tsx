import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, Lock, Save, Shield, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useAlert } from '../contexts/AlertContext'
import { api } from '../api/client'
import { tratamentoNome } from '../utils/tratamento'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  geral: 'Operador (geral)',
  netflix: 'Operador Netflix',
  iptv: 'Operador IPTV',
  suporte: 'Suporte',
  financeiro: 'Financeiro',
}

const ROLE_PILL: Record<string, string> = {
  admin: 'bg-amber-500/20 text-amber-100 border-amber-400/35',
  geral: 'bg-sky-500/15 text-sky-200 border-sky-400/35',
  netflix: 'bg-red-500/20 text-red-200 border-red-400/35',
  iptv: 'bg-violet-500/20 text-violet-200 border-violet-400/35',
  suporte: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35',
  financeiro: 'bg-lime-500/15 text-lime-200 border-lime-400/35',
}

type MeResponse = {
  id: number
  nome: string
  email: string
  role: string
  whatsapp?: string | null
}

function initialsFromNome(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] || ''
    const b = parts[parts.length - 1][0] || ''
    return (a + b).toUpperCase()
  }
  return nome.trim().slice(0, 2).toUpperCase() || '?'
}

const inputClass =
  'w-full pl-11 pr-4 py-3 bg-netflix-panel border border-primary-600/40 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500 transition-shadow'

const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5'

const sectionMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export default function MeuPerfil() {
  const { user, loading: authLoading, refetch } = useAuth()
  const { showError, showInfo } = useAlert()
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!user) return
    setNome(user.nome)
    setEmail(user.email)
    setWhatsapp(user.whatsapp ?? '')
  }, [user])

  const role = user?.role ?? ''
  const roleLabel = role ? ROLE_LABELS[role] || role : ''
  const rolePillClass = ROLE_PILL[role] ?? 'bg-white/10 text-gray-200 border-white/20'
  const avatarLetters = useMemo(() => initialsFromNome(nome || user?.nome || ''), [nome, user?.nome])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || nome.trim().length < 2) {
      showError('Nome deve ter pelo menos 2 caracteres.')
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError('Indique um email válido.')
      return
    }
    if (whatsapp.trim()) {
      const digits = whatsapp.replace(/\D/g, '')
      if (digits.length < 8) {
        showError('WhatsApp inválido (mínimo 8 dígitos).')
        return
      }
    }
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        showError('Indique a senha atual para alterar a senha.')
        return
      }
      if (newPassword !== confirmPassword) {
        showError('A nova senha e a confirmação não coincidem.')
        return
      }
      if (newPassword.length > 0 && newPassword.length < 6) {
        showError('A nova senha deve ter pelo menos 6 caracteres.')
        return
      }
    }

    const body: Record<string, string | null> = {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim() || null,
    }
    if (newPassword) {
      body.currentPassword = currentPassword
      body.newPassword = newPassword
    }

    setSaving(true)
    try {
      await api.patch<MeResponse>('/api/auth/me', body)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      await refetch()
      showInfo('Perfil atualizado com sucesso.')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao guardar')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-11 w-11 border-2 border-primary-600 border-t-transparent" />
          <span className="text-sm">A carregar o seu perfil…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-md bg-primary-600/20 border border-primary-500/30 text-primary-400 shrink-0">
            <Sparkles className="w-6 h-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Meu perfil</h1>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Atualize os seus dados de contacto. A palavra-passe só é alterada se preencher os três campos de
              segurança.
            </p>
            <div className="mt-3 h-0.5 w-14 rounded-full bg-primary-600" aria-hidden />
          </div>
        </div>
      </motion.header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Cartão identidade */}
          <motion.aside
            {...sectionMotion}
            transition={{ duration: 0.25 }}
            className="lg:col-span-4"
          >
            <div className="relative overflow-hidden rounded-md border border-netflix-border bg-gradient-to-b from-netflix-panel to-netflix-card p-6 shadow-xl shadow-black/20">
              <div
                className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 0%, #e50914 0%, transparent 45%),
                    radial-gradient(circle at 100% 100%, #b20710 0%, transparent 40%)`,
                }}
                aria-hidden
              />
              <div className="relative flex flex-col items-center text-center">
                <div
                  className="w-24 h-24 rounded-md bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-primary-900/40 ring-4 ring-black/30"
                  aria-hidden
                >
                  {avatarLetters}
                </div>
                <p className="mt-4 text-lg font-semibold text-white leading-snug px-1">
                  {tratamentoNome(nome)}
                </p>
                <p className="text-sm text-gray-400 mt-1 break-all px-1">{email}</p>
                {roleLabel && (
                  <span
                    className={`mt-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${rolePillClass}`}
                  >
                    {roleLabel}
                  </span>
                )}
              </div>
            </div>
          </motion.aside>

          {/* Formulários */}
          <div className="lg:col-span-8 space-y-6">
            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="rounded-md border border-netflix-border bg-netflix-card/90 backdrop-blur-sm p-6 sm:p-7"
            >
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-primary-400 shrink-0" />
                <h2 className="text-lg font-semibold text-white">Dados pessoais</h2>
              </div>
              <div className="space-y-5">
                <div>
                  <label htmlFor="perfil-nome" className={labelClass}>
                    Nome completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                    <input
                      id="perfil-nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className={inputClass}
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="perfil-email" className={labelClass}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                    <input
                      id="perfil-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      autoComplete="email"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="perfil-whatsapp" className={labelClass}>
                    WhatsApp <span className="text-gray-500 font-normal">(opcional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                    <input
                      id="perfil-whatsapp"
                      type="text"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+244 9XX XXX XXX"
                      className={inputClass}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="rounded-md border border-netflix-border bg-netflix-card/90 backdrop-blur-sm p-6 sm:p-7"
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="p-2 rounded-md bg-white/5 border border-white/10 text-gray-300 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary-400" />
                    Palavra-passe
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Deixe em branco para manter a senha atual. Para alterar, preencha os três campos.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="perfil-senha-atual" className={labelClass}>
                    Senha atual
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                    <input
                      id="perfil-senha-atual"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Só necessária se mudar a senha"
                      className={inputClass}
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="perfil-senha-nova" className={labelClass}>
                      Nova senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                      <input
                        id="perfil-senha-nova"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        className={inputClass}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="perfil-senha-conf" className={labelClass}>
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-500/80 pointer-events-none" />
                      <input
                        id="perfil-senha-conf"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a nova senha"
                        className={inputClass}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-1"
            >
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-md bg-white hover:bg-neutral-200 text-black text-sm font-semibold shadow-lg shadow-primary-900/25 disabled:opacity-50 transition-colors w-full sm:w-auto"
              >
                <Save className="w-5 h-5" />
                {saving ? 'A guardar…' : 'Guardar alterações'}
              </button>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  )
}
