import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Loader2, MessageSquare, X, BarChart3 } from 'lucide-react';
import { ChatMessage, Law } from '../types';
import { chatWithLawyer } from '../services/geminiService';

interface AILawyerProps {
  laws: Law[];
  userSituation?: string;
}

const AILawyer: React.FC<AILawyerProps> = ({ laws, userSituation }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm your AI Civic Assistant. I can help you understand the laws we've found for your area. What would you like to know?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    const handleAskAI = (e: CustomEvent) => {
      setInput(`Can you explain this text: "${e.detail}"`);
      setIsOpen(true);
    };
    window.addEventListener('ask-ai', handleAskAI as EventListener);
    return () => window.removeEventListener('ask-ai', handleAskAI as EventListener);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    const nextHistory: ChatMessage[] = [...messages, { role: 'user', text: userMessage }];
    setInput('');
    setMessages(nextHistory);
    setIsLoading(true);
    try {
      const response = await chatWithLawyer(nextHistory, userMessage, laws, userSituation);
      setMessages((prev) => [...prev, { role: 'model', text: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'model', text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
        <MessageSquare size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:w-[400px]"
          >
            <div className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AI Civic Assistant</h3>
                  <span className="text-[10px] uppercase tracking-widest opacity-80">Powered by Gemini</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((msg, idx) => {
                const mentionedLaw = laws.find((law) => msg.text.includes(law.title) || (law.id && msg.text.includes(law.id)));
                return (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                      </div>
                      <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none bg-indigo-600 text-white' : 'rounded-tl-none bg-gray-100 text-gray-800'}`}>
                        {msg.text}
                      </div>
                    </div>
                    {msg.role === 'model' && mentionedLaw?.poll && (
                      <div className="ml-10 mt-2 max-w-[80%] rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600">
                          <BarChart3 size={12} />
                          Related Poll
                        </div>
                        <p className="mb-2 text-xs font-bold">{mentionedLaw.poll.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {mentionedLaw.poll.options.map((opt) => (
                            <button key={opt.label} className="rounded-full border border-indigo-600/30 bg-indigo-600/5 px-3 py-1 text-[10px] font-bold text-indigo-600 transition-colors hover:bg-indigo-600/10">
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                      <Bot size={16} />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2">
                      <Loader2 size={14} className="animate-spin text-indigo-600" />
                      <span className="text-xs text-muted">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-200 p-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-gray-50 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-600">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about a law..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
                <button onClick={handleSend} disabled={!input.trim() || isLoading} className="rounded-full bg-indigo-600 p-1.5 text-white disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AILawyer;
