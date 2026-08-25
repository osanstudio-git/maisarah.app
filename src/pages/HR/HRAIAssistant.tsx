import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabaseClient';
import {
  Sparkles, Send, Bot, User, Copy, RefreshCw, FileText, CheckCircle2, ShieldAlert, Award
} from 'lucide-react';

interface ChatMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export default function HRAIAssistant() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: isAr 
        ? 'مرحباً! أنا مساعد الذكاء الاصطناعي الذكي لـ Maisarah HR. كيف يمكنني مساعدتك اليوم؟ يمكنك صياغة خطابات إنذار، أو تحليل نسب الغياب، أو الاستفسار عن قانون العمل العماني.' 
        : 'Hello! I am the Maisarah HR Intelligent Assistant. How can I support you today? You can ask me to draft warning letters, summarize Omani Labor Law policies, or run attendance metrics.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Call Supabase Edge Function securely
      const { data, error } = await supabase.functions.invoke('hr-assistant', {
        body: { message: textToSend }
      });

      if (error) throw error;

      const aiText = data?.reply || (isAr 
        ? 'عذراً، لم أتمكن من الحصول على رد مناسب.' 
        : 'Sorry, I could not generate a proper response.');

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      const errorMsg = isAr
        ? `خطأ في الاتصال بمساعد الذكاء الاصطناعي: ${err.message || 'فشل الطلب'}`
        : `AI Connection Error: ${err.message || 'Request failed'}`;

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: errorMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(isAr ? 'تم نسخ النص إلى الحافظة!' : 'Text copied to clipboard!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-[620px] flex flex-col justify-between" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <Sparkles className="text-[#A11212] animate-pulse" size={24} />
          {isAr ? 'مساعد الموارد البشرية الذكي (AI)' : 'Maisarah HR AI Co-Pilot'}
        </h2>
        <p className="text-xs text-gray-500 font-bold">
          {isAr ? 'صياغة المستندات، خطابات لفت النظر، والتحليل التلقائي لقوانين العمل' : 'Automated draft creation, compliance lookup, and intelligent employee analysis'}
        </p>
      </div>

      {/* Chat workspace split */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-0">
        
        {/* Left Side: Preset prompts and shortcuts */}
        <div className="w-full lg:w-1/3 bg-gray-50/50 border-b lg:border-b-0 lg:border-r border-gray-100 p-4 space-y-4 overflow-y-auto">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Co-Pilot Prompts Templates</h4>
          
          <button 
            onClick={() => handleSend(isAr ? 'صياغة خطاب إنذار رسمي بسبب التأخر المتكرر عن العمل' : 'Draft formal warning letter for repeated tardiness')}
            className="w-full p-4.5 bg-white border border-gray-200 rounded-xl hover:border-[#A11212] transition-colors text-start block space-y-1"
          >
            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5"><FileText size={14} className="text-[#A11212]" /> {isAr ? 'صياغة خطاب إنذار' : 'Draft Warning Letter'}</span>
            <span className="text-[10px] text-gray-500 font-medium block">Generate professional warning template in seconds.</span>
          </button>

          <button 
            onClick={() => handleSend(isAr ? 'ما هي نسب احتساب الإجازة المرضية في قانون العمل العماني؟' : 'Explain sick leave salary policies under Omani labor law')}
            className="w-full p-4.5 bg-white border border-gray-200 rounded-xl hover:border-[#A11212] transition-colors text-start block space-y-1"
          >
            <span className="text-xs font-black text-gray-900 flex items-center gap-1.5"><ShieldAlert size={14} className="text-[#A11212]" /> {isAr ? 'قانون العمل العماني' : 'Omani Labor Law Lookup'}</span>
            <span className="text-[10px] text-gray-500 font-medium block">Lookup exact sick leave wage calculation brackets.</span>
          </button>
        </div>

        {/* Right Side: Conversation Box */}
        <div className="flex-1 flex flex-col justify-between min-h-0 bg-white">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
            {messages.map((msg, idx) => {
              const isAI = msg.sender === 'ai';
              return (
                <div key={idx} className={`flex gap-3 max-w-[85%] ${isAI ? '' : 'ml-auto flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                    isAI ? 'bg-[#A11212]/5 text-[#A11212] border-[#A11212]/10' : 'bg-gray-900 text-white border-transparent'
                  }`}>
                    {isAI ? <Bot size={16} /> : <User size={16} />}
                  </div>
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl text-xs font-medium whitespace-pre-line leading-relaxed ${
                      isAI ? 'bg-gray-50 text-gray-800' : 'bg-[#A11212] text-white'
                    }`}>
                      {msg.text}
                    </div>
                    <div className={`flex items-center gap-2 text-[8px] text-gray-400 font-bold ${isAI ? 'justify-start' : 'justify-end'}`}>
                      <span>{msg.timestamp}</span>
                      {isAI && (
                        <button 
                          onClick={() => copyToClipboard(msg.text)} 
                          className="hover:text-[#A11212] p-0.5" 
                          title="Copy Draft"
                        >
                          <Copy size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isTyping && (
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-full bg-[#A11212]/5 text-[#A11212] border border-[#A11212]/10 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-[#A11212] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[#A11212] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[#A11212] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Form input bottom bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputText);
            }} 
            className="p-4 border-t border-gray-100 flex gap-2 items-center bg-gray-50/20"
          >
            <input
              type="text"
              required
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isAr ? 'اسأل المساعد الذكي شيئاً...' : 'Ask the AI Assistant a question...'}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#A11212] transition-all"
            />
            <button
              type="submit"
              className="bg-[#A11212] text-white p-3 rounded-xl hover:bg-[#800e0e] transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
