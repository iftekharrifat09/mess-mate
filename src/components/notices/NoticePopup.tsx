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
import { getLatestNotice } from '@/lib/storage';
import { Notice } from '@/types';
import { format } from 'date-fns';
import { Megaphone } from 'lucide-react';

const LAST_SEEN_NOTICE_KEY = 'mess_manager_last_seen_notice';

export default function NoticePopup() {
  const { user } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.messId) {
      const latestNotice = getLatestNotice(user.messId);
      if (latestNotice) {
        const lastSeenNoticeId = localStorage.getItem(`${LAST_SEEN_NOTICE_KEY}_${user.id}`);
        const lastSeenNoticeTime = localStorage.getItem(`${LAST_SEEN_NOTICE_KEY}_time_${user.id}`);
        
        // Show notice if it's new or updated since last seen
        const noticeTime = latestNotice.updatedAt || latestNotice.createdAt;
        if (lastSeenNoticeId !== latestNotice.id || (lastSeenNoticeTime && new Date(noticeTime) > new Date(lastSeenNoticeTime))) {
          setNotice(latestNotice);
          setIsOpen(true);
        }
      }
    }
  }, [user]);

  const handleClose = () => {
    if (notice && user) {
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
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
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