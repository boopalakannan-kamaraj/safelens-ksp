import { useEffect, useRef, useState } from 'react'
import { askSafeLensQuestion } from '../services/aiChat'
import type { ChatMessage } from '../types/crime'
import { btnIcon, btnPrimary, btnSecondary, formInput } from './ui/formClasses'

const SUGGESTIONS = [
  'Show me theft cases in Mysuru',
  'What are the high-risk districts?',
  'Cybercrime trends this year',
]

const ERROR_MESSAGE =
  "Sorry, I'm having trouble answering right now — please try again."

function createWelcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      "Hello! I'm SafeLens AI. Ask me about crime data across Karnataka — incidents, districts, trends, and risk scores.",
    timestamp: new Date(),
  }
}

function renderAssistantContent(content: string) {
  return content.split('\n').map((line, lineIndex, lines) => (
    <span key={lineIndex}>
      {line}
      {lineIndex < lines.length - 1 && <br />}
    </span>
  ))
}

export default function AskSafeLens() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()])
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

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      },
    ])
    setInput('')
    setLoading(true)

    try {
      const { answer } = await askSafeLensQuestion(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          timestamp: new Date(),
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: ERROR_MESSAGE,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const resetChat = () => {
    if (loading) return
    setMessages([createWelcomeMessage()])
    setInput('')
    inputRef.current?.focus()
  }

  const showSuggestions = messages.length <= 1 && !loading

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-6 z-[1100] ${btnPrimary} rounded-full px-5 py-3 text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-accent/40`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.847-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Ask SafeLens
        </button>
      )}

      {open && (
        <div
          className={`fixed bottom-6 right-6 z-[1100] flex flex-col overflow-hidden rounded-2xl border border-border bg-navy-950 shadow-2xl shadow-black/40 transition-[width,height] duration-200 ease-out ${
            expanded
              ? 'h-[min(780px,calc(100vh-3rem))] w-[min(600px,calc(100vw-3rem))]'
              : 'h-[min(520px,calc(100vh-3rem))] w-[min(400px,calc(100vw-3rem))]'
          }`}
        >
          <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetChat}
                disabled={loading}
                className={btnIcon}
                aria-label="New chat"
                title="New chat"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className={btnIcon}
                aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={btnIcon}
                aria-label="Close panel"
                title="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted ring-1 ring-border'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? renderAssistantContent(msg.content)
                    : msg.content}
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

          {showSuggestions && (
            <div className="border-t border-border px-4 py-2">
              <p className="mb-2 text-xs text-text-muted">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className={`${btnSecondary} rounded-full px-2.5 py-1 text-xs`}
                  >
                    {suggestion}
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
