import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as dataService from '@/lib/dataService';
import { BazarDate, User } from '@/types';
import { ShoppingCart, Plus, Edit2, Trash2, Calendar, CalendarIcon, AlertCircle, X, Loader2 } from 'lucide-react';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { Navigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function BazarDates() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bazarDates, setBazarDates] = useState<BazarDate[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBazar, setEditingBazar] = useState<BazarDate | null>(null);
  const [formData, setFormData] = useState<{ userId: string; dates: string[] }>({ userId: '', dates: [] });
  const [dateError, setDateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BazarDate | null>(null);
  const [bulkDeleteType, setBulkDeleteType] = useState<'past' | 'upcoming' | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isManager = user?.role === 'manager';

  const getMemberName = (userId: string) => {
    return members.find(m => m.id === userId)?.fullName || 'Unknown';
  };

  // Build a set of booked dates for calendar disabling
  const bookedDatesMap = useMemo(() => {
    const map: Record<string, string> = {};
    bazarDates.forEach(b => {
      if (!editingBazar || b.id !== editingBazar.id) {
        map[b.date] = getMemberName(b.userId);
      }
    });
    return map;
  }, [bazarDates, editingBazar, members]);

  useEffect(() => {
    if (!authLoading && isManager) {
      loadData();
    }
  }, [user, isManager, authLoading]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isManager) {
    return <Navigate to="/dashboard" replace />;
  }

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const dates = await dataService.getBazarDatesByMessId(user.messId);
      setBazarDates(dates);
      const membersData = await dataService.getMessMembers(user.messId);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading bazar dates:', error);
      toast({ title: 'Error', description: 'Failed to load bazar dates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ userId: '', dates: [] });
    setEditingBazar(null);
    setDateError(null);
  };

  const isDateAssigned = (date: string, excludeBazarId?: string): boolean => {
    return bazarDates.some(b => b.date === date && b.id !== excludeBazarId);
  };

  const getAssignedMemberForDate = (date: string, excludeBazarId?: string): string | null => {
    const bazar = bazarDates.find(b => b.date === date && b.id !== excludeBazarId);
    return bazar ? getMemberName(bazar.userId) : null;
  };

  const handleCalendarSelect = (dates: Date[] | Date | undefined) => {
    if (!dates) return;
    
    if (editingBazar) {
      // Single select for editing
      const date = dates as Date;
      const dateStr = format(date, 'yyyy-MM-dd');
      if (isDateAssigned(dateStr, editingBazar.id)) {
        setDateError(`This date is already assigned to ${getAssignedMemberForDate(dateStr, editingBazar.id)}`);
        return;
      }
      setFormData(prev => ({ ...prev, dates: [dateStr] }));
      setDateError(null);
    } else {
      // Multi select for adding
      const selectedDates = (dates as Date[]).map(d => format(d, 'yyyy-MM-dd'));
      // Filter out booked dates
      const validDates = selectedDates.filter(d => !isDateAssigned(d));
      setFormData(prev => ({ ...prev, dates: validDates.sort() }));
      setDateError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);

    try {
      const member = members.find(m => m.id === formData.userId);

      if (editingBazar) {
        if (formData.dates.length === 0) {
          toast({ title: 'Please select a date', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        await dataService.updateBazarDate(editingBazar.id, { userId: formData.userId, date: formData.dates[0] });
        await dataService.notifyMessMembers(user.messId, user.id, {
          type: 'bazar',
          title: 'Bazar Date Updated',
          message: `${member?.fullName}'s bazar date changed to ${format(new Date(formData.dates[0]), 'MMM d')}`,
        });
        toast({ title: 'Bazar date updated', variant: 'success' });
      } else {
        if (formData.dates.length === 0) {
          toast({ title: 'Please add at least one date', variant: 'destructive' });
          setIsSaving(false);
          return;
        }
        for (const date of formData.dates) {
          await dataService.createBazarDate({ messId: user.messId, userId: formData.userId, date });
        }
        await dataService.notifyMessMembers(user.messId, user.id, {
          type: 'bazar',
          title: 'Bazar Dates Set',
          message: `${member?.fullName} is assigned for bazar on ${formData.dates.length} date(s)`,
        });
        toast({ title: `${formData.dates.length} bazar date(s) added`, variant: 'success' });
      }

      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving bazar date:', error);
      toast({ title: 'Error', description: 'Failed to save bazar date', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (bazar: BazarDate) => {
    setFormData({ userId: bazar.userId, dates: [bazar.date] });
    setEditingBazar(bazar);
    setDateError(null);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (bazar: BazarDate) => {
    if (deletingId) return;
    setDeletingId(bazar.id);
    setDeleteTarget(null);
    try {
      await dataService.deleteBazarDate(bazar.id);
      toast({ title: 'Bazar date deleted', variant: 'success' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete bazar date', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || !bulkDeleteType || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDates = bazarDates.filter(d => {
        const dateObj = new Date(d.date + 'T00:00:00');
        return bulkDeleteType === 'past' ? dateObj < today : dateObj >= today;
      });

      for (const bazar of targetDates) {
        await dataService.deleteBazarDate(bazar.id);
      }

      toast({ title: `${targetDates.length} ${bulkDeleteType} bazar date(s) deleted`, variant: 'success' });
      setBulkDeleteType(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete bazar dates', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Sort ascending for upcoming, descending for past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingDates = bazarDates
    .filter(d => new Date(d.date + 'T00:00:00') >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastDates = bazarDates
    .filter(d => new Date(d.date + 'T00:00:00') < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Calendar modifiers for disabled/booked dates
  const bookedDateObjects = Object.keys(bookedDatesMap).map(d => new Date(d + 'T00:00:00'));

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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingBazar ? 'Edit Bazar Date' : 'Add Bazar Dates'}</DialogTitle>
                <DialogDescription>
                  {editingBazar
                    ? 'Update bazar date. Each date can only be assigned to one member.'
                    : 'Select multiple dates for a member. Already booked dates are disabled.'}
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
                  <Label>{editingBazar ? 'Select Date' : 'Select Dates (click multiple)'}</Label>
                  <TooltipProvider>
                    <div className="border rounded-md p-1">
                      {editingBazar ? (
                        <CalendarComponent
                          mode="single"
                          selected={formData.dates.length > 0 ? new Date(formData.dates[0] + 'T00:00:00') : undefined}
                          onSelect={(date: Date | undefined) => {
                            if (date) handleCalendarSelect(date);
                          }}
                          disabled={(date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return !!bookedDatesMap[dateStr];
                          }}
                          modifiers={{ booked: bookedDateObjects }}
                          modifiersStyles={{ booked: { opacity: 0.4, textDecoration: 'line-through' } }}
                          className="pointer-events-auto"
                        />
                      ) : (
                        <CalendarComponent
                          mode="multiple"
                          selected={formData.dates.map(d => new Date(d + 'T00:00:00'))}
                          onSelect={(dates: Date[] | undefined) => {
                            if (dates) handleCalendarSelect(dates);
                          }}
                          disabled={(date) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return !!bookedDatesMap[dateStr];
                          }}
                          modifiers={{ booked: bookedDateObjects }}
                          modifiersStyles={{ booked: { opacity: 0.4, textDecoration: 'line-through' } }}
                          className="pointer-events-auto"
                        />
                      )}
                    </div>
                  </TooltipProvider>
                  {dateError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">{dateError}</p>
                    </motion.div>
                  )}
                </div>

                {/* Selected dates list */}
                {formData.dates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Dates ({formData.dates.length})</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-muted/50 rounded-lg">
                      {formData.dates.map(date => (
                        <motion.div
                          key={date}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                        >
                          <Calendar className="h-3 w-3" />
                          {format(new Date(date), 'MMM d')}
                          {!editingBazar && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, dates: prev.dates.filter(d => d !== date) }))}
                              className="ml-1 hover:bg-primary/20 rounded p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    className="gradient-primary"
                    disabled={!formData.userId || formData.dates.length === 0 || isSaving}
                  >
                    {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : (<>{editingBazar ? 'Update' : `Add ${formData.dates.length || ''}`} Bazar Date{formData.dates.length !== 1 ? 's' : ''}</>)}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming ({upcomingDates.length})
              </CardTitle>
              {upcomingDates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setBulkDeleteType('upcoming')}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Clear All
                </Button>
              )}
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
                          transition={{ delay: index * 0.05 }}
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
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(bazar)} disabled={deletingId === bazar.id}>
                              {deletingId === bazar.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                Past Bazar Dates ({pastDates.length})
              </CardTitle>
              {pastDates.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setBulkDeleteType('past')}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Clear All
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {pastDates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No past bazar dates</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pastDates.slice(0, 20).map((bazar) => (
                    <div
                      key={bazar.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="text-muted-foreground">{getMemberName(bazar.userId)}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(bazar.date), 'EEE, MMM d')}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(bazar)}>
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

      {/* Single delete dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete this bazar date?"
        description="This bazar date entry will be permanently deleted. This action cannot be undone."
      />

      {/* Bulk delete dialog */}
      <DeleteConfirmDialog
        open={!!bulkDeleteType}
        onOpenChange={(open) => !open && setBulkDeleteType(null)}
        onConfirm={handleBulkDelete}
        isDeleting={isBulkDeleting}
        title={`Delete all ${bulkDeleteType} bazar dates?`}
        description={`Are you sure you want to delete all ${bulkDeleteType} bazar dates? This action cannot be undone.`}
      />
    </DashboardLayout>
  );
}