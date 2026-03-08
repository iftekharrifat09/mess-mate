import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import * as dataService from '@/lib/dataService';
import { getNotificationSoundEnabled } from '@/lib/preferences';
import { getBrowserNotificationsEnabled, requestBrowserNotificationPermission } from '@/lib/browserNotifications';
import type { Notification as AppNotification } from '@/types';
import { format } from 'date-fns';
import { Trash2, Check, CheckCheck } from 'lucide-react';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { toast as showToast } from '@/hooks/use-toast';

const NOTIF_ICONS: Record<string, string> = {
  meal: '🍽️',
  deposit: '💰',
  cost: '💳',
  notice: '📢',
  bazar: '🛒',
  mess_update: '🏠',
  join_request: '👋',
};

function getNotifIcon(type: AppNotification['type']) {
  return NOTIF_ICONS[type] || '🔔';
}

// Request browser notification permission
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Send a browser push notification
function sendBrowserNotification(title: string, body: string, icon?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const notif = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: `mess-notif-${Date.now()}`,
      silent: true, // We handle sound ourselves
    });
    // Auto-close after 5 seconds
    setTimeout(() => notif.close(), 5000);
    // Focus the tab when clicked
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch (e) {
    console.warn('Browser notification failed:', e);
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { playNotificationSound, primeNotificationSound } = useNotificationSound();
  const prevUnseenCountRef = useRef<number>(0);
  const prevNotifIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const notifs = await dataService.getNotificationsByUserId(user.id);
      setNotifications(notifs);

      const count = await dataService.getUnseenNotificationsCount(user.id);

      // Detect truly new notifications (not just unseen count change)
      if (hasLoadedOnceRef.current && count > prevUnseenCountRef.current) {
        // Find new notification items
        const prevIds = prevNotifIdsRef.current;
        const newNotifs = notifs.filter(n => !n.seen && !prevIds.has(n.id));

        // Play sound
        if (getNotificationSoundEnabled(user.id)) {
          playNotificationSound(user.id);
        }

        // Send browser push notifications + in-app toasts for each new notification
        for (const n of newNotifs) {
          // Browser notification (if enabled and permission granted)
          if (getBrowserNotificationsEnabled(user.id)) {
            sendBrowserNotification(
              n.title,
              n.message,
            );
          }

          // In-app toast
          showToast({
            title: `${getNotifIcon(n.type)} ${n.title}`,
            description: n.message,
          });
        }
      }

      // Update tracked IDs
      prevNotifIdsRef.current = new Set(notifs.map(n => n.id));
      prevUnseenCountRef.current = count;
      hasLoadedOnceRef.current = true;
      setUnseenCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user, playNotificationSound]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, loadNotifications]);

  // Poll for new notifications every 10 seconds
  useEffect(() => {
    if (!user) return;
    
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [user, loadNotifications]);

  const handleMarkAsSeen = async (id: string) => {
    try {
      await dataService.markNotificationAsSeen(id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as seen:', error);
    }
  };

  const handleMarkAllAsSeen = async () => {
    if (!user) return;
    try {
      await dataService.markAllNotificationsAsSeen(user.id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking all notifications as seen:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await dataService.deleteNotification(id);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    try {
      await dataService.deleteAllNotifications(user.id);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => {
            if (user && getNotificationSoundEnabled(user.id)) {
              void primeNotificationSound();
            }
          }}
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unseenCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium"
              >
                {unseenCount > 9 ? '9+' : unseenCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex gap-1">
            {unseenCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsSeen}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleDeleteAll} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-3 hover:bg-muted/50 transition-colors ${!notification.seen ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex gap-2">
                      <span className="text-lg">{getNotifIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        {!notification.seen && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMarkAsSeen(notification.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(notification.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
