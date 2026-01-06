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
  getNotesByMessId, 
  createNote, 
  updateNote, 
  deleteNote,
} from '@/lib/storage';
import { Note } from '@/types';
import { StickyNote, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Notes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  const isManager = user?.role === 'manager';

  useEffect(() => {
    loadNotes();
  }, [user]);

  const loadNotes = () => {
    if (!user) return;
    setNotes(getNotesByMessId(user.messId));
  };

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setEditingNote(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isManager) return;

    if (editingNote) {
      updateNote(editingNote.id, { title: formData.title, description: formData.description });
      toast({ title: 'Note updated' });
    } else {
      createNote({ messId: user.messId, title: formData.title, description: formData.description });
      toast({ title: 'Note created' });
    }

    setIsAddDialogOpen(false);
    resetForm();
    loadNotes();
  };

  const handleEdit = (note: Note) => {
    setFormData({ title: note.title, description: note.description });
    setEditingNote(note);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    toast({ title: 'Note deleted' });
    loadNotes();
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
            <h1 className="text-3xl font-bold text-foreground">All Notes</h1>
            <p className="text-muted-foreground">
              {isManager ? 'Create and manage notes' : 'View mess notes'}
            </p>
          </div>
          {isManager && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
                  <DialogDescription>
                    {editingNote ? 'Update note details' : 'Create a new note'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Note title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Write your note..."
                      rows={5}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="gradient-primary">
                      {editingNote ? 'Update' : 'Create'} Note
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notes yet.</p>
              {isManager && <p className="text-sm text-muted-foreground mt-2">Create your first note!</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-card-hover transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-primary" />
                          {note.title}
                        </CardTitle>
                        {isManager && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(note)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(note.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground text-sm whitespace-pre-wrap line-clamp-4">{note.description}</p>
                      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(note.createdAt), 'MMM d, yyyy')}
                        {note.updatedAt && (
                          <span> • Edited {format(new Date(note.updatedAt), 'MMM d')}</span>
                        )}
                      </div>
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