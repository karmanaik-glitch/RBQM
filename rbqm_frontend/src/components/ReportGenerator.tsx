import { useState, useRef } from 'react'
import { Copy, Download, Check } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const BASE = `${BASE_URL}/api`

// ── Minimal markdown renderer ─────────────────────────────────────────────────
// Handles: ## headings, **bold**, numbered lists, plain paragraphs

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-base font-semibold text-slate-100 mt-7 mb-2 pb-2 border-b border-slate-700">
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '')
      const num = line.match(/^(\d+)/)?.[1]
      nodes.push(
        <div key={key++} className="flex gap-3 my-1.5 pl-1">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-slate-400 text-xs flex items-center justify-center font-mono mt-0.5">
            {num}
          </span>
          <p className="text-sm text-slate-300 leading-relaxed flex-1"
            dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>') }}
          />
        </div>
      )
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.replace(/^[-*]\s/, '')
      nodes.push(
        <div key={key++} className="flex gap-2 my-1 pl-1">
          <span className="text-slate-500 mt-1.5 text-xs flex-shrink-0">●</span>
          <p className="text-sm text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>') }}
          />
        </div>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={key++} className="h-1" />)
    } else {
      nodes.push(
        <p key={key++} className="text-sm text-slate-300 leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>') }}
        />
      )
    }
  }
  return nodes
}

// ── Export helpers ────────────────────────────────────────────────────────────

function exportMarkdown(text: string) {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `CDM_Review_Memo_TRIAL-2024-001.md`
  a.click()
  URL.revokeObjectURL(url)
}

function exportText(text: string) {
  const blob = new Blob([text], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `CDM_Review_Memo_TRIAL-2024-001.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReportGenerator() {
  const [apiKey, setApiKey]     = useState('')
  const [report, setReport]     = useState('')
  const [status, setStatus]     = useState<'idle' | 'loading' | 'streaming' | 'done' | 'error'>('idle')
  const [error, setError]       = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [copied, setCopied]     = useState(false)
  const abortRef                = useRef<AbortController | null>(null)

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setError('Enter your Groq API key to generate the report.')
      return
    }
    if (!apiKey.startsWith('gsk_')) {
      setError('Groq API keys start with "gsk_". Check your key.')
      return
    }

    setReport('')
    setError('')
    setWordCount(0)
    setStatus('loading')

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${BASE}/report/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ api_key: apiKey }),
        signal:  abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Stream failed')
      }

      setStatus('streaming')
      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const content = line.slice(6)
          if (content === '[DONE]') { setStatus('done'); break }
          if (content.startsWith('[ERROR]')) {
            throw new Error(content.replace('[ERROR] ', ''))
          }
          const decoded = content.replace(/\\n/g, '\n')
          full += decoded
          setReport(full)
          setWordCount(full.split(/\s+/).filter(Boolean).length)
        }
      }
    } catch (e: unknown) {
      const err = e as Error
      if (err.name === 'AbortError') {
        setStatus('done')
      } else {
        setError(err.message ?? 'Unknown error')
        setStatus('error')
      }
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleCopyToClipboard = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = report
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadPdf = () => {
    window.open(`${BASE}/report/pdf/1`, '_blank')
  }

  return (
    <div className="space-y-5">

      {/* Header card */}
      <div className="glass-card p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-widest">
              AI CDM Review Memo
            </h2>
            <p className="text-sm text-foreground-muted mt-2">
              Generates a formal Clinical Data Management narrative report from live KRI and lock readiness data.
              Powered by Llama 3.3 70B via Groq.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-foreground-subtle font-mono uppercase tracking-widest bg-white/[0.03] px-3 py-1 rounded border border-white/5">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            llama-3.3-70b-versatile
          </div>
        </div>

        {/* API Key input */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <label className="text-[10px] font-bold text-foreground-subtle uppercase tracking-widest mb-2 block flex items-center gap-2">
              Groq API Key
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-bright transition-colors"
              >
                get one free →
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-background-base/50 border border-border-default rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle/30 focus:outline-none focus:border-accent font-mono transition-all"
            />
          </div>

          <div className="flex items-end gap-3">
            {status === 'streaming' ? (
              <button
                onClick={handleStop}
                className="px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold uppercase tracking-widest transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-white shadow-accent-glow text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Preparing...' : 'Generate Report'}
              </button>
            )}

            {report && status === 'done' && (
              <>
                <button
                  onClick={() => exportMarkdown(report)}
                  className="px-4 py-3 rounded-xl border border-border-default hover:border-accent text-foreground-subtle hover:text-accent text-sm font-bold transition-all shadow-inner-highlight"
                >
                  .md
                </button>
                <button
                  onClick={() => exportText(report)}
                  className="px-4 py-3 rounded-xl border border-border-default hover:border-accent text-foreground-subtle hover:text-accent text-sm font-bold transition-all shadow-inner-highlight"
                >
                  .txt
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-3 rounded-xl border border-border-default hover:border-accent text-foreground-subtle hover:text-accent text-sm font-bold transition-all shadow-inner-highlight flex items-center gap-2"
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-3 rounded-xl border border-border-default hover:border-accent text-foreground-subtle hover:text-accent text-sm font-bold transition-all shadow-inner-highlight flex items-center gap-2"
                >
                  {copied ? <><Check size={16} className="text-accent" /> Copied!</> : <><Copy size={16} /> Copy</>}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 font-medium">
            {error}
          </p>
        )}
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="glass-card p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
          <p className="text-foreground-subtle text-xs font-bold uppercase tracking-widest">Analysing trial data and composing memo...</p>
        </div>
      )}

      {/* Streaming / done report */}
      {report && (
        <div className="glass-card overflow-hidden">
          {/* Report header bar */}
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-foreground-subtle font-mono uppercase tracking-widest border border-white/5 bg-white/[0.02] px-2 py-1 rounded">CDM DATA REVIEW MEMO — TRIAL-2024-001</span>
              {status === 'streaming' && (
                <span className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-accent-glow" />
                  Generating...
                </span>
              )}
              {status === 'done' && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                  <Check size={12} /> Complete
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-foreground-subtle bg-white/[0.02] px-2 py-1 rounded">{wordCount} words</span>
          </div>

          {/* Report body */}
          <div className="px-8 py-6 max-h-[680px] overflow-y-auto custom-scrollbar">
            {renderMarkdown(report)}
            {status === 'streaming' && (
              <span className="inline-block w-2 h-4 bg-accent shadow-accent-glow animate-pulse ml-1 align-middle" />
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {status === 'idle' && (
        <div className="border border-dashed border-white/10 bg-white/[0.01] rounded-2xl p-16 text-center">
          <p className="text-foreground-subtle text-sm leading-relaxed max-w-sm mx-auto">
            Enter your Groq API key and click Generate Report.<br />
            The AI will synthesise all KRI and lock readiness data into a formal CDM memo.
          </p>
        </div>
      )}

    </div>
  )
}
