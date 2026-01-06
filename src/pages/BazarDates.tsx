import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  getBazarDatesByMessId, 
  createBazarDate, 
  updateBazarDate, 
  deleteBazarDate,
  getMessMembers,
  notifyMessMembers,
} from '@/lib/storage';
import { BazarDate, User } from '@/types';
import { ShoppingCart, Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { Navigate } from 'react-router-dom';

export default function BazarDates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bazarDates, setBazarDates] = useState<BazarDate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBazar, setEditingBazar] = useState<BazarDate | null>(null);
  const [formData, setFormData] = useState({ userId: '', date: format(new Date(), 'yyyy-MM-dd') });

  const isManager = user?.role === 'manager';

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    if (!user) return;
    setBazarDates(getBazarDatesByMessId(user.messId));
    setMembers(getMessMembers(user.messId));
  };

  const resetForm = () => {
    setFormData({ userId: '', date: format(new Date(), 'yyyy-MM-dd') });
    setEditingBazar(null);
  };

  const getMemberName = (userId: string) => {
    return members.find(m => m.id === userId)?.fullName || 'Unknown';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const member = members.find(m => m.id === formData.userId);

    if (editingBazar) {
      updateBazarDate(editingBazar.id, { userId: formData.userId, date: formData.date });
      notifyMessMembers(user.messId, user.id, {
        type: 'bazar',
        title: 'Bazar Date Updated',
        message: `${member?.fullName}'s bazar date changed to ${format(new Date(formData.date), 'MMM d')}`,
      });
      toast({ title: 'Bazar date updated' });
    } else {
      createBazarDate({ messId: user.messId, userId: formData.userId, date: formData.date });
      notifyMessMembers(user.messId, user.id, {
        type: 'bazar',
        title: 'Bazar Date Set',
        message: `${member?.fullName} is assigned for bazar on ${format(new Date(formData.date), 'MMM d')}`,
      });
      toast({ title: 'Bazar date added' });
    }

    setIsAddDialogOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (bazar: BazarDate) => {
    setFormData({ userId: bazar.userId, date: bazar.date });
    setEditingBazar(bazar);
    setIsAddDialogOpen(true);
  };

  const handleDelete = (bazar: BazarDate) => {
    deleteBazarDate(bazar.id);
    toast({ title: 'Bazar date deleted' });
    loadData();
  };

  const sortedDates = [...bazarDates].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingDates = sortedDates.filter(d => isToday(new Date(d.date)) || isFuture(new Date(d.date)));
  const pastDates = sortedDates.filter(d => isPast(new Date(d.date)) && !isToday(new Date(d.date)));

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bazar Dates</h1>
            <p className="text-muted-foreground">Schedule who does bazar on which date</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Bazar Date
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBazar ? 'Edit Bazar Date' : 'Add Bazar Date'}</DialogTitle>
                <DialogDescription>
                  Assign a member to do bazar on a specific date
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Member</Label>
                  <Select 
                    value={formData.userId} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, userId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="gradient-primary" disabled={!formData.userId}>
                    {editingBazar ? 'Update' : 'Add'} Bazar Date
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming bazar dates</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {upcomingDates.map((bazar, index) => {
                      const isTodayDate = isToday(new Date(bazar.date));
                      return (
                        <motion.div
                          key={bazar.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isTodayDate ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isTodayDate ? 'bg-primary' : 'bg-muted-foreground/20'}`}>
                              <ShoppingCart className={`h-4 w-4 ${isTodayDate ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className={`font-medium ${isTodayDate ? 'text-primary' : ''}`}>
                                {getMemberName(bazar.userId)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(bazar.date), 'EEE, MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isTodayDate && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full"
                              >
                                Today!
                              </motion.span>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(bazar)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(bazar)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                Past Bazar Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastDates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No past bazar dates</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pastDates.reverse().slice(0, 10).map((bazar) => (
                    <div
                      key={bazar.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="text-muted-foreground">{getMemberName(bazar.userId)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(bazar.date), 'EEE, MMM d')}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(bazar)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}