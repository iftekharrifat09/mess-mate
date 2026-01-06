import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getNoticesByMessId, 
  createNotice, 
  updateNotice, 
  deleteNotice,
  notifyMessMembers,
} from '@/lib/storage';
import { Notice } from '@/types';
import { Megaphone, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Notices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadNotices();
  }, [user]);

  const loadNotices = () => {
    if (!user) return;
    const allNotices = getNoticesByMessId(user.messId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setNotices(allNotices);
  };

  const resetForm = () => {
    setFormData({ title: '', content: '' });
    setEditingNotice(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingNotice) {
      updateNotice(editingNotice.id, { title: formData.title, content: formData.content });
      notifyMessMembers(user.messId, user.id, {
        type: 'notice',
        title: 'Notice Updated',
        message: `"${formData.title}" has been updated`,
      });
      toast({ title: 'Notice updated' });
    } else {
      createNotice({ messId: user.messId, title: formData.title, content: formData.content });
      notifyMessMembers(user.messId, user.id, {
        type: 'notice',
        title: 'New Notice',
        message: formData.title,
      });
      toast({ title: 'Notice created' });
    }

    setIsAddDialogOpen(false);
    resetForm();
    loadNotices();
  };

  const handleEdit = (notice: Notice) => {
    setFormData({ title: notice.title, content: notice.content });
    setEditingNotice(notice);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (notice: Notice) => {
    if (!user) return;
    deleteNotice(notice.id);
    notifyMessMembers(user.messId, user.id, {
      type: 'notice',
      title: 'Notice Removed',
      message: `"${notice.title}" has been removed`,
    });
    toast({ title: 'Notice deleted' });
    loadNotices();
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notices</h1>
            <p className="text-muted-foreground">Announcements and updates</p>
          </div>
          {isManager && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Notice
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNotice ? 'Edit Notice' : 'Add Notice'}</DialogTitle>
                  <DialogDescription>
                    {editingNotice ? 'Update notice details' : 'Create a new announcement'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Notice title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Write your notice..."
                      rows={5}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-primary">
                      {editingNotice ? 'Update' : 'Create'} Notice
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {notices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notices yet.</p>
              {isManager && <p className="text-sm text-muted-foreground mt-2">Create your first notice!</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {notices.map((notice, index) => (
                <motion.div
                  key={notice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={index === 0 ? 'border-primary/50 bg-primary/5' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Megaphone className={`h-5 w-5 ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                          <CardTitle className="text-lg">{notice.title}</CardTitle>
                          {index === 0 && (
                            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">Latest</span>
                          )}
                        </div>
                        {isManager && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(notice)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(notice)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(notice.createdAt), 'MMM d, yyyy')}
                        {notice.updatedAt && ` • Updated ${format(new Date(notice.updatedAt), 'MMM d, yyyy')}`}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground whitespace-pre-wrap">{notice.content}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}