import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  Send,
  MessageCircle,
  Users,
  Search,
  ChevronLeft,
  Building2,
  UserCircle2,
  CheckCheck,
  Wifi,
  WifiOff,
  Paperclip,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Lock,
  Unlock
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Conversation {
  id: string;
  company_name?: string;
  name?: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
  avatar?: string;
  type: 'client' | 'team';
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_from_client: boolean;
  client_id?: string;
  team_channel?: string;
  file_url?: string;
  file_name?: string;
  file_type?: 'image' | 'document';
  sender_role?: string;
}

// ---------------------------------------------------------------------------
// Mock data (localized)
// ---------------------------------------------------------------------------
const getMockClients = (isAr: boolean): Conversation[] => [
  {
    id: 'mock-c1',
    company_name: isAr ? 'شركة الموالح للإنشاء' : 'Al Mawaleh Construction',
    lastMessage: isAr ? 'متى سيكون الإقرار الضريبي جاهزاً؟' : 'When will the VAT return be ready?',
    lastTime: '09:30',
    unread: 2,
    type: 'client'
  },
  {
    id: 'mock-c2',
    company_name: isAr ? 'مجموعة الباطنة التجارية' : 'Al Batinah Trading Group',
    lastMessage: isAr ? 'تم استلام الفاتورة، شكراً.' : 'Invoice received, thank you.',
    lastTime: isAr ? 'أمس' : 'Yesterday',
    unread: 0,
    type: 'client'
  },
  {
    id: 'mock-c3',
    company_name: isAr ? 'شركة النخيل' : 'Al Nakheel Co.',
    lastMessage: isAr ? 'هل يمكن تعديل العقد؟' : 'Can the contract be modified?',
    lastTime: isAr ? 'الأحد' : 'Sunday',
    unread: 1,
    type: 'client'
  },
];

const getMockTeam = (isAr: boolean): Conversation[] => [
  {
    id: 'team-general',
    name: isAr ? 'القناة العامة' : 'General Channel',
    lastMessage: isAr ? 'اجتماع الفريق غداً الساعة 10 صباحاً' : 'Team meeting tomorrow at 10 AM',
    lastTime: '10:15',
    unread: 5,
    type: 'team'
  },
  {
    id: 'team-accounts',
    name: isAr ? 'فريق المحاسبة' : 'Accounts Team',
    lastMessage: isAr ? 'تم إرسال تقرير الشهر' : 'Monthly report sent',
    lastTime: isAr ? 'أمس' : 'Yesterday',
    unread: 0,
    type: 'team'
  },
];

const getMockMessages = (convId: string, isAr: boolean): Message[] => {
  const store: Record<string, Message[]> = {
    'mock-c1': [
      {
        id: 'm1',
        content: isAr ? 'السلام عليكم، متى سيكون الإقرار الضريبي جاهزاً؟' : 'Hello, when will the VAT return be ready?',
        sender_id: 'client',
        is_from_client: true,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'm2',
        content: isAr ? 'وعليكم السلام، نعمل عليه حالياً وسيكون جاهزاً خلال يومين.' : 'Hi, we are working on it. It should be ready in 2 days.',
        sender_id: 'emp',
        is_from_client: false,
        created_at: new Date(Date.now() - 3500000).toISOString()
      },
      {
        id: 'm3',
        content: isAr ? 'ممتاز، شكراً جزيلاً على سرعة التجاوب.' : 'Excellent, thank you for the quick response.',
        sender_id: 'client',
        is_from_client: true,
        created_at: new Date(Date.now() - 3400000).toISOString()
      },
    ],
    'team-general': [
      {
        id: 'tm1',
        content: isAr ? 'صباح الخير يا فريق! تذكيراً باجتماعنا غداً.' : 'Good morning team! Reminder about tomorrow meeting.',
        sender_id: 'mgr',
        is_from_client: false,
        created_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'tm2',
        content: isAr ? 'حاضرين!' : 'We will be there!',
        sender_id: 'emp',
        is_from_client: false,
        created_at: new Date(Date.now() - 7100000).toISOString()
      },
    ],
  };
  return store[convId] || [];
};

// ---------------------------------------------------------------------------
// Helper: format timestamp
// ---------------------------------------------------------------------------
const formatTime = (iso: string, isAr: boolean) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString(isAr ? 'ar-OM' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return isAr ? 'أمس' : 'Yesterday';
  return d.toLocaleDateString(isAr ? 'ar-OM' : 'en-GB', { day: '2-digit', month: 'short' });
};

// ---------------------------------------------------------------------------
// Sub: Conversation List Item
// ---------------------------------------------------------------------------
const ConvItem = ({
  conv, isSelected, onClick, isAr
}: {
  conv: Conversation; isSelected: boolean; onClick: () => void; isAr: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-start p-3.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0 ${
      isSelected ? 'bg-red-50 border-s-2 border-s-brand-dark' : 'hover:bg-gray-50'
    }`}
  >
    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
      conv.type === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-brand-dark/10 text-brand-dark'
    }`}>
      {conv.type === 'team' ? <Users size={18} /> : (conv.company_name || conv.name || 'C').charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-semibold text-sm text-gray-800 truncate pe-2">
          {conv.company_name || conv.name}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{conv.lastTime}</span>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 truncate pe-2">{conv.lastMessage}</p>
        {(conv.unread ?? 0) > 0 && (
          <span className="w-4 h-4 bg-brand-dark text-white text-[9px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
            {conv.unread}
          </span>
        )}
      </div>
    </div>
  </button>
);

// ---------------------------------------------------------------------------
const MsgBubble = ({ msg, isMine, isAr }: { msg: Message; isMine: boolean; isAr: boolean }) => (
  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[72%] group`}>
      {/* Sender Name for Group Chats */}
      {!isMine && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
            {msg.sender_id === 'mgr' ? (isAr ? 'المدير' : 'Manager') : (isAr ? 'موظف' : 'Staff')}
          </span>
          {msg.sender_id === 'mgr' && <ShieldCheck size={10} className="text-brand-dark" />}
        </div>
      )}
      
      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
        isMine
          ? 'bg-brand-dark text-white rounded-ee-sm'
          : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-es-sm'
      }`}>
        {msg.content}
        
        {/* Attachment Display */}
        {msg.file_url && (
          <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 border ${
            isMine ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'
          }`}>
            <FileText size={18} className={isMine ? 'text-white' : 'text-brand-dark'} />
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold truncate ${isMine ? 'text-white' : 'text-gray-900'}`}>{msg.file_name || 'document.pdf'}</p>
              <p className={`text-[8px] uppercase font-black opacity-60 ${isMine ? 'text-white' : 'text-gray-400'}`}>
                {msg.file_type || 'File'}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className={`flex items-center gap-1 mt-1 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[10px] text-gray-400">
          {formatTime(msg.created_at, isAr)}
        </span>
        {isMine && <CheckCheck size={12} className="text-brand-dark/60" />}
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const Messaging = () => {
  const { t, i18n } = useTranslation();
  const { user, role } = useAuth();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'client' | 'team'>('client');
  const [clientConversations, setClientConversations] = useState<Conversation[]>([]);
  const [teamConversations, setTeamConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileConvOpen, setIsMobileConvOpen] = useState(false);
  const [isGeneralReadonly, setIsGeneralReadonly] = useState(false); // Global toggle
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load conversations ───────────────────────────────────────────────────
  useEffect(() => {
    const loadConversations = async () => {
      setLoadingMessages(true);
      if (role === 'client') {
        setClientConversations([{ id: user?.id || 'client', company_name: t('messaging.supportTeam'), type: 'client' }]);
        setSelectedConv({ id: user?.id || 'client', company_name: t('messaging.supportTeam'), type: 'client' });
        setLoadingMessages(false);
        return;
      }

      try {
        // 1. Fetch real Clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, company_name')
          .order('company_name');
        
        const cConvs: Conversation[] = (clientsData || []).map(c => ({
          id: c.id,
          company_name: c.company_name,
          type: 'client' as const,
          lastMessage: isAr ? 'انقر للمراسلة' : 'Click to message',
          lastTime: '',
          unread: 0,
        }));
        setClientConversations(cConvs);

        // 2. Fetch real Team Members (Everyone who is NOT a client)
        const { data: teamData } = await supabase
          .from('profiles')
          .select('id, email, role')
          .neq('role', 'client') // Include Manager, Accountant, Employee, etc.
          .neq('id', user?.id || ''); // Don't show myself in team list
        
        const tConvs: Conversation[] = (teamData || []).map(t => ({
          id: t.id,
          name: t.email.split('@')[0], // Use first part of email as name
          type: 'team' as const,
          lastMessage: isAr ? `${t.role}` : `${t.role.charAt(0).toUpperCase() + t.role.slice(1)}`,
          lastTime: '',
          unread: 0,
        }));
        
        // Add a "General Channel" for the whole team
        const generalChannel: Conversation = {
          id: 'team-general',
          name: isAr ? 'القناة العامة' : 'General Channel',
          type: 'team',
          lastMessage: isAr ? 'محادثة جماعية' : 'Group chat',
          lastTime: '',
          unread: 0
        };
        
        setTeamConversations([generalChannel, ...tConvs]);
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadConversations();

    // 3. Load Channel Settings (Read-only status)
    const loadSettings = async () => {
      const { data } = await supabase
        .from('channel_settings')
        .select('*')
        .eq('channel_id', 'team-general')
        .single();
      if (data) setIsGeneralReadonly(data.is_readonly);
    };
    loadSettings();

    // 4. Realtime Channel Settings Listener
    const settingsChannel = supabase
      .channel('public:channel_settings')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'channel_settings',
        filter: 'channel_id=eq.team-general'
      }, (payload) => {
        setIsGeneralReadonly(payload.new.is_readonly);
      })
      .subscribe();

    return () => { supabase.removeChannel(settingsChannel); };
  }, [role, user, isAr, t]);

  // ── Load messages + realtime ─────────────────────────────────────────────
  const loadMessages = useCallback(async (conv: Conversation) => {
    setLoadingMessages(true);
    setMessages([]);

    try {
      const filter = conv.type === 'client'
        ? supabase.from('messages').select('*').eq('client_id', conv.id).order('created_at', { ascending: true })
        : supabase.from('messages').select('*').eq('team_channel', conv.id).order('created_at', { ascending: true });

      const { data } = await filter;
      setMessages(data?.length ? (data as Message[]) : getMockMessages(conv.id, isAr));
      setIsOnline(true);
    } catch {
      setMessages(getMockMessages(conv.id, isAr));
      setIsOnline(false);
    } finally {
      setLoadingMessages(false);
    }
  }, [isAr]);

  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv);

    // Realtime subscription
    const channel = supabase
      .channel(`msgs-${selectedConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: selectedConv.type === 'client'
          ? `client_id=eq.${selectedConv.id}`
          : `team_channel=eq.${selectedConv.id}`,
      }, (payload) => {
        setMessages((prev) => {
          // Deduplicate: ignore if already present (optimistic update)
          if (prev.some(m => m.id === (payload.new as Message).id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv, loadMessages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv) return;

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      content: newMessage,
      sender_id: user?.id || 'me',
      is_from_client: role === 'client',
      created_at: new Date().toISOString(),
      client_id: selectedConv.type === 'client' ? selectedConv.id : undefined,
      team_channel: selectedConv.type === 'team' ? selectedConv.id : undefined,
    };

    // Optimistic UI
    setMessages((prev) => [...prev, optimistic]);
    const draft = newMessage;
    setNewMessage('');
    inputRef.current?.focus();

    const payload: any = {
      content: draft,
      sender_id: user?.id,
      is_from_client: role === 'client',
    };
    if (selectedConv.type === 'client') payload.client_id = selectedConv.id;
    else payload.team_channel = selectedConv.id;

    const { error } = await supabase.from('messages').insert([payload]);
    if (error) {
      // Rollback optimistic on failure
      setMessages((prev) => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(draft);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, we simulate an upload by adding a mock message
    const mockFileMsg: Message = {
      id: `file-${Date.now()}`,
      content: isAr ? `تم إرسال ملف: ${file.name}` : `Sent a file: ${file.name}`,
      sender_id: user?.id || 'me',
      is_from_client: role === 'client',
      created_at: new Date().toISOString(),
      file_url: '#',
      file_name: file.name,
      file_type: file.type.includes('image') ? 'image' : 'document',
      client_id: selectedConv?.type === 'client' ? selectedConv.id : undefined,
      team_channel: selectedConv?.type === 'team' ? selectedConv.id : undefined,
    };

    setMessages(prev => [...prev, mockFileMsg]);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Filtered conversations ───────────────────────────────────────────────
  const convList = activeTab === 'client' ? clientConversations : teamConversations;
  const filteredConvs = convList.filter(c =>
    (c.company_name || c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setIsMobileConvOpen(false);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex h-full bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div className={`
          flex flex-col
          w-full md:w-80 lg:w-72 xl:w-84
          border-e border-gray-100 bg-gray-50/30 flex-shrink-0
          ${selectedConv ? 'hidden md:flex' : 'flex'}
          ${isMobileConvOpen ? 'flex' : ''}
        `}>
          {/* Header */}
          <div className="p-6 bg-white border-b border-gray-100 flex-shrink-0">
            <h2 className="font-black text-gray-900 text-lg flex items-center gap-3 mb-4 tracking-tight uppercase">
              <MessageCircle size={22} className="text-brand-dark" />
              {t('messaging.messages')}
            </h2>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1.5 gap-1.5">
              {(['client', 'team'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedConv(null); }}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
                    activeTab === tab
                      ? 'bg-white text-brand-dark shadow-md scale-[1.02]'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'client' ? <Building2 size={14} /> : <Users size={14} />}
                  {tab === 'client' ? (isAr ? 'العملاء' : 'Clients') : (isAr ? 'الفريق' : 'Team')}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100 flex-shrink-0 bg-white/50">
            <div className="relative">
              <Search className={`absolute ${isAr ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
              <input
                type="text"
                placeholder={isAr ? 'بحث...' : 'Search...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-xs bg-white border border-gray-200 rounded-2xl outline-none focus:border-brand-dark shadow-inner transition-all`}
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="text-center p-12 text-gray-400">
                <MessageCircle size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">{isAr ? 'لا توجد محادثات' : 'No conversations'}</p>
              </div>
            ) : (
              filteredConvs.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isSelected={selectedConv?.id === conv.id}
                  onClick={() => handleSelectConv(conv)}
                  isAr={isAr}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Main Chat Area ────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white ${!selectedConv && 'hidden md:flex'}`}>

          {!selectedConv ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 bg-gray-50/20">
              <div className="w-24 h-24 bg-white shadow-xl rounded-full flex items-center justify-center mb-6 animate-bounce">
                <MessageCircle size={40} className="text-brand-dark opacity-60" />
              </div>
              <h3 className="font-black text-gray-900 mb-2 uppercase tracking-tight text-xl">
                {isAr ? 'اختر محادثة' : 'Select a Conversation'}
              </h3>
              <p className="text-sm text-center font-medium max-w-[280px]">{t('messaging.selectToStart')}</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-5 bg-white border-b border-gray-100 flex items-center gap-4 flex-shrink-0 shadow-sm z-10">
                {/* Mobile back button */}
                <button
                  className="md:hidden p-2 text-gray-500 hover:text-brand-dark bg-gray-50 rounded-xl transition-all active:scale-90"
                  onClick={() => setSelectedConv(null)}
                >
                  <ChevronLeft size={22} className={isAr ? 'rotate-180' : ''} />
                </button>

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-inner ${
                  selectedConv.type === 'team' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-brand-dark'
                }`}>
                  {selectedConv.type === 'team'
                    ? <Users size={24} />
                    : (selectedConv.company_name || 'C').charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 truncate tracking-tight">
                    {selectedConv.company_name || selectedConv.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {isOnline
                      ? <><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-[10px] text-green-600 font-black uppercase tracking-widest">{t('messaging.online')}</span></>
                      : <><div className="w-2 h-2 bg-gray-300 rounded-full" /><span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isAr ? 'غير متصل' : 'Offline'}</span></>
                    }
                  </div>
                </div>

                {/* Read-only Toggle for Manager */}
                {role === 'manager' && selectedConv.id === 'team-general' && (
                  <button
                    onClick={async () => {
                      const newState = !isGeneralReadonly;
                      setIsGeneralReadonly(newState); // Optimistic UI
                      await supabase
                        .from('channel_settings')
                        .update({ is_readonly: newState })
                        .eq('channel_id', 'team-general');
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${
                      isGeneralReadonly 
                        ? 'bg-red-50 border-red-200 text-red-600' 
                        : 'bg-green-50 border-green-200 text-green-600'
                    }`}
                  >
                    {isGeneralReadonly ? <Lock size={14} /> : <Unlock size={14} />}
                    {isGeneralReadonly 
                      ? (isAr ? 'وضع الإعلانات' : 'Read Only') 
                      : (isAr ? 'محادثة مفتوحة' : 'Open Chat')}
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl text-[10px] text-gray-500 font-black uppercase tracking-widest border border-gray-100">
                  {selectedConv.type === 'team' ? <Users size={14} /> : <Building2 size={14} />}
                  <span>
                    {selectedConv.type === 'team' ? (isAr ? 'فريق' : 'Team') : (isAr ? 'عميل' : 'Client')}
                  </span>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/40 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="p-6 bg-white rounded-full shadow-xl mb-6 opacity-20">
                      <UserCircle2 size={50} />
                    </div>
                    <p className="font-black uppercase tracking-widest text-xs">{t('messaging.noMessagesYet')}</p>
                    <p className="text-[10px] mt-2 font-bold opacity-60">{isAr ? 'ابدأ المحادثة الآن' : 'Start the conversation'}</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = role === 'client' ? msg.is_from_client : !msg.is_from_client;
                    return <MsgBubble key={msg.id || idx} msg={msg} isMine={isMine} isAr={isAr} />;
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                {isGeneralReadonly && selectedConv.id === 'team-general' && role !== 'manager' ? (
                  <div className="py-4 px-6 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-3 text-red-600 animate-pulse">
                    <Lock size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {isAr ? 'القناة في وضع القراءة فقط حالياً' : 'This channel is currently read-only'}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-gray-400 hover:text-brand-dark bg-gray-50 rounded-xl transition-all active:scale-90"
                      title={isAr ? 'إرفاق ملف' : 'Attach File'}
                    >
                      <Paperclip size={20} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={t('messaging.typeMessage')}
                      className="flex-1 py-4 px-6 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-brand-dark focus:bg-white focus:ring-4 focus:ring-red-900/5 transition-all shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-14 h-14 bg-brand-dark hover:bg-red-800 disabled:opacity-30 disabled:grayscale text-white rounded-2xl flex items-center justify-center shadow-xl shadow-red-900/20 transition-all active:scale-90"
                    >
                      <Send size={24} className={isAr ? 'rotate-180' : ''} />
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;
