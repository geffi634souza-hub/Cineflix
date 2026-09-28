import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Loader2, HelpCircle } from 'lucide-react';
import { Series } from '../types/series';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSeries: Series;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  activeSeries,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Olá! Sou o Tutor Gemini de inteligência artificial para a série "${activeSeries.title}". Como todos os episódios estão compilados em um único vídeo contínuo, posso te ajudar a entender qualquer conceito, resumir lições ou responder suas dúvidas sobre o conteúdo!`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    if (!customPrompt) setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/gemini/ask-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesTitle: activeSeries.title,
          synopsis: activeSeries.synopsis,
          question: textToSend,
        }),
      });

      const data = await res.json();
      const answer = data.answer || 'Não consegui processar a resposta no momento.';
      setMessages([...newMessages, { role: 'assistant', content: answer }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro de comunicação com o servidor Gemini.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'Qual é o principal modelo mental ensinado nesta série?',
    'Como posso aplicar a primeira lição na prática hoje?',
    'Resuma os 3 pontos mais importantes do episódio único.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl h-[600px] flex flex-col bg-[#0b0f17] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Tutor Inteligente Gemini
              </h3>
              <p className="text-xs text-slate-400">
                Série: <span className="text-amber-300 font-medium">{activeSeries.title}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat message stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-amber-400 text-black font-medium'
                    : 'bg-white/5 text-slate-200 border border-white/10'
                }`}
              >
                {m.content}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-amber-400">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Gemini está analisando a série e formulando a resposta...</span>
            </div>
          )}
        </div>

        {/* Quick prompt suggestions */}
        <div className="px-6 py-2 bg-black/40 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-400 shrink-0">Sugestões:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              className="text-[11px] text-amber-300 hover:text-amber-200 bg-white/5 hover:bg-white/10 border border-white/5 rounded-md px-2.5 py-1 whitespace-nowrap transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Faça uma pergunta sobre este episódio único..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="p-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-40 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
