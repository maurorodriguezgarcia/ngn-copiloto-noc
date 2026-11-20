import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { NocHeader } from './components/NocHeader';
import { TopologyMap } from './components/TopologyMap';
import { ChatConsole } from './components/ChatConsole';
import { HitlPanel } from './components/HitlPanel';
import { ChatMessage, DecisionEntry, DecisionStatus } from './types/noc';
import { streamNgnCopilot } from './services/geminiService';
import {
  countValidations,
  extractHighlightsFromText,
  extractRiskLevel,
  isDraftResponse,
  isEscalatedResponse,
  summarizeRequest,
} from './utils/nocParser';

const STORAGE_KEY = 'ngn_copiloto_decisions_v1';

function getBogotaTimestamp(): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function getTimeOnly(): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function loadStoredDecisions(): DecisionEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftInput, setDraftInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<DecisionEntry[]>(() => loadStoredDecisions());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    } catch {
      // Ignore storage quota errors gracefully
    }
  }, [decisions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const streamConversation = useCallback(async (conversationHistory: ChatMessage[]) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStreaming(true);
    setErrorMessage(null);
    setMessages(conversationHistory);

    const assistantId = `msg-model-${Date.now()}`;
    let hasInsertedAssistant = false;

    try {
      const fullText = await streamNgnCopilot(
        conversationHistory,
        (accumulatedText) => {
          if (controller.signal.aborted) return;
          if (!hasInsertedAssistant) {
            hasInsertedAssistant = true;
            const assistantMsg: ChatMessage = {
              id: assistantId,
              role: 'model',
              text: accumulatedText,
              timestamp: getTimeOnly(),
            };
            setMessages([...conversationHistory, assistantMsg]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: accumulatedText } : m
              )
            );
          }
        },
        controller.signal
      );

      if (controller.signal.aborted) return;

      if (!fullText.trim()) {
        throw new Error('Respuesta vacía del modelo');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('[NGN-Copiloto API Error]:', err);
      setMessages(conversationHistory);
      setErrorMessage('No se pudo contactar al modelo, intenta de nuevo');
    } finally {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
      }
    }
  }, []);

  const handleSendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: 'user',
        text: trimmed,
        timestamp: getTimeOnly(),
      };

      const nextHistory = [...messages, userMessage];
      setDraftInput('');
      void streamConversation(nextHistory);
    },
    [isStreaming, messages, streamConversation]
  );

  const handleRetryLast = useCallback(() => {
    if (isStreaming || messages.length === 0) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const cutoff = messages.length - lastUserIdx;
    const historyToRetry = messages.slice(0, cutoff);
    void streamConversation(historyToRetry);
  }, [isStreaming, messages, streamConversation]);

  const handleClearChat = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setMessages([]);
    setErrorMessage(null);
    setDraftInput('');
  }, []);

  const latestAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].text.trim().length > 0) {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const latestUser = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const latestModelText = latestAssistant?.text ?? '';
  const riskLevel = useMemo(() => extractRiskLevel(latestModelText), [latestModelText]);
  const hasDraft = useMemo(() => isDraftResponse(latestModelText), [latestModelText]);
  const isEscalated = useMemo(() => isEscalatedResponse(latestModelText), [latestModelText]);
  const validations = useMemo(() => countValidations(latestModelText), [latestModelText]);

  const topologyHighlight = useMemo(() => {
    const contextText = [latestUser?.text ?? '', latestModelText].join('\n');
    return extractHighlightsFromText(contextText);
  }, [latestUser?.text, latestModelText]);

  const handleRecordDecision = useCallback(
    (decision: DecisionStatus, adminName: string) => {
      if (!latestAssistant) return;
      const newEntry: DecisionEntry = {
        id: `dec-${Date.now()}`,
        timestamp: getBogotaTimestamp(),
        requestSummary: summarizeRequest(latestUser?.text || 'Borrador NGN'),
        risk: riskLevel ?? 'No especificado',
        decision,
        adminName,
        messageId: latestAssistant.id,
      };
      setDecisions((prev) => [newEntry, ...prev]);
    },
    [latestAssistant, latestUser?.text, riskLevel]
  );

  const handleRequestChangesFocus = useCallback(() => {
    setDraftInput((prev) =>
      prev.trim() ? prev : 'Solicito ajustar el borrador anterior en lo siguiente: '
    );
    window.setTimeout(() => {
      document.getElementById('noc-chat-input')?.focus();
    }, 60);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="noc-grid-bg flex min-h-screen flex-col text-slate-100">
        <NocHeader isStreaming={isStreaming} />

        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[330px_minmax(0,1fr)_330px] xl:grid-cols-[360px_minmax(0,1fr)_350px] items-start">
            {/* Left Column: Topology Map */}
            <div className="order-2 lg:order-1">
              <TopologyMap highlight={topologyHighlight} />
            </div>

            {/* Center Column: Chat Console */}
            <div className="order-1 lg:order-2 min-w-0">
              <ChatConsole
                messages={messages}
                isStreaming={isStreaming}
                errorMessage={errorMessage}
                draftInput={draftInput}
                onDraftInputChange={setDraftInput}
                onSendMessage={handleSendMessage}
                onRetryLast={handleRetryLast}
                onClearChat={handleClearChat}
              />
            </div>

            {/* Right Column: HITL & Telemetry */}
            <div className="order-3">
              <HitlPanel
                riskLevel={riskLevel}
                hasDraft={hasDraft}
                isEscalated={isEscalated}
                latestAssistantMessageId={latestAssistant?.id ?? null}
                latestUserPrompt={latestUser?.text ?? ''}
                validations={validations}
                decisions={decisions}
                onRecordDecision={handleRecordDecision}
                onRequestChangesFocus={handleRequestChangesFocus}
              />
            </div>
          </div>
        </main>

        <footer className="border-t border-cyan-400/15 bg-[#080D1B]/85 px-4 py-3 text-xs text-slate-400 sm:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
            <p>
              NGN-Copiloto propone y valida; la persona decide. Ningún cambio se aplica sin
              aprobación humana.
            </p>
            <p className="font-mono text-cyan-300/80 whitespace-nowrap shrink-0">
              Diplomado Arquitectura Agéntica · CUN
            </p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
