import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { User } from '@/types';
import * as dataService from '@/lib/dataService';
import * as calcStore from '@/lib/calculatorStorage';
import { CalcCategory, CalcException, CalcPayment } from '@/lib/calculatorStorage';
import { formatCurrency } from '@/lib/calculations';
import {
  Plus, Edit2, Trash2, UserPlus, Calculator as CalcIcon,
  CheckCircle, XCircle, Users, Wallet, DollarSign, Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function CalculatorPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [members, setMembers] = useState<User[]>([]);
  const [activeMonthId, setActiveMonthId] = useState('');
  const [categories, setCategories] = useState<CalcCategory[]>([]);
  const [allExceptions, setAllExceptions] = useState<CalcException[]>([]);
  const [payments, setPayments] = useState<CalcPayment[]>([]);

  // Modal states
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<CalcCategory | null>(null);
  const [catTitle, setCatTitle] = useState('');
  const [catCost, setCatCost] = useState('');

  const [excModal, setExcModal] = useState<string | null>(null); // categoryId
  const [excUserId, setExcUserId] = useState('');
  const [excAmount, setExcAmount] = useState('');
  const [excStep, setExcStep] = useState<1 | 2>(1);

  const [payModal, setPayModal] = useState(false);
  const [payUserId, setPayUserId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payStep, setPayStep] = useState<1 | 2>(1);
  const [paidPopup, setPaidPopup] = useState(false);

  const [editPayment, setEditPayment] = useState<CalcPayment | null>(null);

  const messId = user?.messId || '';

  const reload = useCallback(() => {
    if (!messId || !activeMonthId) return;
    setCategories(calcStore.getCategories(messId, activeMonthId));
    setAllExceptions(calcStore.getAllExceptions(messId, activeMonthId));
    setPayments(calcStore.getPayments(messId, activeMonthId));
  }, [messId, activeMonthId]);

  useEffect(() => {
    if (!messId) return;
    (async () => {
      const [m, month] = await Promise.all([
        dataService.getMessMembers(messId),
        dataService.getActiveMonth(messId),
      ]);
      setMembers(m || []);
      if (month) setActiveMonthId(month.id);
    })();
  }, [messId]);

  useEffect(() => { reload(); }, [reload]);

  // Calculations
  const totalMembers = members.length;

  const memberDues = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members) {
      map[m.id] = calcStore.calculateMemberDues(categories, allExceptions, totalMembers, m.id);
    }
    return map;
  }, [categories, allExceptions, members, totalMembers]);

  const memberPayments = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      map[p.userId] = (map[p.userId] || 0) + p.amount;
    }
    return map;
  }, [payments]);

  const monthlyTotal = useMemo(() => categories.reduce((s, c) => s + c.totalCost, 0), [categories]);

  // Handlers
  const handleSaveCategory = () => {
    if (!catTitle.trim() || !catCost) return;
    if (editCat) {
      calcStore.updateCategory(editCat.id, { title: catTitle.trim(), totalCost: Number(catCost) });
    } else {
      calcStore.createCategory({ messId, monthId: activeMonthId, title: catTitle.trim(), totalCost: Number(catCost), status: 'unpaid' });
    }
    setCatModal(false); setEditCat(null); setCatTitle(''); setCatCost('');
    reload();
    toast({ title: editCat ? 'Category updated' : 'Category added' });
  };

  const handleDeleteCategory = (id: string) => {
    calcStore.deleteCategory(id);
    reload();
    toast({ title: 'Category deleted', variant: 'destructive' });
  };

  const handleStatusChange = (id: string, status: 'paid' | 'unpaid') => {
    calcStore.updateCategory(id, { status });
    reload();
  };

  const handleSaveException = () => {
    if (!excModal || !excUserId || !excAmount) return;
    calcStore.createException({ categoryId: excModal, userId: excUserId, userName: members.find(m => m.id === excUserId)?.fullName || '', amount: Number(excAmount) });
    setExcModal(null); setExcUserId(''); setExcAmount(''); setExcStep(1);
    reload();
    toast({ title: 'Exception added' });
  };

  const handleDeleteException = (id: string) => {
    calcStore.deleteException(id);
    reload();
  };

  const handleOpenPayModal = () => {
    setPayModal(true); setPayStep(1); setPayUserId(''); setPayAmount(''); setPayDesc('');
  };

  const handleSelectPayMember = (uid: string) => {
    const due = memberDues[uid] || 0;
    const paid = memberPayments[uid] || 0;
    if (paid >= due && due > 0) {
      setPaidPopup(true);
      return;
    }
    setPayUserId(uid);
    setPayStep(2);
  };

  const handleSavePayment = () => {
    if (!payUserId || !payAmount) return;
    if (editPayment) {
      calcStore.updatePayment(editPayment.id, { amount: Number(payAmount), description: payDesc });
      setEditPayment(null);
    } else {
      calcStore.createPayment({ messId, monthId: activeMonthId, userId: payUserId, userName: members.find(m => m.id === payUserId)?.fullName || '', amount: Number(payAmount), description: payDesc });
    }
    setPayModal(false); setPayUserId(''); setPayAmount(''); setPayDesc(''); setPayStep(1);
    reload();
    toast({ title: editPayment ? 'Payment updated' : 'Payment recorded' });
  };

  const handleDeletePayment = (id: string) => {
    calcStore.deletePayment(id);
    reload();
    toast({ title: 'Payment deleted', variant: 'destructive' });
  };

  const getExceptionsForCategory = (catId: string) => allExceptions.filter(e => e.categoryId === catId);

  if (!activeMonthId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No active month found. Please create a month first.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary">
              <CalcIcon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
             <h1 className="text-2xl font-bold text-foreground">Mess Expenses</h1>
              <p className="text-sm text-muted-foreground">Manage monthly cost categories & payments</p>
            </div>
          </div>
          {isManager && (
            <div className="flex gap-2">
              <Button onClick={() => { setCatModal(true); setEditCat(null); setCatTitle(''); setCatCost(''); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
              <Button variant="outline" onClick={handleOpenPayModal}>
                <Wallet className="h-4 w-4 mr-2" /> Member Paying
              </Button>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Total</p>
                  <p className="text-xl font-bold">{formatCurrency(monthlyTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10"><Users className="h-5 w-5 text-info" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                  <p className="text-xl font-bold">{totalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10"><CalcIcon className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Per Member (avg)</p>
                  <p className="text-xl font-bold">{totalMembers > 0 ? formatCurrency(monthlyTotal / totalMembers) : '৳0'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Member Dues Overview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" /> Member Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No members found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {members.map(m => {
                  const due = memberDues[m.id] || 0;
                  const paid = memberPayments[m.id] || 0;
                  const remaining = Math.max(0, due - paid);
                  const isFullyPaid = due > 0 ? paid >= due : due === 0;
                  const overpaid = isFullyPaid && paid > due ? paid - due : 0;
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-xl border transition-all ${isFullyPaid ? 'border-success/50 bg-success/5' : 'border-border bg-card'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{m.fullName}</p>
                        {isFullyPaid && (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-success text-success-foreground text-xs">Paid</Badge>
                            {overpaid > 0 && (
                              <span className="text-success font-semibold text-xs">+{formatCurrency(overpaid)}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {due > 0 && (
                        <p className="text-xs text-muted-foreground">Utility Expenses: <span className="font-semibold text-foreground">{formatCurrency(due)}</span></p>
                      )}
                      {paid > 0 && (
                        <p className="text-xs text-muted-foreground">Paid: <span className="font-semibold text-success">{formatCurrency(paid)}</span></p>
                      )}
                      {!isFullyPaid && remaining > 0 && (
                        <p className="text-xs text-destructive font-semibold mt-0.5">Due: {formatCurrency(remaining)}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>
          {categories.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="py-12 text-center">
                <CalcIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No categories yet. Add one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {categories.map(cat => {
                  const isPaid = cat.status === 'paid';
                  const catExc = getExceptionsForCategory(cat.id);
                  return (
                    <motion.div key={cat.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Card className={`shadow-card transition-all ${isPaid ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{cat.title}</CardTitle>
                            <div className="flex items-center gap-2">
                              {isManager && (
                                <Select value={cat.status} onValueChange={(v: 'paid' | 'unpaid') => handleStatusChange(cat.id, v)}>
                                  <SelectTrigger className="h-8 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="unpaid">Unpaid</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              {!isManager && (
                                <Badge variant={isPaid ? 'default' : 'destructive'} className={isPaid ? 'bg-success text-success-foreground' : ''}>
                                  {isPaid ? 'Paid' : 'Unpaid'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Cost</span>
                            <span className="font-bold text-lg">{formatCurrency(cat.totalCost)}</span>
                          </div>

                          {/* Per-member breakdown */}
                          {totalMembers > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {catExc.length === 0 ? (
                                <p>Each member pays: <span className="font-semibold text-foreground">{formatCurrency(cat.totalCost / totalMembers)}</span></p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">Breakdown:</p>
                                  {catExc.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between">
                                      <span>{ex.userName} (exception): <span className="font-semibold text-foreground">{formatCurrency(ex.amount)}</span></span>
                                      {isManager && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteException(ex.id)}>
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                  {(() => {
                                    const excTotal = catExc.reduce((s, e) => s + e.amount, 0);
                                    const remaining = cat.totalCost - excTotal;
                                    const normalCount = totalMembers - catExc.length;
                                    const each = normalCount > 0 ? remaining / normalCount : 0;
                                    return <p>Others ({normalCount}): <span className="font-semibold text-foreground">{formatCurrency(each)} each</span></p>;
                                  })()}
                                </div>
                              )}
                            </div>
                          )}

                          {isManager && (
                            <div className="flex gap-2 pt-2 border-t border-border">
                              <Button variant="outline" size="sm" onClick={() => { setEditCat(cat); setCatTitle(cat.title); setCatCost(String(cat.totalCost)); setCatModal(true); }}>
                                <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setExcModal(cat.id); setExcStep(1); setExcUserId(''); setExcAmount(''); }}>
                                <UserPlus className="h-3.5 w-3.5 mr-1" /> Exception
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Payment Records (Manager only) */}
        {isManager && payments.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" /> Payment Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {format(new Date(p.createdAt), 'MMM dd, yyyy hh:mm a')}
                        </TableCell>
                        <TableCell className="font-medium">{p.userName}</TableCell>
                        <TableCell className="font-bold text-success">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{p.description || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setEditPayment(p); setPayUserId(p.userId); setPayAmount(String(p.amount)); setPayDesc(p.description); setPayStep(2); setPayModal(true);
                            }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Add/Edit Category Modal */}
      <Dialog open={catModal} onOpenChange={setCatModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={catTitle} onChange={e => setCatTitle(e.target.value)} placeholder="e.g. Internet Bill" />
            </div>
            <div>
              <Label>Total Costing</Label>
              <Input type="number" value={catCost} onChange={e => setCatCost(e.target.value)} placeholder="500" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!catTitle.trim() || !catCost}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exception Modal */}
      <Dialog open={!!excModal} onOpenChange={() => { setExcModal(null); setExcStep(1); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Exception</DialogTitle>
          </DialogHeader>
          {excStep === 1 ? (
            <div className="space-y-3">
              <Label>Select Member</Label>
              <Select value={excUserId} onValueChange={v => { setExcUserId(v); setExcStep(2); }}>
                <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Member: <span className="font-semibold text-foreground">{members.find(m => m.id === excUserId)?.fullName}</span></p>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={excAmount} onChange={e => setExcAmount(e.target.value)} placeholder="50" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setExcModal(null); setExcStep(1); }}>Cancel</Button>
            {excStep === 2 && <Button onClick={handleSaveException} disabled={!excAmount}>Save</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Paying Modal */}
      <Dialog open={payModal} onOpenChange={v => { setPayModal(v); if (!v) { setPayStep(1); setEditPayment(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
          </DialogHeader>
          {payStep === 1 ? (
            <div className="space-y-3">
              <Label>Select Member</Label>
              <Select onValueChange={handleSelectPayMember}>
                <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Member: <span className="font-semibold text-foreground">{members.find(m => m.id === payUserId)?.fullName}</span></p>
              <div>
                <Label>Amount</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="500" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="Payment note..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayModal(false); setEditPayment(null); }}>Cancel</Button>
            {payStep === 2 && <Button onClick={handleSavePayment} disabled={!payAmount}>Save</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Already Paid Popup */}
      <Dialog open={paidPopup} onOpenChange={setPaidPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /> Already Paid</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">This member has already fully paid their dues.</p>
          <DialogFooter>
            <Button onClick={() => setPaidPopup(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
