import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Send, Trash2, MessageCircle, Loader2, MoreVertical, Pencil, X, Users, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as dataService from '@/lib/dataService';
import { syncUnsyncedChatMessages } from '@/lib/dataService';
import { getUnsyncedChatMessages } from '@/lib/storage';
import type { ChatMessage, ChatActiveUser } from '@/types';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

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

  // Poll messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Heartbeat every 5 seconds for active presence + typing
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

  // Auto-sync when backend becomes available (silent, automatic)
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

  // Send typing indicator (debounced - max once per 2 seconds)
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
    setReplyTo({
      id: msg.id,
      senderName: msg.senderName,
      message: msg.message,
    });
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
    // Always show menu (at minimum for Reply)

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
        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="w-32">
          <DropdownMenuItem onClick={() => handleReply(msg)}>
            <Reply className="h-3.5 w-3.5 mr-2" />
            Reply
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
                    {group.messages.map((msg) => {
                      const isOwn = msg.userId === user?.id;
                      const isEditing = editingId === msg.id;

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn('flex gap-2 mb-3 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
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
                            <div className="flex items-start gap-1">
                              {/* Three-dot menu on left for own messages */}
                              {isOwn && !isEditing && <MessageMenu msg={msg} isOwn={isOwn} />}

                              <div
                                className={cn(
                                  'rounded-2xl px-4 py-2 relative',
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                    : 'bg-muted text-foreground rounded-tl-sm'
                                )}
                              >
                                {/* Reply quote */}
                                {msg.replyTo && !isEditing && (
                                  <div className={cn(
                                    'mb-2 pl-3 py-1 rounded text-xs border-l-2',
                                    isOwn
                                      ? 'border-primary-foreground/40 bg-primary-foreground/10'
                                      : 'border-primary/40 bg-primary/5'
                                  )}>
                                    <p className={cn('font-semibold', isOwn ? 'text-primary-foreground/80' : 'text-primary')}>
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

                              {/* Three-dot menu on right for other's messages */}
                              {!isOwn && !isEditing && <MessageMenu msg={msg} isOwn={isOwn} />}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}

              {/* Typing indicator */}
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
