import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Paperclip,
  FileText,
  ShieldCheck,
  Lock,
  Unlock,
  Circle,
  RefreshCw
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Conversation {
  id: string;
  company_name?: string;
  name?: string;
  email?: string;
  role?: string;
  department_id?: string;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
  avatar?: string;
  type: 'client' | 'team';
  online?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
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
// Staff Name & Title Directory
// ---------------------------------------------------------------------------
export const formatStaffProfile = (p: { full_name?: string | null; email?: string | null; role?: string; department_id?: string | null }, isAr: boolean) => {
  const emailHandle = (p.email || '').split('@')[0].toLowerCase();

  const directory: Record<string, { name: string; nameAr: string; roleName: string; roleNameAr: string }> = {
    'info': {
      name: 'Budoor Alhasani',
      nameAr: 'بدور الحسني',
      roleName: 'Executive Manager',
      roleNameAr: 'المدير التنفيذي'
    },
    'afrah_maisarah': {
      name: 'Afrah Khan',
      nameAr: 'أفراح خان',
      roleName: 'Bookkeeping Specialist',
      roleNameAr: 'أخصائية مسك الدفاتر'
    },
    'shafnas_maisarah': {
      name: 'Shafnas Al-Balushi',
      nameAr: 'شفناس البلوشي',
      roleName: 'VAT & Tax Specialist',
      roleNameAr: 'أخصائي الضرائب والقيمة المضافة'
    },
    'munawira_maisarah': {
      name: 'Munawira Al-Harthy',
      nameAr: 'منورة الحارثية',
      roleName: 'Audit & Assurance Specialist',
      roleNameAr: 'أخصائية التدقيق والمراجعة'
    },
    'feasibility_maisarah': {
      name: 'Shahad Alhadi',
      nameAr: 'شهد الهادي',
      roleName: 'Feasibility & Financial Consultant',
      roleNameAr: 'استشارية دراسات الجدوى والمالية'
    },
    'ekhlas': {
      name: 'Ekhlas Al-Hinai',
      nameAr: 'إخلاص الهنائي',
      roleName: 'HR & Personnel Officer',
      roleNameAr: 'مسؤولة الموارد البشرية'
    },
    'marketing': {
      name: 'Nawaf Al-Balushi',
      nameAr: 'نواف البلوشي',
      roleName: 'Client Relations & CRM Lead',
      roleNameAr: 'رئيس علاقات العملاء والتسويق'
    },
    'auditing': {
      name: 'Audit Department Desk',
      nameAr: 'مكتب قسم التدقيق',
      roleName: 'Senior Auditor',
      roleNameAr: 'مدقق أول'
    }
  };

  const matched = directory[emailHandle];
  const displayName = p.full_name?.trim()
    ? p.full_name.trim()
    : (isAr && matched?.nameAr ? matched.nameAr : (matched?.name || emailHandle.split(/[._-]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')));

  const displayRole = isAr
    ? (matched?.roleNameAr || (p.department_id ? `قسم ${p.department_id}` : (p.role === 'manager' ? 'المدير' : 'موظف')))
    : (matched?.roleName || (p.department_id ? `${p.department_id.toUpperCase()} Staff` : (p.role === 'manager' ? 'Manager' : 'Employee')));

  return { displayName, displayRole };
};

// ---------------------------------------------------------------------------
// Helper: format timestamp
// ---------------------------------------------------------------------------
const formatTime = (iso: string, isAr: boolean) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
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
  conv,
  isSelected,
  onClick,
  isAr,
  isOnline
}: {
  conv: Conversation;
  isSelected: boolean;
  onClick: () => void;
  isAr: boolean;
  isOnline?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full text-start p-3.5 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0 cursor-pointer ${
      isSelected ? 'bg-red-50 border-s-4 border-s-brand-dark shadow-xs' : 'hover:bg-gray-50'
    }`}
  >
    <div className="relative flex-shrink-0">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${
        conv.id === 'team-general' 
          ? 'bg-gradient-to-tr from-brand-dark to-red-600 text-white shadow-sm' 
          : (conv.type === 'team' ? 'bg-blue-100 text-blue-700 font-black' : 'bg-brand-dark/10 text-brand-dark font-black')
      }`}>
        {conv.id === 'team-general' ? <Users size={18} /> : (conv.company_name || conv.name || 'C').charAt(0)}
      </div>
      {/* Presence Dot (except general channel) */}
      {conv.id !== 'team-general' && (
        <span
          className={`absolute bottom-0 end-0 w-3 h-3 rounded-full border-2 border-white ${
            isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-gray-300'
          }`}
          title={isOnline ? (isAr ? 'متصل الآن' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
        />
      )}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-0.5">
        <span className="font-bold text-sm text-gray-800 truncate pe-2">
          {conv.company_name || conv.name}
        </span>
        <span className="text-[10px] text-gray-400 flex-shrink-0">{conv.lastTime}</span>
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 truncate pe-2">
          {conv.lastMessage || conv.role}
        </p>
        {(conv.unread ?? 0) > 0 && (
          <span className="w-4 h-4 bg-brand-dark text-white text-[9px] font-black rounded-full flex items-center justify-center flex-shrink-0">
            {conv.unread}
          </span>
        )}
      </div>
    </div>
  </button>
);

// ---------------------------------------------------------------------------
// Sub: Message Bubble
// ---------------------------------------------------------------------------
const MsgBubble = ({
  msg,
  isMine,
  senderName,
  senderRole,
  isAr
}: {
  msg: Message;
  isMine: boolean;
  senderName?: string;
  senderRole?: string;
  isAr: boolean;
}) => (
  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
    <div className="max-w-[75%] sm:max-w-[65%] group">
      {/* Sender Header for Incoming Messages */}
      {!isMine && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-[11px] font-black text-gray-700 tracking-tight">
            {senderName || (isAr ? 'عضو الفريق' : 'Team Member')}
          </span>
          {senderRole && (
            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded-full">
              {senderRole}
            </span>
          )}
        </div>
      )}

      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
        isMine
          ? 'bg-brand-dark text-white rounded-ee-xs'
          : 'bg-white border border-gray-200 text-gray-800 rounded-es-xs'
      }`}>
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>

        {/* Attachment Display */}
        {msg.file_url && (
          <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 border ${
            isMine ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'
          }`}>
            <FileText size={18} className={isMine ? 'text-white' : 'text-brand-dark'} />
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold truncate ${isMine ? 'text-white' : 'text-gray-900'}`}>
                {msg.file_name || 'document.pdf'}
              </p>
              <p className={`text-[8px] uppercase font-black opacity-60 ${isMine ? 'text-white' : 'text-gray-400'}`}>
                {msg.file_type || 'File'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-1 mt-1 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
        <span className="text-[10px] text-gray-400 font-medium">
          {formatTime(msg.created_at, isAr)}
        </span>
        {isMine && <CheckCheck size={12} className="text-brand-dark/70" />}
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

  const [activeTab, setActiveTab] = useState<'client' | 'team'>('team');
  const [clientConversations, setClientConversations] = useState<Conversation[]>([]);
  const [teamConversations, setTeamConversations] = useState<Conversation[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, { name: string; role: string; email: string }>>(new Map());
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileConvOpen, setIsMobileConvOpen] = useState(false);
  const [isGeneralReadonly, setIsGeneralReadonly] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedConvRef = useRef<Conversation | null>(null);

  // Keep ref synchronized with current selected conversation
  useEffect(() => {
    selectedConvRef.current = selectedConv;
  }, [selectedConv]);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Supabase Realtime Presence Tracking (Online / Offline) ───────────────
  useEffect(() => {
    if (!user?.id) return;

    const presenceRoom = supabase.channel('online-staff-presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceRoom
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRoom.presenceState();
        const activeSet = new Set<string>();
        Object.keys(state).forEach(k => {
          activeSet.add(k);
          const entries = state[k] as any[];
          entries?.forEach(e => {
            if (e?.user_id) activeSet.add(e.user_id);
          });
        });
        setOnlineUsers(activeSet);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set(prev).add(key));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceRoom.track({
            user_id: user.id,
            online_at: new Date().toISOString()
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceRoom);
    };
  }, [user?.id]);

  // ── Load conversations & profiles ────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const loadConversations = async () => {
      setLoadingConversations(true);

      if (role === 'client') {
        const supportConv: Conversation = {
          id: user?.id || 'client',
          company_name: isAr ? 'فريق الدعم المالي والمحاسبي' : 'Maisarah Support Team',
          type: 'client'
        };
        if (isMounted) {
          setClientConversations([supportConv]);
          setSelectedConv(supportConv);
          setLoadingConversations(false);
        }
        return;
      }

      try {
        // 1. Fetch real Clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, company_name, cr_number, email')
          .order('company_name');

        const cConvs: Conversation[] = (clientsData || []).map(c => ({
          id: c.id,
          company_name: c.company_name,
          type: 'client' as const,
          lastMessage: c.cr_number ? `CR: ${c.cr_number}` : (c.email || (isAr ? 'مراسلة العميل' : 'Client Channel')),
          lastTime: '',
          unread: 0,
        }));

        // 2. Fetch real Team Members (Everyone from profiles)
        const { data: teamData, error: teamErr } = await supabase
          .from('profiles')
          .select('id, email, full_name, role, department_id, avatar_url')
          .neq('role', 'client')
          .neq('id', user?.id || '');

        if (teamErr) console.warn('Error loading team profiles:', teamErr.message);

        // Build staff directory map
        const pMap = new Map<string, { name: string; role: string; email: string }>();
        const tConvs: Conversation[] = (teamData || []).map(t => {
          const { displayName, displayRole } = formatStaffProfile(t, isAr);
          pMap.set(t.id, { name: displayName, role: displayRole, email: t.email || '' });

          return {
            id: t.id,
            name: displayName,
            role: displayRole,
            email: t.email,
            department_id: t.department_id,
            type: 'team' as const,
            lastMessage: displayRole,
            lastTime: '',
            unread: 0,
          };
        });

        // Add "General Channel" for the whole team
        const generalChannel: Conversation = {
          id: 'team-general',
          name: isAr ? 'القناة العامة للفريق' : 'General Team Channel',
          role: isAr ? 'محادثة جماعية لكافة الموظفين' : 'All-Hands Company Chat',
          type: 'team',
          lastMessage: isAr ? 'محادثة وإعلانات الفريق' : 'Group announcements & chat',
          lastTime: '',
          unread: 0
        };

        // 3. Fetch latest messages to populate previews in sidebar
        const { data: recentMsgs } = await supabase
          .from('messages')
          .select('id, content, sender_id, receiver_id, client_id, team_channel, created_at')
          .order('created_at', { ascending: false })
          .limit(300);

        if (recentMsgs && recentMsgs.length > 0) {
          const generalLatest = recentMsgs.find(m => m.team_channel === 'team-general');
          if (generalLatest) {
            generalChannel.lastMessage = generalLatest.content;
            generalChannel.lastTime = formatTime(generalLatest.created_at, isAr);
          }

          tConvs.forEach(conv => {
            const partnerId = conv.id;
            const myId = user?.id;
            const latest = recentMsgs.find(m =>
              (m.sender_id === myId && (m.team_channel === partnerId || m.receiver_id === partnerId)) ||
              (m.sender_id === partnerId && (m.team_channel === myId || m.receiver_id === myId))
            );
            if (latest) {
              conv.lastMessage = latest.content;
              conv.lastTime = formatTime(latest.created_at, isAr);
            }
          });

          cConvs.forEach(conv => {
            const latest = recentMsgs.find(m => m.client_id === conv.id);
            if (latest) {
              conv.lastMessage = latest.content;
              conv.lastTime = formatTime(latest.created_at, isAr);
            }
          });
        }

        const allTeam = [generalChannel, ...tConvs];

        if (isMounted) {
          setProfilesMap(pMap);
          setClientConversations(cConvs);
          setTeamConversations(allTeam);

          // Select first item if not already selected
          if (!selectedConv) {
            setSelectedConv(generalChannel);
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    };

    loadConversations();

    // Load Channel Settings (Read-only status)
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('channel_settings')
          .select('*')
          .eq('channel_id', 'team-general')
          .maybeSingle();
        if (data && isMounted) setIsGeneralReadonly(Boolean(data.is_readonly));
      } catch {
        // ignore
      }
    };
    loadSettings();

    // Realtime Channel Settings Listener
    const settingsChannel = supabase
      .channel('public:channel_settings')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'channel_settings',
        filter: 'channel_id=eq.team-general'
      }, (payload) => {
        if (isMounted) setIsGeneralReadonly(payload.new.is_readonly);
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(settingsChannel);
    };
  }, [role, user?.id, isAr]);

  // ── Load messages for active conversation ────────────────────────────────
  const loadMessages = useCallback(async (conv: Conversation) => {
    if (!conv) return;
    setLoadingMessages(true);

    try {
      if (conv.type === 'client') {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('client_id', conv.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } else if (conv.id === 'team-general') {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('team_channel', 'team-general')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } else {
        // 1-on-1 Direct Chat between current user and staff member
        const myId = user?.id;
        const partnerId = conv.id;

        if (myId && partnerId) {
          const filterQuery = `and(sender_id.eq.${myId},team_channel.eq.${partnerId}),and(sender_id.eq.${partnerId},team_channel.eq.${myId}),and(sender_id.eq.${myId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${myId})`;

          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(filterQuery)
            .order('created_at', { ascending: true });

          if (error) throw error;
          setMessages(data || []);
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.warn('loadMessages fetch message:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv);
    }
  }, [selectedConv, loadMessages]);

  // ── Global Realtime Messages Listener ─────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('global_chat_stream')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (!newMsg) return;

        const currentConv = selectedConvRef.current;
        if (!currentConv) return;

        let isMatch = false;

        if (currentConv.id === 'team-general') {
          if (newMsg.team_channel === 'team-general' || (!newMsg.receiver_id && !newMsg.client_id)) {
            isMatch = true;
          }
        } else if (currentConv.type === 'client') {
          if (newMsg.client_id === currentConv.id) {
            isMatch = true;
          }
        } else if (currentConv.type === 'team') {
          const partnerId = currentConv.id;
          const myId = user?.id;
          if (
            (newMsg.sender_id === partnerId && (newMsg.team_channel === myId || newMsg.receiver_id === myId)) ||
            (newMsg.sender_id === myId && (newMsg.team_channel === partnerId || newMsg.receiver_id === partnerId))
          ) {
            isMatch = true;
          }
        }

        if (isMatch) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            // Clean out matching pending optimistic item
            const filtered = prev.filter(m => !(m.id.startsWith('opt-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id));
            return [...filtered, newMsg];
          });
        }

        // Update sidebar preview in realtime
        const timeStr = formatTime(newMsg.created_at, isAr);
        if (newMsg.team_channel === 'team-general') {
          setTeamConversations(prev => prev.map(c => c.id === 'team-general' ? { ...c, lastMessage: newMsg.content, lastTime: timeStr } : c));
        } else if (newMsg.client_id) {
          setClientConversations(prev => prev.map(c => c.id === newMsg.client_id ? { ...c, lastMessage: newMsg.content, lastTime: timeStr } : c));
        } else {
          const myId = user?.id;
          const partnerId = newMsg.sender_id === myId ? (newMsg.receiver_id || newMsg.team_channel) : newMsg.sender_id;
          if (partnerId) {
            setTeamConversations(prev => prev.map(c => c.id === partnerId ? { ...c, lastMessage: newMsg.content, lastTime: timeStr } : c));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !user?.id) return;

    const draft = newMessage.trim();
    setNewMessage('');

    const optId = `opt-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optId,
      content: draft,
      sender_id: user.id,
      is_from_client: role === 'client',
      created_at: new Date().toISOString(),
      client_id: selectedConv.type === 'client' ? selectedConv.id : undefined,
      team_channel: selectedConv.type === 'team' ? selectedConv.id : undefined,
      receiver_id: selectedConv.type === 'team' && selectedConv.id !== 'team-general' ? selectedConv.id : undefined,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    inputRef.current?.focus();

    // Optimistically update conversation snippet in sidebar
    const optTimeStr = formatTime(new Date().toISOString(), isAr);
    if (selectedConv.id === 'team-general') {
      setTeamConversations(prev => prev.map(c => c.id === 'team-general' ? { ...c, lastMessage: draft, lastTime: optTimeStr } : c));
    } else if (selectedConv.type === 'client') {
      setClientConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, lastMessage: draft, lastTime: optTimeStr } : c));
    } else {
      setTeamConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, lastMessage: draft, lastTime: optTimeStr } : c));
    }

    const payload: any = {
      content: draft,
      sender_id: user.id,
      is_from_client: role === 'client',
    };

    if (selectedConv.type === 'client') {
      payload.client_id = selectedConv.id;
    } else if (selectedConv.id === 'team-general') {
      payload.team_channel = 'team-general';
    } else {
      // Direct 1-on-1 team chat: set both receiver_id and team_channel
      payload.receiver_id = selectedConv.id;
      payload.team_channel = selectedConv.id;
    }

    try {
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert([payload])
        .select('*')
        .single();

      if (error) throw error;
      if (inserted) {
        setMessages(prev => prev.map(m => m.id === optId ? inserted : m));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Revert optimistic
      setMessages(prev => prev.filter(m => m.id !== optId));
      setNewMessage(draft);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate instant safe file attachment message
    const fileName = file.name;
    const isImg = file.type.startsWith('image/');
    setNewMessage(prev => prev ? `${prev} [Attachment: ${fileName}]` : `[Attachment: ${fileName}]`);
  };

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    const targetList = activeTab === 'client' ? clientConversations : teamConversations;
    if (!searchTerm.trim()) return targetList;
    const query = searchTerm.toLowerCase();
    return targetList.filter(c =>
      (c.company_name && c.company_name.toLowerCase().includes(query)) ||
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.role && c.role.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [activeTab, clientConversations, teamConversations, searchTerm]);

  // Is selected user currently online?
  const isSelectedConvOnline = useMemo(() => {
    if (!selectedConv) return false;
    if (selectedConv.id === 'team-general') return true;
    return onlineUsers.has(selectedConv.id);
  }, [selectedConv, onlineUsers]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-white" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Sidebar (Conversations List) ────────────────────────── */}
        <div className={`w-full md:w-80 lg:w-96 border-e border-gray-100 flex flex-col bg-white flex-shrink-0 z-10 ${
          isMobileConvOpen ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <MessageCircle size={22} className="text-brand-dark" />
              <h2 className="font-black text-gray-900 tracking-tight text-base">
                {isAr ? 'المراسلات والتواصل' : 'MESSAGES'}
              </h2>
            </div>
            <button
              onClick={() => {
                if (selectedConv) loadMessages(selectedConv);
              }}
              className="p-1.5 text-gray-400 hover:text-brand-dark hover:bg-gray-100 rounded-lg transition cursor-pointer"
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Role Filter Tabs (Clients / Team) */}
          {role !== 'client' && (
            <div className="p-3 bg-gray-50/30 border-b border-gray-100">
              <div className="grid grid-cols-2 p-1 bg-gray-200/50 rounded-xl gap-1">
                <button
                  onClick={() => setActiveTab('client')}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'client'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Building2 size={14} />
                  <span>{isAr ? 'العملاء' : 'CLIENTS'}</span>
                  {clientConversations.length > 0 && (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
                      {clientConversations.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('team')}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'team'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Users size={14} />
                  <span>{isAr ? 'فريق العمل' : 'TEAM'}</span>
                  {teamConversations.length > 0 && (
                    <span className="text-[10px] bg-brand-dark/10 text-brand-dark px-1.5 py-0.2 rounded-full font-bold">
                      {teamConversations.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search size={15} className={`absolute ${isAr ? 'right-3' : 'left-3'} top-3 text-gray-400`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث عن محادثة أو موظف...' : 'Search...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`w-full py-2 ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-dark focus:bg-white transition-all`}
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
            {loadingConversations ? (
              <div className="p-8 text-center space-y-2">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-dark mx-auto" />
                <p className="text-xs text-gray-400 font-bold">{isAr ? 'جاري تحميل المحادثات...' : 'Loading conversations...'}</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <UserCircle2 size={36} className="mx-auto opacity-30 text-gray-400" />
                <p className="text-xs font-bold">{isAr ? 'لا توجد محادثات مطابقة' : 'No conversations found'}</p>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = selectedConv?.id === conv.id;
                const isOnline = conv.id === 'team-general' ? true : onlineUsers.has(conv.id);
                return (
                  <ConvItem
                    key={conv.id}
                    conv={conv}
                    isSelected={isSelected}
                    isAr={isAr}
                    isOnline={isOnline}
                    onClick={() => {
                      setSelectedConv(conv);
                      setIsMobileConvOpen(true);
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Chat Area ─────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col bg-white overflow-hidden ${
          !isMobileConvOpen ? 'hidden md:flex' : 'flex'
        }`}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-gray-50/30">
              <div className="w-16 h-16 rounded-full bg-brand-dark/5 flex items-center justify-center text-brand-dark mb-4">
                <MessageCircle size={32} />
              </div>
              <h3 className="font-black text-gray-800 text-sm mb-1">
                {isAr ? 'حدد محادثة للبدء' : 'Select a conversation to start messaging'}
              </h3>
              <p className="text-xs text-gray-400 max-w-sm">
                {isAr ? 'تواصل فورياً وبشكل مباشر مع فريق العمل والعملاء في بيئة آمنة ومتوافقة.' : 'Chat in real-time with your team members and registered clients safely.'}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Top Header */}
              <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-white shadow-xs z-10 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setIsMobileConvOpen(false)}
                    className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl"
                  >
                    <ChevronLeft size={20} className={isAr ? 'rotate-180' : ''} />
                  </button>

                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    selectedConv.id === 'team-general'
                      ? 'bg-gradient-to-tr from-brand-dark to-red-600 text-white'
                      : (selectedConv.type === 'team' ? 'bg-blue-100 text-blue-700 font-black' : 'bg-brand-dark/10 text-brand-dark font-black')
                  }`}>
                    {selectedConv.id === 'team-general' ? <Users size={20} /> : (selectedConv.company_name || selectedConv.name || 'C').charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 truncate text-sm sm:text-base">
                      {selectedConv.company_name || selectedConv.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedConv.id === 'team-general' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">
                            {onlineUsers.size} {isAr ? 'متصلون الآن' : 'Members Online'}
                          </span>
                        </div>
                      ) : isSelectedConvOnline ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">
                            {t('messaging.online')}
                          </span>
                          {selectedConv.role && (
                            <span className="text-[10px] text-gray-400 font-bold hidden sm:inline">
                              • {selectedConv.role}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-gray-300 rounded-full" />
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider">
                            {isAr ? 'غير متصل' : 'Offline'}
                          </span>
                          {selectedConv.role && (
                            <span className="text-[10px] text-gray-400 font-bold hidden sm:inline">
                              • {selectedConv.role}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Header Action / Role Badge */}
                <div className="flex items-center gap-2">
                  {role === 'manager' && selectedConv.id === 'team-general' && (
                    <button
                      onClick={async () => {
                        const newState = !isGeneralReadonly;
                        setIsGeneralReadonly(newState);
                        try {
                          await supabase
                            .from('channel_settings')
                            .upsert([{ channel_id: 'team-general', is_readonly: newState }]);
                        } catch (e) {
                          console.warn('Channel settings update notice:', e);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition ${
                        isGeneralReadonly
                          ? 'bg-red-50 border-red-200 text-red-600'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      }`}
                    >
                      {isGeneralReadonly ? <Lock size={12} /> : <Unlock size={12} />}
                      <span>{isGeneralReadonly ? (isAr ? 'وضع الإعلانات' : 'Read Only') : (isAr ? 'محادثة مفتوحة' : 'Open Chat')}</span>
                    </button>
                  )}

                  <div className="hidden sm:flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-500">
                    {selectedConv.type === 'team' ? <Users size={12} /> : <Building2 size={12} />}
                    <span>{selectedConv.type === 'team' ? (isAr ? 'فريق' : 'Team') : (isAr ? 'عميل' : 'Client')}</span>
                  </div>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex flex-col items-center justify-center p-12 space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
                    <p className="text-xs text-gray-400 font-bold">{isAr ? 'جاري تحميل الرسائل...' : 'Loading messages...'}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 mb-3">
                      <MessageCircle size={32} />
                    </div>
                    <p className="font-black text-gray-700 text-xs uppercase tracking-wider mb-1">
                      {t('messaging.noMessagesYet')}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                      {isAr
                        ? `ابدأ المحادثة الآن مع ${selectedConv.company_name || selectedConv.name}`
                        : `Start the conversation with ${selectedConv.company_name || selectedConv.name}`}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === user?.id;
                    const senderProfile = profilesMap.get(msg.sender_id);
                    return (
                      <MsgBubble
                        key={msg.id || idx}
                        msg={msg}
                        isMine={isMine}
                        senderName={senderProfile?.name}
                        senderRole={senderProfile?.role}
                        isAr={isAr}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                {isGeneralReadonly && selectedConv.id === 'team-general' && role !== 'manager' ? (
                  <div className="py-3 px-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center gap-2.5 text-red-600">
                    <Lock size={16} />
                    <span className="text-xs font-black">
                      {isAr ? 'القناة في وضع القراءة فقط حالياً - الإرسال متاح للمدير فقط' : 'This channel is currently in read-only announcement mode'}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-gray-400 hover:text-brand-dark bg-gray-50 hover:bg-gray-100 rounded-2xl transition cursor-pointer"
                      title={isAr ? 'إرفاق ملف' : 'Attach File'}
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={
                        isAr
                          ? `اكتب رسالة إلى ${selectedConv.company_name || selectedConv.name}...`
                          : `Type a message to ${selectedConv.company_name || selectedConv.name}...`
                      }
                      className="flex-1 py-3 px-4 sm:px-5 bg-gray-50 border border-gray-200 rounded-2xl text-xs sm:text-sm outline-none focus:border-brand-dark focus:bg-white focus:ring-3 focus:ring-brand-dark/5 transition"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 sm:w-12 sm:h-12 bg-brand-dark hover:bg-red-800 disabled:opacity-30 disabled:grayscale text-white rounded-2xl flex items-center justify-center shadow-md transition cursor-pointer flex-shrink-0"
                    >
                      <Send size={18} className={isAr ? 'rotate-180' : ''} />
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
