import { useEffect, useRef, useState } from 'react'
import { Mic, Send, Square, TriangleAlert, Volume2, VolumeX, Sparkles } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import { useAuth } from '../components/auth/auth'
import { AI_MODEL, aiConfigured, aiMode, askAI, type ChatMessage } from '../lib/ai'
import { systemPrompt } from '../lib/aiContext'
import { useProspects } from '../lib/prospectStore'
import { useContracts } from '../lib/contractStore'

/** Openers that show what the assistant is for without a manual. */
const SUGGESTIONS = [
  'Who still has an unsigned contract?',
  'How is Priya Nair doing?',
  'Which offices can’t send contracts yet?',
  'What happens after a prospect books a seat?',
  'Who needs a personal call from an owner?',
]

interface Turn {
  role: 'user' | 'assistant'
  text: string
}

export default function Assistant() {
  const { session } = useAuth()
  // Re-render on store changes so a question always sees current data.
  useProspects()
  useContracts()

  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [speak, setSpeak] = useState(false)
  const [listening, setListening] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const recogRef = useRef<any>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, busy])

  /* ── Voice in: Web Speech API, no dependency ── */
  const SpeechRec =
    typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  const toggleMic = () => {
    if (!SpeechRec) return
    if (listening) {
      recogRef.current?.stop()
      return
    }
    const r = new SpeechRec()
    r.lang = 'en-US'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e: any) => {
      const said = Array.from(e.results)
        .map((x: any) => x[0].transcript)
        .join('')
      setInput(said)
      // A final result means they stopped talking — send it.
      if (e.results[e.results.length - 1].isFinal) {
        r.stop()
        void ask(said)
      }
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recogRef.current = r
    setListening(true)
    r.start()
  }

  /* ── Voice out ── */
  const say = (text: string) => {
    if (!speak || typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    speechSynthesis.speak(u)
  }

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || busy) return
    setError('')
    setInput('')
    setTurns((t) => [...t, { role: 'user', text: q }, { role: 'assistant', text: '' }])
    setBusy(true)

    // The context is rebuilt per question so the answer reflects the store as
    // it is right now, not as it was when the page loaded.
    const history: ChatMessage[] = [
      { role: 'system', content: systemPrompt({
        // Fail closed: anything other than an explicit admin is scoped to one
        // office, and a missing session gets no office at all.
        role: session?.role === 'admin' ? 'admin' : 'owner',
        officeId: session?.officeId,
        officeName: session?.officeName,
        userName: session?.name,
      }) },
      ...turns.map((t) => ({ role: t.role, content: t.text }) as ChatMessage),
      { role: 'user', content: q },
    ]

    const ac = new AbortController()
    abortRef.current = ac
    const res = await askAI(
      history,
      (chunk) =>
        setTurns((t) => {
          const next = [...t]
          next[next.length - 1] = {
            role: 'assistant',
            text: next[next.length - 1].text + chunk,
          }
          return next
        }),
      ac.signal,
    )
    setBusy(false)
    abortRef.current = null

    if (res.ok) say(res.text)
    else {
      setError(
        res.error === 'not-configured'
          ? 'No Groq key is set, so the assistant can’t answer yet.'
          : res.error === 'cancelled'
            ? ''
            : `Groq couldn’t answer: ${res.error}`,
      )
      // Drop the empty assistant bubble so a failure doesn't look like silence.
      setTurns((t) => (t[t.length - 1]?.text === '' ? t.slice(0, -1) : t))
    }
  }

  return (
    <>
      <PageHead eyebrow="Assistant" title="Ask anything">
        Ask about any prospect, office or contract, or how the platform works. The assistant reads this
        console live — {session?.role === 'owner' ? 'scoped to your office' : 'across every office'}.
      </PageHead>

      {!aiConfigured && (
        <div className="mb-4 rounded-[12px] border border-[rgba(224,177,90,.35)] bg-[rgba(224,177,90,.06)] p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-warn">
            <TriangleAlert size={15} /> Groq isn’t connected yet
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            Add <span className="font-mono text-champagne">VITE_GROQ_API_KEY</span> to{' '}
            <span className="font-mono">.env.local</span> and restart the dev server. Better still, set{' '}
            <span className="font-mono text-champagne">VITE_AI_PROXY_URL</span> to a server route that
            holds the key — a key in the browser is readable by anyone who opens devtools.
          </p>
        </div>
      )}

      <div className="bevel flex h-[min(640px,70vh)] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {turns.length === 0 && (
            <div className="grid h-full place-items-center px-4 text-center">
              <div>
                <Sparkles size={26} className="mx-auto text-gold" />
                <p className="mt-3 text-[13px] text-muted">Ask a question, or start with one of these.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => void ask(s)}
                      disabled={!aiConfigured}
                      className="rounded-full border border-[rgba(212,175,55,.16)] px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-[rgba(212,175,55,.4)] hover:text-ivory disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-[13px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  t.role === 'user'
                    ? 'border border-[rgba(212,175,55,.28)] bg-[rgba(212,175,55,.08)] text-ivory'
                    : 'panel text-ivory'
                }`}
              >
                {t.text || <span className="text-muted">Thinking…</span>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && (
          <p role="alert" className="border-t border-[rgba(212,175,55,.1)] px-5 py-2.5 text-[12px] text-warn">
            {error}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask(input)
          }}
          className="flex items-center gap-2 border-t border-[rgba(212,175,55,.16)] p-3"
        >
          <button
            type="button"
            onClick={toggleMic}
            disabled={!SpeechRec || !aiConfigured}
            title={SpeechRec ? 'Ask by voice' : 'Voice input needs Chrome or Edge'}
            aria-label="Ask by voice"
            className={`grid h-10 w-10 flex-none place-items-center rounded-[10px] border transition-colors disabled:opacity-40 ${
              listening
                ? 'border-bad bg-[rgba(208,138,122,.14)] text-bad'
                : 'border-[rgba(212,175,55,.2)] text-gold hover:border-[rgba(212,175,55,.45)]'
            }`}
          >
            <Mic size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (speak) speechSynthesis?.cancel()
              setSpeak((v) => !v)
            }}
            title={speak ? 'Answers are spoken aloud' : 'Answers are silent'}
            aria-label="Toggle spoken answers"
            className={`grid h-10 w-10 flex-none place-items-center rounded-[10px] border transition-colors ${
              speak
                ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.1)] text-champagne'
                : 'border-[rgba(212,175,55,.2)] text-muted hover:text-ivory'
            }`}
          >
            {speak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!aiConfigured}
            placeholder={listening ? 'Listening…' : 'Ask about a prospect, an office, or how something works…'}
            className="min-w-0 flex-1 rounded-[10px] border border-[rgba(212,175,55,.16)] bg-graphite px-3.5 py-2.5 text-[13px] text-ivory outline-none transition-colors focus:border-[rgba(212,175,55,.5)] placeholder:text-muted disabled:opacity-40"
          />

          {busy ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="flex flex-none items-center gap-1.5 rounded-[10px] border border-[rgba(208,138,122,.4)] px-3.5 py-2.5 text-[12px] text-bad"
            >
              <Square size={13} /> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !aiConfigured}
              className="btn-gold flex flex-none items-center gap-1.5 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={13} /> Ask
            </button>
          )}
        </form>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        {aiConfigured
          ? `Model ${AI_MODEL} · ${aiMode === 'proxy' ? 'via server proxy' : 'called directly from this browser'}`
          : 'Not connected'}
        . Answers come only from what this console holds — it will say so rather than guess.
      </p>
    </>
  )
}
