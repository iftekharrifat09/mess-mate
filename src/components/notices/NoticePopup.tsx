import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getLatestNotice } from '@/lib/dataService';
import { Notice } from '@/types';
import { format } from 'date-fns';
import { Megaphone } from 'lucide-react';

const LAST_SEEN_NOTICE_KEY = 'mess_manager_last_seen_notice';
const SESSION_NOTICE_SHOWN_KEY = 'mess_manager_notice_shown_session';
export default function NoticePopup() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user?.messId || !user?.id) return;

      try {
        const latestNotice = await getLatestNotice(user.messId);
        
        // Handle null, undefined, or empty notice
        if (cancelled || !latestNotice || !latestNotice.id) {
          return;
        }

        // Always show the latest notice once per login/session
        const sessionKey = `${SESSION_NOTICE_SHOWN_KEY}_${user.id}`;
        const alreadyShownThisSession = sessionStorage.getItem(sessionKey);

        if (!alreadyShownThisSession) {
          setNotice(latestNotice);
          setIsOpen(true);
        }
      } catch (error) {
        // Silently handle errors - don't crash if notices fail to load
        console.warn('Failed to load notice:', error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.messId, user?.id]);

  const handleClose = () => {
    if (notice && user) {
      // Mark shown for this login/session
      sessionStorage.setItem(`${SESSION_NOTICE_SHOWN_KEY}_${user.id}`, notice.id);

      // Keep last-seen tracking (harmless, but useful if you want "only new" behavior later)
      localStorage.setItem(`${LAST_SEEN_NOTICE_KEY}_${user.id}`, notice.id);
      localStorage.setItem(`${LAST_SEEN_NOTICE_KEY}_time_${user.id}`, new Date().toISOString());
    }
    setIsOpen(false);
  };

  if (!notice) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="sm:max-w-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ repeat: 2, duration: 0.5 }}
                  >
                    <Megaphone className="h-5 w-5 text-primary" />
                  </motion.div>
                  {notice.title}
                </DialogTitle>
                <DialogDescription>
                  Posted {format(new Date(notice.createdAt), 'MMM d, yyyy')}
                  {notice.updatedAt && ` • Updated ${format(new Date(notice.updatedAt), 'MMM d, yyyy')}`}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg max-h-[300px] overflow-y-auto">
                <p className="text-foreground whitespace-pre-wrap">{notice.content}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleClose} className="gradient-primary">
                  Got it
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}