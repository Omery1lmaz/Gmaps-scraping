import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { X, Send, Bot, Target, Zap, ChevronRight, BrainCircuit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

export const AIAssistant = ({ context }: { context: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>(() => {
    const saved = localStorage.getItem('arvexa_ai_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('arvexa_ai_history', JSON.stringify(messages));
  }, [messages]);

  const clearHistory = () => {
    if (confirm('Sohbet geçmişini silmek istediğinize emin misiniz?')) {
      setMessages([]);
      localStorage.removeItem('arvexa_ai_history');
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const sendMessage = async (text?: string) => {
    const messageToSend = text || input.trim();
    if (!messageToSend || isLoading) return;

    setInput('');
    const newMessages = [...messages, { role: 'user', content: messageToSend }];
    setMessages(newMessages as { role: 'user' | 'assistant'; content: string }[]);
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/ai/chat`, {
        messages: newMessages,
        context
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.content }]);
    } catch (err) {
      console.error('Chat failed', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, şu an bir bağlantı sorunu yaşıyorum. Lütfen tekrar deneyin.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    { text: 'En yüksek potansiyelli leadleri analiz et', icon: <Target className="h-4 w-4" />, color: 'blue' },
    { text: 'Satış stratejisi geliştir', icon: <Zap className="h-4 w-4" />, color: 'emerald' },
    { text: 'Yeni nişler öner', icon: <BrainCircuit className="h-4 w-4" />, color: 'purple' }
  ];

  return (
    <div className="fixed bottom-10 right-10 z-[100] flex flex-col items-end gap-5 pointer-events-none">
      {isOpen && (
        <Card className="w-[420px] h-[650px] pt-0 overflow-auto shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-[40px] overflow-hidden border border-white/20 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl animate-in slide-in-from-bottom-12 duration-500 pointer-events-auto flex flex-col">
          {/* Premium Header */}
          <CardHeader className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 p-8 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                  <BrainCircuit className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight">Arvexa Intelligence</CardTitle>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-100">Live Workspace Analist</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  className="text-white/60 hover:text-white hover:bg-white/10 rounded-2xl h-10 w-10 transition-all"
                  title="Geçmişi Temizle"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 rounded-2xl h-10 w-10 transition-all"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Chat Content */}
          <CardContent className="p-0 flex-1 overflow-hidden flex flex-col bg-slate-50/50 dark:bg-transparent">
            <ScrollArea className="flex-1 px-6 pt-6" ref={scrollRef}>
              <div className="space-y-8 pb-6">
                {messages.length === 0 && (
                  <div className="space-y-10 text-center py-10 px-4">
                    <div className="relative inline-block">
                      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-[32px] shadow-2xl shadow-indigo-500/30">
                        <Bot className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-emerald-500 h-6 w-6 rounded-full border-4 border-white dark:border-slate-900" />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Nasıl yardımcı olabilirim?</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed font-medium">
                        Verilerinizi analiz edebilir, ArvexaLabs stratejileri geliştirebilir ve yüksek bütçeli fırsatları yakalamanıza yardımcı olabilirim.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s.text)}
                          className="flex items-center justify-between p-4 rounded-[24px] bg-white dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300 group text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform`}>
                              {s.icon}
                            </div>
                            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{s.text}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] p-5 rounded-[24px] text-[13px] leading-relaxed font-medium shadow-sm ${m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-200 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                      }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-[24px] rounded-tl-none border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                      <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-[28px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-60" />
                <div className="relative flex items-center gap-3">
                  <Input
                    placeholder="Arvexa'ya bir soru sorun..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    className="flex-1 rounded-[24px] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 h-14 pl-6 pr-14 text-sm font-medium focus-visible:ring-indigo-600 transition-all shadow-inner"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/40 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest">
                AI can make mistakes. Verify important info.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-20 w-20 rounded-[32px] shadow-[0_15px_40px_rgba(79,70,229,0.4)] transition-all duration-500 group pointer-events-auto cursor-pointer flex items-center justify-center relative overflow-hidden active:scale-90 ${isOpen
          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rotate-90 rounded-full'
          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? <X className="h-8 w-8" /> : (
          <div className="relative">
            <BrainCircuit className="h-9 w-9 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-4 border-indigo-600 animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
};
