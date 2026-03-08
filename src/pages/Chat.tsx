import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Send, Trash2, MessageCircle, Loader2, MoreVertical, Pencil, X, Users, Reply, SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as dataService from '@/lib/dataService';
import { syncUnsyncedChatMessages } from '@/lib/dataService';
import { getUnsyncedChatMessages } from '@/lib/storage';
import type { ChatMessage, ChatActiveUser, ChatReaction } from '@/types';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const SWIPE_THRESHOLD = -60;

// Typing indicator bubble with bouncing dots animation
function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label = names.length === 1
    ? names[0]
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names[0]} and ${names.length - 1} others`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-end gap-2 mb-3"
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {names[0]?.[0]?.toUpperCase() || '?'}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-xs text-muted-foreground mb-1 px-1">{label}</p>
        <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_infinite]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]" />
        </div>
      </div>
    </motion.div>
  );
}

// Emoji reaction picker popup
const ReactionPicker = forwardRef<HTMLDivElement, { onSelect: (emoji: string) => void; isOwn: boolean }>(
  ({ onSelect, isOwn }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          'absolute bottom-full mb-1 flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-20',
          isOwn ? 'right-0' : 'left-0'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {REACTION_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
            className="hover:scale-125 transition-transform text-lg px-0.5 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </motion.div>
    );
  }
);
ReactionPicker.displayName = 'ReactionPicker';

// Grouped reactions display below a message
function ReactionsDisplay({ reactions, userId, onToggle }: { reactions: ChatReaction[]; userId: string; onToggle: (emoji: string) => void }) {
  if (!reactions || reactions.length === 0) return null;

  const grouped: Record<string, { count: number; users: string[]; hasOwn: boolean }> = {};
  for (const r of reactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], hasOwn: false };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.userName);
    if (r.userId === userId) grouped[r.emoji].hasOwn = true;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
          title={data.users.join(', ')}
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border cursor-pointer transition-colors',
            data.hasOwn
              ? 'bg-primary/15 border-primary/30 text-foreground'
              : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <span>{emoji}</span>
          {data.count > 1 && <span className="text-[10px] font-medium">{data.count}</span>}
        </button>
      ))}
    </div>
  );
}

// Swipeable message wrapper for mobile reply
function SwipeableMessage({ children, onSwipeReply, isOwn }: { children: React.ReactNode; onSwipeReply: () => void; isOwn: boolean }) {
  const x = useMotionValue(0);
  const replyIconOpacity = useTransform(x, [-80, -40, 0], [1, 0.5, 0]);
  const replyIconScale = useTransform(x, [-80, -40, 0], [1, 0.6, 0.3]);
  const [swiped, setSwiped] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < SWIPE_THRESHOLD && !swiped) {
      setSwiped(true);
      onSwipeReply();
      setTimeout(() => setSwiped(false), 300);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Reply icon revealed on swipe */}
      <motion.div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{ opacity: replyIconOpacity, scale: replyIconScale }}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Reply className="h-4 w-4 text-primary" />
        </div>
      </motion.div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [activeUsers, setActiveUsers] = useState<ChatActiveUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<ChatActiveUser[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; message: string } | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef(0);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!user?.messId) return;
    try {
      const msgs = await dataService.getChatMessagesByMessId(user.messId);
      setMessages(msgs);
      if (msgs.length > prevMessageCountRef.current) {
        setTimeout(scrollToBottom, 100);
      }
      prevMessageCountRef.current = msgs.length;
    } catch (e) {
      console.error('Failed to load chat:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.messId, scrollToBottom]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    const sendHeartbeat = async () => {
      const result = await dataService.chatHeartbeat();
      setActiveUsers(result.activeUsers);
      setTypingUsers(result.typingUsers);
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);
    return () => {
      clearInterval(interval);
      dataService.chatLeave();
    };
  }, []);

  useEffect(() => {
    const doSync = async () => {
      try {
        const unsyncedMessages = getUnsyncedChatMessages();
        if (unsyncedMessages.length > 0) {
          await syncUnsyncedChatMessages();
          await loadMessages();
        }
      } catch {}
    };
    doSync();
    const interval = setInterval(doSync, 15000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Close reaction picker on outside click
  useEffect(() => {
    if (!reactionPickerMsgId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-reaction-picker]')) {
        setReactionPickerMsgId(null);
      }
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [reactionPickerMsgId]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      dataService.chatTyping();
    }
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);
    try {
      const activeIds = activeUsers.map(u => u.userId);
      await dataService.sendChatMessage(
        {
          messId: user.messId || '',
          userId: user.id,
          senderName: user.fullName || 'Unknown',
          message: newMessage.trim(),
        },
        activeIds,
        replyTo,
      );
      setNewMessage('');
      setReplyTo(null);
      await loadMessages();
      setTimeout(scrollToBottom, 150);
      inputRef.current?.focus();
    } catch {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyTo({ id: msg.id, senderName: msg.senderName, message: msg.message });
    inputRef.current?.focus();
  };

  const handleEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditText(msg.message);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    if (!editingId || !editText.trim()) return;
    try {
      await dataService.editChatMessage(editingId, editText.trim());
      setEditingId(null);
      setEditText('');
      await loadMessages();
    } catch {
      toast({ title: 'Error', description: 'Failed to edit message', variant: 'destructive' });
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
    if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dataService.deleteChatMessageById(deleteTarget);
      setMessages(prev => prev.filter(m => m.id !== deleteTarget));
    } catch {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!user) return;
    setReactionPickerMsgId(null);

    // Optimistic update
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const reactions = [...(msg.reactions || [])];
      const existingIdx = reactions.findIndex(r => r.userId === user.id && r.emoji === emoji);
      if (existingIdx >= 0) {
        reactions.splice(existingIdx, 1);
      } else {
        reactions.push({ emoji, userId: user.id, userName: user.fullName || 'Unknown' });
      }
      return { ...msg, reactions };
    }));

    try {
      await dataService.reactChatMessage(msgId, emoji);
      // Reload to get server state
      await loadMessages();
    } catch {
      toast({ title: 'Error', description: 'Failed to react', variant: 'destructive' });
      await loadMessages(); // Revert on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) sendTyping();
  };

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const d = format(new Date(msg.createdAt), 'MMM d, yyyy');
    if (d !== currentDate) {
      currentDate = d;
      groupedMessages.push({ date: d, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  const MessageMenu = ({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) => {
    const canEdit = isOwn;
    const canDelete = isOwn || user?.role === 'manager';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-36">
          <DropdownMenuItem onClick={() => handleReply(msg)}>
            <Reply className="h-3.5 w-3.5 mr-2" />
            Reply
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setReactionPickerMsgId(prev => prev === msg.id ? null : msg.id);
          }}>
            <SmilePlus className="h-3.5 w-3.5 mr-2" />
            React
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem onClick={() => handleEdit(msg)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Edit
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onClick={() => setDeleteTarget(msg.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMessage = (msg: ChatMessage) => {
    const isOwn = msg.userId === user?.id;
    const isEditing = editingId === msg.id;
    const showReactionPicker = reactionPickerMsgId === msg.id;

    const messageContent = (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={cn('flex gap-2 mb-3 group px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}
      >
        {!isOwn && (
          <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {getInitials(msg.senderName)}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={cn('max-w-[75%] min-w-[120px] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
          {!isOwn && (
            <p className="text-xs font-medium text-muted-foreground mb-1 px-1">{msg.senderName}</p>
          )}

          {/* Reply label above the bubble (WhatsApp style) */}
          {msg.replyTo && !isEditing && (
            <div className={cn('flex items-center gap-1 mb-0.5 px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
              <Reply className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {isOwn ? 'You' : msg.senderName} replied to {msg.replyTo.senderName === user?.fullName ? 'you' : msg.replyTo.senderName}
              </span>
            </div>
          )}

          <div className="flex items-start gap-1 relative">
            {isOwn && !isEditing && <MessageMenu msg={msg} isOwn={isOwn} />}

            <div className="relative" data-reaction-picker={showReactionPicker ? 'true' : undefined}>
              {/* Reaction picker */}
              <AnimatePresence>
                {showReactionPicker && (
                  <ReactionPicker
                    isOwn={isOwn}
                    onSelect={(emoji) => handleReact(msg.id, emoji)}
                  />
                )}
              </AnimatePresence>

              <div
                className={cn(
                  'rounded-2xl px-4 py-2',
                  isOwn
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                )}
                onDoubleClick={() => setReactionPickerMsgId(prev => prev === msg.id ? null : msg.id)}
              >
                {/* Reply quote inside bubble */}
                {msg.replyTo && !isEditing && (
                  <div className={cn(
                    'mb-2 pl-3 py-1.5 rounded-lg text-xs border-l-2',
                    isOwn
                      ? 'border-primary-foreground/40 bg-primary-foreground/10'
                      : 'border-primary/40 bg-primary/5'
                  )}>
                    <p className={cn('font-semibold text-[11px]', isOwn ? 'text-primary-foreground/80' : 'text-primary')}>
                      {msg.replyTo.senderName}
                    </p>
                    <p className={cn('line-clamp-1', isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                      {msg.replyTo.message}
                    </p>
                  </div>
                )}

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={editInputRef}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      maxLength={2000}
                      className="h-7 text-sm bg-background text-foreground border-none rounded-lg min-w-[150px]"
                    />
                    <Button size="icon" className="h-6 w-6 flex-shrink-0" onClick={handleEditSave}>
                      <Send className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 flex-shrink-0" onClick={() => { setEditingId(null); setEditText(''); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                      <span className={cn('text-[10px]', isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                        {format(new Date(msg.createdAt), 'h:mm a')}
                        {msg.editedAt && ' • edited'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Reactions display below the bubble */}
              <ReactionsDisplay
                reactions={msg.reactions || []}
                userId={user?.id || ''}
                onToggle={(emoji) => handleReact(msg.id, emoji)}
              />
            </div>

            {!isOwn && !isEditing && <MessageMenu msg={msg} isOwn={isOwn} />}
          </div>
        </div>
      </motion.div>
    );

    // Wrap in swipeable for mobile
    return (
      <SwipeableMessage key={msg.id} isOwn={isOwn} onSwipeReply={() => handleReply(msg)}>
        {messageContent}
      </SwipeableMessage>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Mess Chat</h1>
              <p className="text-xs text-muted-foreground">
                {messages.length} messages
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeUsers.length > 0 && (
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full" title={activeUsers.map(u => u.name).join(', ')}>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[hsl(var(--success))]"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--success))]"></span>
                </span>
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{activeUsers.length}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">online</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1 py-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <>
              {groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {group.date}
                    </span>
                  </div>
                  <AnimatePresence>
                    {group.messages.map(renderMessage)}
                  </AnimatePresence>
                </div>
              ))}

              <AnimatePresence>
                {typingUsers.length > 0 && (
                  <TypingIndicator names={typingUsers.map(u => u.name)} />
                )}
              </AnimatePresence>

              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Reply preview bar */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/50">
                <Reply className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setReplyTo(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="border-t border-border pt-3 mt-auto">
          <div className="flex gap-2 items-end">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              className="flex-1 rounded-xl"
              disabled={sending}
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="rounded-xl h-10 w-10 flex-shrink-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {newMessage.length}/2000
          </p>
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Message"
        description="Are you sure you want to delete this message? This cannot be undone."
      />
    </DashboardLayout>
  );
}
