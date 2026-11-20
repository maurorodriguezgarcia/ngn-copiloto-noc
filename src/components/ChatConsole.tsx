import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
  Send,
  ShieldAlert,
  Terminal,
  Trash2,
} from 'lucide-react';
import { ChatMessage } from '../types/noc';
import {
  isDraftResponse,
  isEscalatedResponse,
  SCENARIOS,
} from '../utils/nocParser';

interface ChatConsoleProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  errorMessage: string | null;
  draftInput: string;
  onDraftInputChange: (value: string) => void;
  onSendMessage: (text: string) => void;
  onRetryLast: () => void;
  onClearChat: () => void;
}

function CliCodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.replace(/\n$/, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-cyan-400/20 bg-[#050811]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#080D1B] px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1.5 font-mono text-slate-400">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
          <span>{language || 'cli'}</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Código copiado al portapapeles' : 'Copiar bloque de código CLI'}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
              <span className="text-[#22C55E]">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className="noc-scroll overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="border-0 bg-transparent">
                <td
                  aria-hidden="true"
                  className="w-8 select-none border-0 pr-3 text-right align-top tabular-nums text-slate-600"
                >
                  {idx + 1}
                </td>
                <td className="border-0 p-0 align-top whitespace-pre text-slate-100">
                  {line.startsWith('! BORRADOR') ? (
                    <span className="font-semibold text-amber-300">{line}</span>
                  ) : (
                    line || ' '
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChatConsole({
  messages,
  isStreaming,
  errorMessage,
  draftInput,
  onDraftInputChange,
  onSendMessage,
  onRetryLast,
  onClearChat,
}: ChatConsoleProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draftInput.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = draftInput.trim();
      if (!trimmed || isStreaming) return;
      onSendMessage(trimmed);
    }
  };

  return (
    <section
      aria-label="Consola de chat con NGN-Copiloto"
      className="noc-glass flex min-h-[580px] flex-col rounded-xl lg:h-[calc(100vh-148px)] lg:min-h-[620px]"
    >
      {/* Scenario Bar */}
      <div className="border-b border-cyan-400/15 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Escenarios rápidos de validación
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearChat}
              disabled={isStreaming}
              aria-label="Limpiar historial de conversación"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Nueva sesión</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              disabled={isStreaming}
              onClick={() => onSendMessage(scenario.prompt)}
              aria-label={`Enviar escenario: ${scenario.label}`}
              className="rounded-md border border-cyan-400/25 bg-slate-900/75 px-2.5 py-1.5 text-xs font-medium text-cyan-200 transition-all hover:border-cyan-400/60 hover:bg-cyan-950/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Chat History */}
      <div
        ref={scrollContainerRef}
        className="noc-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="max-w-md space-y-3 rounded-xl border border-cyan-400/15 bg-slate-900/45 p-6">
              <h2 className="text-base font-semibold text-slate-100">
                Consola de ingeniería WAN · NGN CUN
              </h2>
              <p className="text-sm leading-relaxed text-slate-400">
                Describe el servicio de borde que necesitas diseñar o validar (GRE/IPsec,
                MPLS L3VPN, HSRP, PPPoE o QoS DiffServ), o selecciona uno de los escenarios
                superiores para iniciar el análisis.
              </p>
              <div className="flex items-center justify-center gap-3 pt-1 text-xs font-mono text-slate-400">
                <span>MTU/MSS paso a paso</span>
                <span aria-hidden="true">·</span>
                <span>Borradores CLI</span>
                <span aria-hidden="true">·</span>
                <span>Control HITL</span>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[85%] rounded-xl rounded-br-sm border border-slate-500/35 bg-slate-700/60 px-4 py-3 text-sm text-slate-100 shadow-sm">
                    <div className="mb-1 flex items-center justify-end gap-2 text-[11px] font-mono text-slate-300/80">
                      <span>Operador NOC</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{msg.timestamp}</span>
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              );
            }

            const escalated = isEscalatedResponse(msg.text);
            const hasDraft = isDraftResponse(msg.text);

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="flex justify-start"
              >
                <article
                  className={`w-full max-w-[95%] rounded-xl rounded-bl-sm px-4 py-3.5 ${
                    escalated
                      ? 'border-2 border-[#EF4444] bg-red-950/35 shadow-[0_0_24px_rgba(239,68,68,0.16)]'
                      : 'border border-cyan-400/30 bg-[#0B1328]/85 backdrop-blur-md'
                  }`}
                >
                  {/* Escalation Banner */}
                  {escalated && (
                    <div className="mb-3 flex items-center gap-2.5 border-b border-red-500/30 pb-2.5">
                      <ShieldAlert
                        className="h-5 w-5 shrink-0 text-[#EF4444]"
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-bold text-red-200">
                        Solicitud detenida y escalada
                      </h3>
                    </div>
                  )}

                  {/* Draft Warning Ribbon */}
                  {!escalated && hasDraft && (
                    <div
                      role="note"
                      className="mb-3 flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-200"
                    >
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 text-[#F59E0B]"
                        aria-hidden="true"
                      />
                      <span>
                        ⚠ Borrador · requiere aprobación del administrador de red
                      </span>
                    </div>
                  )}

                  {/* Agent metadata */}
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                    <span className={escalated ? 'text-red-300 font-semibold' : 'text-cyan-300 font-semibold'}>
                      NGN-Copiloto
                    </span>
                    <span className="tabular-nums">{msg.timestamp}</span>
                  </div>

                  {/* Markdown + LaTeX + Custom CLI Code Blocks */}
                  <div className="noc-markdown">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        pre({ children }) {
                          return <>{children}</>;
                        },
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const rawText = String(children).replace(/\n$/, '');
                          const isBlock = Boolean(match) || rawText.includes('\n');

                          if (isBlock) {
                            return (
                              <CliCodeBlock
                                code={rawText}
                                language={match ? match[1] : 'cli'}
                              />
                            );
                          }

                          return (
                            <code
                              className="rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[12.5px] text-cyan-200 border border-cyan-400/15"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </article>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Streaming indicator */}
        {isStreaming && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2.5 px-2 py-1 text-xs font-mono text-cyan-300"
          >
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
            </span>
            <span>NGN-Copiloto está analizando la red…</span>
          </div>
        )}

        {/* API Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/45 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-200"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={onRetryLast}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-400/40 bg-red-900/50 px-2.5 py-1 font-medium text-red-100 hover:bg-red-800/60 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          </div>
        )}
      </div>

      {/* Fixed Bottom Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-cyan-400/15 bg-[#080E1E]/90 p-3 rounded-b-xl"
      >
        <div className="flex items-end gap-2.5">
          <div className="flex-1">
            <label htmlFor="noc-chat-input" className="sr-only">
              Escribe tu consulta de diseño o validación WAN
            </label>
            <textarea
              id="noc-chat-input"
              ref={textareaRef}
              rows={2}
              value={draftInput}
              onChange={(e) => onDraftInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Consulta sobre túneles GRE/IPsec, MTU/MSS, MPLS L3VPN, HSRP o QoS…"
              className="noc-scroll w-full resize-none rounded-lg border border-cyan-400/20 bg-[#050914] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isStreaming || !draftInput.trim()}
            aria-label="Enviar mensaje al agente"
            className="inline-flex h-[42px] items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 whitespace-nowrap shrink-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span>Enviar</span>
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Enter para enviar · Shift+Enter para nueva línea</span>
          <span className="font-mono">temp 0.2</span>
        </div>
      </form>
    </section>
  );
}
