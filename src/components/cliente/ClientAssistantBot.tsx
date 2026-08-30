import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, ExternalLink, MessageCircle, Copy, KeyRound, LayoutGrid } from 'lucide-react'
import { clientPortalApi } from '../../api/clientPortal'
import type { ClientThemeMode } from '../../lib/clientTheme'

export type ClientTab = 'inicio' | 'servico' | 'renovar' | 'indicar' | 'conta'

export type AssistantAction =
  | { type: 'tab'; label: string; tab: ClientTab }
  | { type: 'link'; label: string; url: string }
  | { type: 'whatsapp'; label: string; phone: string; message: string }
  | { type: 'copy'; label: string; text: string }
  | { type: 'openPinModal'; label: string }

export interface AssistantReply {
  reply: string
  suggestions: string[]
  actions?: AssistantAction[]
  autoActions?: AssistantAction[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  suggestions?: string[]
  actions?: AssistantAction[]
}

function formatReply(text: string) {
  const lines = text.split('\n')
  return lines.map((line, lineIdx) => {
    const stepMatch = /^(?:\d+)[.)]\s+(.+)$/.exec(line.trim())
    const bulletMatch = /^[•\-]\s+(.+)$/.exec(line.trim())

    let content: ReactNode
    if (stepMatch) {
      const num = line.trim().match(/^(\d+)/)?.[1] ?? String(lineIdx + 1)
      content = (
        <span className="mt-2 flex items-start gap-2.5 first:mt-0">
          <span className="ca-step-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold">
            {num}
          </span>
          <span className="min-w-0 flex-1 leading-snug">{formatInline(stepMatch[1])}</span>
        </span>
      )
    } else if (bulletMatch) {
      content = (
        <span className="mt-0.5 flex items-start gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
          <span className="min-w-0 flex-1">{formatInline(bulletMatch[1])}</span>
        </span>
      )
    } else if (line.trim() === '') {
      content = <span className="block h-1.5" />
    } else {
      content = <span className="block">{formatInline(line)}</span>
    }

    return <span key={`line-${lineIdx}`}>{content}</span>
  })
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold ca-fg">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function waUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

interface ClientAssistantBotProps {
  theme?: ClientThemeMode
  onOpenTab?: (tab: ClientTab) => void
  onOpenPinModal?: () => void
  onCopy?: (text: string) => void | Promise<void>
  onOpenChange?: (open: boolean) => void
}

export function ClientAssistantBot({
  theme = 'dark',
  onOpenTab,
  onOpenPinModal,
  onCopy,
  onOpenChange,
}: ClientAssistantBotProps) {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const welcomeLockRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    })
  }, [])

  const runAction = useCallback(
    async (action: AssistantAction) => {
      if (action.type === 'tab') {
        onOpenTab?.(action.tab)
        return
      }
      if (action.type === 'link') {
        window.open(action.url, '_blank', 'noopener,noreferrer')
        return
      }
      if (action.type === 'whatsapp') {
        window.open(waUrl(action.phone, action.message), '_blank', 'noopener,noreferrer')
        return
      }
      if (action.type === 'copy') {
        if (onCopy) {
          await onCopy(action.text)
        } else {
          await navigator.clipboard.writeText(action.text)
        }
        return
      }
      if (action.type === 'openPinModal') {
        onOpenPinModal?.()
      }
    },
    [onOpenTab, onOpenPinModal, onCopy]
  )

  const pushAssistant = useCallback(
    (reply: AssistantReply) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          text: reply.reply,
          suggestions: reply.suggestions,
          actions: reply.actions,
        },
      ])
      scrollToBottom()
      if (reply.autoActions?.length) {
        void (async () => {
          for (const action of reply.autoActions!) {
            await runAction(action)
          }
        })()
      }
    },
    [scrollToBottom, runAction]
  )

  const loadWelcome = useCallback(async () => {
    setLoading(true)
    try {
      const reply = await clientPortalApi.get<AssistantReply>('/api/client-portal/assistente/saudacao')
      setMessages([
        {
          id: `a-welcome-${Date.now()}`,
          role: 'assistant',
          text: reply.reply,
          suggestions: reply.suggestions,
          actions: reply.actions,
        },
      ])
      scrollToBottom()
    } catch {
      setMessages([
        {
          id: `a-welcome-${Date.now()}`,
          role: 'assistant',
          text: 'Olá! Sou o POne. Posso ajudar com renovação, credenciais e indicações.',
          suggestions: ['Quando renovo?', 'Ver credenciais', 'Falar com suporte'],
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [scrollToBottom])

  useEffect(() => {
    onOpenChange?.(open)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open || welcomeLockRef.current) return
    welcomeLockRef.current = true
    void loadWelcome()
  }, [open, loadWelcome])

  useEffect(() => {
    if (open) {
      scrollToBottom()
      window.setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, scrollToBottom])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ])
    setInput('')
    setLoading(true)
    scrollToBottom()

    try {
      const reply = await clientPortalApi.post<AssistantReply>('/api/client-portal/assistente', {
        message: trimmed,
      })
      pushAssistant(reply)
    } catch (e) {
      pushAssistant({
        reply: e instanceof Error ? e.message : 'Não foi possível obter resposta. Tente de novo.',
        suggestions: ['Menu', 'Falar com suporte'],
      })
    } finally {
      setLoading(false)
    }
  }

  function handleAction(action: AssistantAction) {
    void runAction(action)
  }

  const light = theme === 'light'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed z-40 flex flex-col overflow-hidden rounded-2xl backdrop-blur-xl plural-edge shadow-[0_16px_48px_rgba(0,0,0,0.14)] max-sm:inset-x-2 max-sm:top-[3.75rem] max-sm:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-sm:w-auto max-sm:right-2 sm:top-[5.5rem] sm:bottom-5 sm:right-3 sm:w-[min(calc(100vw-5.5rem),22rem)] lg:top-4 lg:bottom-4 lg:right-5 lg:w-[22rem] ${
              light ? 'bg-white/95' : 'bg-[#0a0a0a]/95'
            }`}
            data-client-theme={theme}
            role="dialog"
            aria-label="POne"
          >
            <header
              className={`flex items-center gap-3 px-4 py-3.5 shrink-0 ${
                light
                  ? 'shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)] bg-[#fafafa]/80'
                  : 'shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.06)] bg-black/40'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-md ${
                  light ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                <Bot className="w-5 h-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${light ? 'text-neutral-900' : 'text-white'}`}>
                  POne
                </p>
                <p className="text-[11px] text-neutral-500">Renovação, credenciais e suporte</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`p-2 rounded-md transition-colors ${
                  light
                    ? 'text-neutral-500 hover:text-white hover:bg-black'
                    : 'text-neutral-400 hover:text-black hover:bg-white'
                }`}
                aria-label="Fechar POne"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[95%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? light
                          ? 'bg-black text-white'
                          : 'bg-white text-black'
                        : light
                          ? 'bg-[#f4f4f4] text-neutral-800 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
                          : 'bg-[#111] text-neutral-200 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {m.role === 'assistant' ? formatReply(m.text) : m.text}
                    {m.role === 'assistant' && m.actions && m.actions.length > 0 && (
                      <div
                        className={`flex flex-wrap gap-2 mt-3.5 pt-3 ${
                          light
                            ? 'shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06)]'
                            : 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                        }`}
                      >
                        {m.actions.map((action, idx) => (
                          <button
                            key={`${m.id}-action-${idx}`}
                            type="button"
                            onClick={() => handleAction(action)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                              action.type === 'whatsapp'
                                ? 'bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/35'
                                : light
                                  ? 'bg-black/[0.06] text-neutral-800 hover:bg-black hover:text-white'
                                  : 'bg-white/[0.08] text-neutral-200 hover:bg-white hover:text-black'
                            }`}
                          >
                            {action.type === 'whatsapp' ? (
                              <MessageCircle className="w-3 h-3" />
                            ) : action.type === 'copy' ? (
                              <Copy className="w-3 h-3" />
                            ) : action.type === 'openPinModal' ? (
                              <KeyRound className="w-3 h-3" />
                            ) : action.type === 'tab' ? (
                              <LayoutGrid className="w-3 h-3" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )}
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {m.suggestions.map((s) => (
                          <button
                            key={`${m.id}-s-${s}`}
                            type="button"
                            disabled={loading}
                            onClick={() => void sendMessage(s)}
                            className={`px-2.5 py-1 rounded-md text-[11px] disabled:opacity-50 transition-colors ${
                              light
                                ? 'bg-black/[0.05] text-neutral-700 hover:bg-black hover:text-white'
                                : 'bg-white/[0.06] text-neutral-300 hover:bg-white hover:text-black'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-neutral-500 text-xs ${
                      light
                        ? 'bg-[#f4f4f4] shadow-[0_0_0_1px_rgba(0,0,0,0.06)]'
                        : 'bg-[#111] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    A escrever…
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className={`shrink-0 flex items-center gap-2.5 p-3.5 ${
                light
                  ? 'shadow-[inset_0_1px_0_0_rgba(0,0,0,0.06)] bg-[#fafafa]/80'
                  : 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] bg-black/50'
              }`}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva a sua pergunta…"
                maxLength={500}
                disabled={loading}
                className={`flex-1 min-w-0 px-3.5 py-2.5 rounded-md text-sm outline-none disabled:opacity-60 ${
                  light
                    ? 'bg-white text-neutral-900 placeholder:text-neutral-400 shadow-[0_0_0_1px_rgba(0,0,0,0.1)] focus:shadow-[0_0_0_1.5px_rgba(0,0,0,0.28)]'
                    : 'bg-[#111] text-white placeholder:text-neutral-600 shadow-[0_0_0_1px_rgba(255,255,255,0.1)] focus:shadow-[0_0_0_1.5px_rgba(255,255,255,0.28)]'
                }`}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-40 transition-colors shrink-0 ${
                  light ? 'bg-black text-white hover:bg-neutral-800' : 'bg-white text-black hover:bg-neutral-200'
                }`}
                aria-label="Enviar mensagem"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-3 z-50 sm:bottom-5 sm:right-6">
          <motion.button
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium shadow-lg ${
              light
                ? 'bg-black text-white hover:bg-neutral-800 shadow-black/20'
                : 'bg-white text-black hover:bg-neutral-200 shadow-black/40'
            }`}
            aria-expanded={false}
            aria-label="Abrir POne"
          >
            <Bot className="w-4 h-4" />
            POne
          </motion.button>
        </div>
      )}
    </>
  )
}
