import { useState, useEffect, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, MessageCircle, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import * as dataService from '@/lib/dataService';
import { syncUnsyncedChatMessages } from '@/lib/dataService';
import { shouldUseBackend } from '@/lib/config';
import { getUnsyncedChatMessages } from '@/lib/storage';
import type { ChatMessage } from '@/types';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

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
      setUnsyncedCount(getUnsyncedChatMessages().length);
    } catch (e) {
      console.error('Failed to load chat:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.messId, scrollToBottom]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Poll every 3 seconds
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Auto-sync unsynced messages when backend becomes available
  useEffect(() => {
    if (!shouldUseBackend()) return;
    const unsyncedMessages = getUnsyncedChatMessages();
    if (unsyncedMessages.length > 0) {
      syncUnsyncedChatMessages().then(() => loadMessages());
    }
  }, [loadMessages]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncUnsyncedChatMessages();
      await loadMessages();
    } finally {
      setSyncing(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);
    try {
      await dataService.sendChatMessage({
        messId: user.messId || '',
        userId: user.id,
        senderName: user.fullName || 'Unknown',
        message: newMessage.trim(),
      });
      setNewMessage('');
      await loadMessages();
      setTimeout(scrollToBottom, 150);
    } catch {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await dataService.deleteChatMessageById(id);
      if (result) {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete message', variant: 'destructive' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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

  const isOffline = !shouldUseBackend();

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
                {messages.length} messages • {new Set(messages.map(m => m.userId)).size} participants
                {isOffline && <span className="text-destructive ml-1">• Offline mode</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unsyncedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || isOffline}
                className="gap-1.5 text-xs"
              >
                {syncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Sync {unsyncedCount}
              </Button>
            )}
            {isOffline && <WifiOff className="h-4 w-4 text-destructive" />}
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
                          <div className={cn('max-w-[75%] min-w-[120px]', isOwn ? 'items-end' : 'items-start')}>
                            {!isOwn && (
                              <p className="text-xs font-medium text-muted-foreground mb-1 px-1">{msg.senderName}</p>
                            )}
                            <div
                              className={cn(
                                'rounded-2xl px-4 py-2 relative',
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                  : 'bg-muted text-foreground rounded-tl-sm'
                              )}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                              <div className={cn('flex items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
                                <span className={cn('text-[10px]', isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground')}>
                                  {format(new Date(msg.createdAt), 'h:mm a')}
                                </span>
                              </div>
                            </div>
                            {(isOwn || user?.role === 'manager') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                                onClick={() => handleDelete(msg.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border pt-3 mt-2">
          <div className="flex gap-2 items-end">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
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
            {isOffline && ' • Messages will sync when online'}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
