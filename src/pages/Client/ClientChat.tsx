import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { 
  Send, 
  Phone, 
  RefreshCw, 
  CheckCheck, 
  UserCircle2, 
  MessageSquare,
  ChevronLeft,
  X,
  Clock,
  Building2,
  PhoneCall,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_from_client: boolean;
  client_id?: string;
}

const ClientChat = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Fetch & Realtime ─────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();

    if (!user) return;

    const channel = supabase
      .channel(`client-chat-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `client_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  const handleSend = async (content: string) => {
    if (!content.trim() || !user) return;
    setIsSending(true);

    const payload = {
      content: content.trim(),
      sender_id: user.id,
      client_id: user.id,
      is_from_client: true,
    };

    // Optimistic
    const optimisticId = `opt-${Date.now()}`;
    setMessages(prev => [...prev, { ...payload, id: optimisticId, created_at: new Date().toISOString() }]);
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert([payload]);
      if (error) throw error;
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const sendQuickAction = (action: string) => {
    const text = action === 'call' 
      ? (isAr ? 'طلب اتصال: أرجو التواصل معي هاتفياً في أقرب وقت.' : 'Call Request: Please contact me by phone as soon as possible.')
      : (isAr ? 'طلب تحديث: هل هناك أي مستجدات بخصوص معاملاتي؟' : 'Update Request: Are there any updates regarding my transactions?');
    handleSend(text);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] animate-in slide-in-from-bottom-4 duration-700 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="p-5 bg-white border-b border-gray-50 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-dark flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-red-900/20">
            م
          </div>
          <div className={isAr ? 'text-right' : 'text-left'}>
            <h3 className="font-black text-gray-900 text-base tracking-tight">{isAr ? 'فريق ميسرة' : 'Maisarah Team'}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isAr ? 'متصل الآن' : 'Support Active'}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => sendQuickAction('call')}
          className="p-4 bg-red-50 text-brand-dark rounded-2xl hover:bg-brand-dark hover:text-white transition-all active:scale-95 shadow-sm group"
          title={isAr ? 'طلب اتصال' : 'Request Call'}
        >
          <PhoneCall size={22} className="group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-gray-50/30 scroll-smooth">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-gray-300">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-dark"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">{isAr ? 'جاري التحميل...' : 'Syncing Messages...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="w-24 h-24 bg-white rounded-full shadow-xl flex items-center justify-center mb-8 border border-gray-50 relative">
              <MessageSquare size={44} className="text-gray-100" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-dark rounded-full border-4 border-white" />
            </div>
            <h4 className="font-black text-xl text-gray-900 mb-3 tracking-tight uppercase">{isAr ? 'ابدأ المحادثة' : 'Start a Conversation'}</h4>
            <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed font-medium">{isAr ? 'فريقنا متاح للرد على استفساراتك المحاسبية والضريبية' : 'Our team is available to answer your accounting and tax inquiries.'}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.is_from_client;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}>
                <div className={`max-w-[85%] sm:max-w-[70%] group`}>
                  <div className={`p-5 rounded-[2rem] text-sm leading-relaxed shadow-sm font-medium ${
                    isMine
                      ? `bg-brand-dark text-white ${isAr ? 'rounded-be-none' : 'rounded-ee-none'} shadow-lg shadow-red-900/10`
                      : `bg-white border border-gray-100 text-gray-800 ${isAr ? 'rounded-bs-none' : 'rounded-es-none'}`
                  }`}>
                    {msg.content}
                  </div>
                  <div className={`flex items-center gap-2 mt-2.5 px-2 ${isMine ? (isAr ? 'justify-start' : 'justify-end') : (isAr ? 'justify-end' : 'justify-start')}`}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && <CheckCheck size={14} className="text-brand-dark" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions & Input */}
      <div className="p-5 bg-white border-t border-gray-50 space-y-5 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        {/* Quick Buttons */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          <button 
            onClick={() => sendQuickAction('call')}
            className="flex-shrink-0 px-5 py-2.5 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-brand-dark border border-transparent hover:border-red-100 transition-all active:scale-95 shadow-sm"
          >
            📞 {isAr ? 'اتصل بي' : 'Call Me'}
          </button>
          <button 
            onClick={() => sendQuickAction('update')}
            className="flex-shrink-0 px-5 py-2.5 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-brand-dark border border-transparent hover:border-red-100 transition-all active:scale-95 shadow-sm"
          >
            🔄 {isAr ? 'طلب تحديث' : 'Request Update'}
          </button>
          <button 
            className="flex-shrink-0 px-5 py-2.5 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-brand-dark border border-transparent hover:border-red-100 transition-all active:scale-95 shadow-sm"
          >
            📄 {isAr ? 'إرفاق مستند' : 'Attach File'}
          </button>
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(newMessage); }}
          className="flex items-center gap-4"
        >
          <div className="flex-1 relative group">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isAr ? 'اكتب رسالتك هنا...' : 'Type your message...'}
              className={`w-full py-5 px-7 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-red-900/5 focus:border-brand-dark focus:bg-white transition-all font-medium shadow-inner ${isAr ? 'text-right' : 'text-left'}`}
            />
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="w-16 h-16 bg-brand-dark hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl shadow-red-900/20 active:scale-90 flex-shrink-0"
          >
            <Send size={28} className={`${isAr ? 'rotate-180' : ''} transition-transform group-hover:translate-x-1`} />
          </button>
        </form>
      </div>

    </div>
  );
};

export default ClientChat;
