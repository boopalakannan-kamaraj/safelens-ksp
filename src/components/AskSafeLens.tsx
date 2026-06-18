import { useEffect, useRef, useState } from 'react'
import { processSafeLensQuery } from '../services/aiChat'
import type { ChatMessage } from '../types/crime'
import { btnIcon, btnPrimary, btnSecondary, formInput } from './ui/formClasses'

const SUGGESTIONS = [
  'Show me theft cases in Mysuru last month',
  'What are the high-risk districts?',
  'Cybercrime trends this year',
]

export default function AskSafeLens() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m SafeLens AI. Ask me about crime data across Karnataka — incidents, districts, trends, and risk scores.',
      timestamp: new Date(),
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await processSafeLensQuery(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>
            }
            if (part.startsWith('_') && part.endsWith('_')) {
              return <em key={j} className="text-text-muted">{part.slice(1, -1)}</em>
            }
            if (part.startsWith('• ')) {
              return <span key={j}>{part}</span>
            }
            return <span key={j}>{part}</span>
          })}
          {i < content.split('\n').length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className={`fixed bottom-6 right-6 z-50 ${btnPrimary} rounded-full px-5 py-3 text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.847-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Ask SafeLens
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-navy-950 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L20 6.5V12.5C20 17.5 16.5 21 12 22.5C7.5 21 4 17.5 4 12.5V6.5L12 2Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Ask SafeLens</p>
                <p className="text-xs text-text-muted">AI Crime Intelligence</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className={btnIcon}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted ring-1 ring-border'
                  }`}
                >
                  {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs text-text-muted">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="border-t border-border px-4 py-2">
              <p className="mb-2 text-xs text-text-muted">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className={`${btnSecondary} rounded-full px-2.5 py-1 text-xs`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="border-t border-border bg-surface p-3"
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about crime data..."
                disabled={loading}
                className={`flex-1 ${formInput}`}
              />
              <button type="submit" disabled={loading || !input.trim()} className={btnPrimary}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
