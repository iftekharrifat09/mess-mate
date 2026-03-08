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
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { User } from '@/types';
import * as dataService from '@/lib/dataService';
import { shouldUseBackend } from '@/lib/config';
import * as calcStore from '@/lib/calculatorStorage';
import { CalcCategory, CalcException, CalcPayment, CalcBillPayment } from '@/lib/calculatorStorage';
import { formatCurrency } from '@/lib/calculations';
import {
  Plus, Edit2, Trash2, UserPlus, Calculator as CalcIcon,
  CheckCircle, Users, Wallet, DollarSign, Receipt, CreditCard,
} from 'lucide-react';
import { format } from 'date-fns';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
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
  const [billPayments, setBillPayments] = useState<CalcBillPayment[]>([]);

  // Modal states
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<CalcCategory | null>(null);
  const [catTitle, setCatTitle] = useState('');
  const [catCost, setCatCost] = useState('');

  const [excModal, setExcModal] = useState<string | null>(null);
  const [excUserId, setExcUserId] = useState('');
  const [excAmount, setExcAmount] = useState('');
  const [excStep, setExcStep] = useState<1 | 2>(1);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);

  // Member Deposit modal
  const [payModal, setPayModal] = useState(false);
  const [payUserId, setPayUserId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payStep, setPayStep] = useState<1 | 2>(1);

  const [editPayment, setEditPayment] = useState<CalcPayment | null>(null);

  // Pay Bill modal
  const [billModal, setBillModal] = useState(false);
  const [billCatId, setBillCatId] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDesc, setBillDesc] = useState('');
  const [editBillPayment, setEditBillPayment] = useState<CalcBillPayment | null>(null);

  // Warning modal states
  const [depositWarning, setDepositWarning] = useState(false);
  const [billWarning, setBillWarning] = useState(false);

  const messId = user?.messId || '';

  const reload = useCallback(async () => {
    if (!messId || !activeMonthId) return;
    const [cats, excs, pays, bills] = await Promise.all([
      calcStore.getCategories(messId, activeMonthId),
      calcStore.getAllExceptions(messId, activeMonthId),
      calcStore.getPayments(messId, activeMonthId),
      calcStore.getBillPayments(messId, activeMonthId),
    ]);
    setCategories(cats);
    setAllExceptions(excs);
    setPayments(pays.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setBillPayments(bills.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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

  // Summary calculations
  const actualTotalDeposits = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const totalDeposits = useMemo(() => monthlyTotal > 0 ? Math.min(actualTotalDeposits, monthlyTotal) : actualTotalDeposits, [actualTotalDeposits, monthlyTotal]);
  const totalBillsPaid = useMemo(() => billPayments.reduce((s, bp) => s + bp.amount, 0), [billPayments]);
  const currentBalance = actualTotalDeposits - totalBillsPaid;
  const isMonthlyFullyPaid = monthlyTotal > 0 && totalBillsPaid >= monthlyTotal;

  // Category paid amounts
  const categoryPaidMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const bp of billPayments) {
      map[bp.categoryId] = (map[bp.categoryId] || 0) + bp.amount;
    }
    return map;
  }, [billPayments]);

  // Unpaid categories for Pay Bill dropdown
  const unpaidCategories = useMemo(() =>
    categories.filter(c => {
      const paid = categoryPaidMap[c.id] || 0;
      return paid < c.totalCost;
    }), [categories, categoryPaidMap]);

  const selectedBillCatDue = useMemo(() => {
    if (!billCatId) return 0;
    const cat = categories.find(c => c.id === billCatId);
    if (!cat) return 0;
    return cat.totalCost - (categoryPaidMap[cat.id] || 0);
  }, [billCatId, categories, categoryPaidMap]);

  // Handlers
  const handleSaveCategory = async () => {
    if (!catTitle.trim() || !catCost) return;
    if (editCat) {
      await calcStore.updateCategory(editCat.id, { title: catTitle.trim(), totalCost: Number(catCost) });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'cost', title: 'Expense Category Updated', message: `Expense category "${catTitle.trim()}" has been updated` });
      }
    } else {
      await calcStore.createCategory({ messId, monthId: activeMonthId, title: catTitle.trim(), totalCost: Number(catCost), status: 'unpaid' });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'cost', title: 'Expense Category Added', message: `New expense category "${catTitle.trim()}" added (${formatCurrency(Number(catCost))})` });
      }
    }
    setCatModal(false); setEditCat(null); setCatTitle(''); setCatCost('');
    reload();
    toast({ title: editCat ? 'Category updated' : 'Category added' });
  };

  const handleDeleteCategory = async (id: string) => {
    setDeleteTarget(null);
    const cat = categories.find(c => c.id === id);
    await calcStore.deleteCategory(id);
    if (!shouldUseBackend() && cat) {
      dataService.notifyMessMembers(messId, user?.id || '', { type: 'cost', title: 'Expense Category Deleted', message: `Expense category "${cat.title}" has been removed` });
    }
    reload();
    toast({ title: 'Category deleted', variant: 'destructive' });
  };

  const handleSaveException = async () => {
    if (!excModal || !excUserId || !excAmount) return;
    const memberName = members.find(m => m.id === excUserId)?.fullName || '';
    await calcStore.createException({ categoryId: excModal, userId: excUserId, userName: memberName, amount: Number(excAmount) });
    if (!shouldUseBackend()) {
      const cat = categories.find(c => c.id === excModal);
      dataService.notifyMessMembers(messId, user?.id || '', { type: 'cost', title: 'Expense Exception Added', message: `${memberName} has a fixed contribution of ${formatCurrency(Number(excAmount))} for "${cat?.title || ''}"` });
    }
    setExcModal(null); setExcUserId(''); setExcAmount(''); setExcStep(1);
    reload();
    toast({ title: 'Exception added' });
  };

  const handleDeleteException = async (id: string) => {
    setDeleteTarget(null);
    const exc = allExceptions.find(e => e.id === id);
    await calcStore.deleteException(id);
    if (!shouldUseBackend() && exc) {
      const cat = categories.find(c => c.id === exc.categoryId);
      dataService.notifyMessMembers(messId, user?.id || '', { type: 'cost', title: 'Expense Exception Removed', message: `${exc.userName}'s exception for "${cat?.title || ''}" has been removed` });
    }
    reload();
  };

  const isDepositsCapped = monthlyTotal > 0 && actualTotalDeposits >= monthlyTotal;

  // Members who still have dues (can deposit even when capped)
  const membersWithDues = useMemo(() => {
    if (!isDepositsCapped) return [];
    return members.filter(m => {
      const due = memberDues[m.id] || 0;
      const paid = memberPayments[m.id] || 0;
      return due > 0 && paid < due;
    });
  }, [isDepositsCapped, members, memberDues, memberPayments]);

  // Member Deposit handlers
  const handleOpenDepositModal = () => {
    if (isDepositsCapped && membersWithDues.length === 0) {
      setDepositWarning(true);
      return;
    }
    setPayModal(true); setPayStep(1); setPayUserId(''); setPayAmount(''); setPayDesc(''); setEditPayment(null);
  };

  const handleSaveDeposit = async () => {
    if (!payUserId || !payAmount) return;
    const amt = Number(payAmount);
    const due = memberDues[payUserId] || 0;
    const paid = memberPayments[payUserId] || 0;
    const memberRemaining = Math.max(0, due - paid);

    if (!editPayment && isDepositsCapped) {
      // After cap: member can only deposit up to their remaining due
      if (amt > memberRemaining) {
        toast({ title: 'Deposit exceeds member due', description: `This member's remaining due is ${formatCurrency(memberRemaining)}. Cannot deposit more than that.`, variant: 'destructive' });
        return;
      }
    } else if (!editPayment && monthlyTotal > 0) {
      // Before cap: total deposits cannot exceed monthly total
      const newTotal = actualTotalDeposits + amt;
      if (newTotal > monthlyTotal) {
        // Check if member has dues and the excess is within their due
        const excessOverCap = newTotal - monthlyTotal;
        if (excessOverCap > memberRemaining) {
          const maxAllowed = monthlyTotal - actualTotalDeposits + memberRemaining;
          toast({ title: 'Deposit exceeds limit', description: `Maximum deposit allowed is ${formatCurrency(Math.max(0, maxAllowed))}. Total deposits cannot exceed Monthly Total plus member's remaining due.`, variant: 'destructive' });
          return;
        }
      }
    }
    const memberName = members.find(m => m.id === payUserId)?.fullName || '';
    if (editPayment) {
      await calcStore.updatePayment(editPayment.id, { amount: Number(payAmount), description: payDesc });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Deposit Updated', message: `${memberName}'s deposit has been updated to ${formatCurrency(Number(payAmount))}` });
      }
      setEditPayment(null);
    } else {
      await calcStore.createPayment({ messId, monthId: activeMonthId, userId: payUserId, userName: memberName, amount: Number(payAmount), description: payDesc });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Member Deposit Recorded', message: `${memberName} deposited ${formatCurrency(Number(payAmount))}${payDesc ? ` - ${payDesc}` : ''}` });
      }
    }
    setPayModal(false); setPayUserId(''); setPayAmount(''); setPayDesc(''); setPayStep(1);
    reload();
    toast({ title: editPayment ? 'Deposit updated' : 'Deposit recorded' });
  };

  const handleDeleteDeposit = async (id: string) => {
    setDeleteTarget(null);
    const dep = payments.find(p => p.id === id);
    await calcStore.deletePayment(id);
    if (!shouldUseBackend() && dep) {
      dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Deposit Deleted', message: `${dep.userName}'s deposit of ${formatCurrency(dep.amount)} has been removed` });
    }
    reload();
    toast({ title: 'Deposit deleted', variant: 'destructive' });
  };

  // Pay Bill handlers
  const handleOpenBillModal = () => {
    if (unpaidCategories.length === 0) {
      setBillWarning(true);
      return;
    }
    setBillModal(true); setBillCatId(''); setBillAmount(''); setBillDesc(''); setEditBillPayment(null);
  };

  const handleSaveBillPayment = async () => {
    if (!billCatId || !billAmount) return;
    const amt = Number(billAmount);
    if (!editBillPayment && amt > selectedBillCatDue) {
      toast({ title: 'Amount exceeds remaining due', variant: 'destructive' });
      return;
    }
    if (!editBillPayment && amt > currentBalance) {
      toast({ title: 'Insufficient balance', description: `Current balance is ${formatCurrency(currentBalance)}`, variant: 'destructive' });
      return;
    }
    const catName = categories.find(c => c.id === billCatId)?.title || '';
    if (editBillPayment) {
      await calcStore.updateBillPayment(editBillPayment.id, { amount: amt, description: billDesc, categoryId: billCatId, categoryName: catName });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Bill Payment Updated', message: `Bill payment for "${catName}" updated to ${formatCurrency(amt)}` });
      }
      setEditBillPayment(null);
    } else {
      await calcStore.createBillPayment({ messId, monthId: activeMonthId, categoryId: billCatId, categoryName: catName, amount: amt, description: billDesc });
      if (!shouldUseBackend()) {
        dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Bill Payment Recorded', message: `${formatCurrency(amt)} paid for "${catName}"${billDesc ? ` - ${billDesc}` : ''}` });
      }
    }
    setBillModal(false); setBillCatId(''); setBillAmount(''); setBillDesc('');
    reload();
    toast({ title: editBillPayment ? 'Bill payment updated' : 'Bill payment recorded' });
  };

  const handleDeleteBillPayment = async (id: string) => {
    setDeleteTarget(null);
    const bp = billPayments.find(b => b.id === id);
    await calcStore.deleteBillPayment(id);
    if (!shouldUseBackend() && bp) {
      dataService.notifyMessMembers(messId, user?.id || '', { type: 'general', title: 'Bill Payment Deleted', message: `Bill payment of ${formatCurrency(bp.amount)} for "${bp.categoryName}" has been removed` });
    }
    reload();
    toast({ title: 'Bill payment deleted', variant: 'destructive' });
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
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => { setCatModal(true); setEditCat(null); setCatTitle(''); setCatCost(''); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
              <Button variant="outline" onClick={handleOpenDepositModal}>
                <Wallet className="h-4 w-4 mr-2" /> Member Deposit
              </Button>
              <Button variant="secondary" onClick={handleOpenBillModal} className="relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:scale-105 hover:bg-primary hover:text-primary-foreground">
                <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <CreditCard className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-12" /> Pay Bill
              </Button>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Total</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold">{formatCurrency(monthlyTotal)}</p>
                    {isMonthlyFullyPaid && <Badge className="bg-success text-success-foreground text-xs">Paid</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10"><Wallet className="h-5 w-5 text-success" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Deposits</p>
                  <p className="text-xl font-bold text-success">{formatCurrency(totalDeposits)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><Receipt className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold text-destructive">{formatCurrency(totalBillsPaid)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentBalance >= 0 ? 'bg-info/10' : 'bg-destructive/10'}`}>
                  <CalcIcon className={`h-5 w-5 ${currentBalance >= 0 ? 'text-info' : 'text-destructive'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className={`text-xl font-bold ${currentBalance >= 0 ? 'text-info' : 'text-destructive'}`}>{formatCurrency(currentBalance)}</p>
                  {isMonthlyFullyPaid && currentBalance > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">This balance will be refunded to members who overpaid</p>
                  )}
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
                  const catPaid = categoryPaidMap[cat.id] || 0;
                  const isPaid = catPaid >= cat.totalCost;
                  const catRemaining = cat.totalCost - catPaid;
                  const catExc = getExceptionsForCategory(cat.id);
                  return (
                    <motion.div key={cat.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Card className={`shadow-card transition-all ${isPaid ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{cat.title}</CardTitle>
                            <Badge variant={isPaid ? 'default' : 'destructive'} className={isPaid ? 'bg-success text-success-foreground' : ''}>
                              {isPaid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Cost</span>
                            <span className="font-bold text-lg">{formatCurrency(cat.totalCost)}</span>
                          </div>
                          {catPaid > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Bill Paid</span>
                              <span className="font-semibold text-success">{formatCurrency(catPaid)}</span>
                            </div>
                          )}
                          {!isPaid && catRemaining > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Remaining</span>
                              <span className="font-semibold text-destructive">{formatCurrency(catRemaining)}</span>
                            </div>
                          )}

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
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteTarget({ type: 'exception', id: ex.id, label: `${ex.userName}'s exception` })}>
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
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'category', id: cat.id, label: `"${cat.title}"` })}>
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

        {/* Bottom Tabs: Deposits & Payment Records */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <Tabs defaultValue="deposits">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="deposits">
                  <Wallet className="h-4 w-4 mr-2" /> Deposits ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="records">
                  <Receipt className="h-4 w-4 mr-2" /> Payment Records ({billPayments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deposits">
                {payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No deposits recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Note</TableHead>
                          {isManager && <TableHead className="text-right">Actions</TableHead>}
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
                            {isManager && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    setEditPayment(p); setPayUserId(p.userId); setPayAmount(String(p.amount)); setPayDesc(p.description); setPayStep(2); setPayModal(true);
                                  }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'deposit', id: p.id, label: `${p.userName}'s deposit` })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="records">
                {billPayments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No bill payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount Paid</TableHead>
                          <TableHead>Description</TableHead>
                          {isManager && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billPayments.map(bp => (
                          <TableRow key={bp.id}>
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {format(new Date(bp.createdAt), 'MMM dd, yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="font-medium">{bp.categoryName}</TableCell>
                            <TableCell className="font-bold text-success">{formatCurrency(bp.amount)}</TableCell>
                            <TableCell className="text-muted-foreground">{bp.description || '-'}</TableCell>
                            {isManager && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    setEditBillPayment(bp); setBillCatId(bp.categoryId); setBillAmount(String(bp.amount)); setBillDesc(bp.description); setBillModal(true);
                                  }}>
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget({ type: 'billPayment', id: bp.id, label: `bill payment for "${bp.categoryName}"` })}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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

      {/* Member Deposit Modal */}
      <Dialog open={payModal} onOpenChange={v => { setPayModal(v); if (!v) { setPayStep(1); setEditPayment(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPayment ? 'Edit Deposit' : 'Record Deposit'}</DialogTitle>
          </DialogHeader>
          {payStep === 1 ? (
            <div className="space-y-3">
              <Label>Select Member</Label>
              <Select onValueChange={v => { setPayUserId(v); setPayStep(2); }}>
                <SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger>
                <SelectContent>
                  {(isDepositsCapped ? membersWithDues : members).map(m => {
                    const due = memberDues[m.id] || 0;
                    const paid = memberPayments[m.id] || 0;
                    const isMemberPaid = due > 0 && paid >= due;
                    const disabled = isDepositsCapped ? false : (isMonthlyFullyPaid && isMemberPaid);
                    const remaining = Math.max(0, due - paid);
                    return (
                      <SelectItem key={m.id} value={m.id} disabled={disabled}>
                        {m.fullName}{disabled ? ' (Fully Paid)' : isDepositsCapped ? ` (Due: ${formatCurrency(remaining)})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Member: <span className="font-semibold text-foreground">{members.find(m => m.id === payUserId)?.fullName}</span></p>
              {isDepositsCapped && (() => {
                const due = memberDues[payUserId] || 0;
                const paid = memberPayments[payUserId] || 0;
                const remaining = Math.max(0, due - paid);
                return (
                  <p className="text-xs text-warning font-medium">⚠ Monthly total reached. Max deposit: {formatCurrency(remaining)}</p>
                );
              })()}
              <div>
                <Label>Amount</Label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="500" max={isDepositsCapped ? Math.max(0, (memberDues[payUserId] || 0) - (memberPayments[payUserId] || 0)) : undefined} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="Deposit note..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayModal(false); setEditPayment(null); }}>Cancel</Button>
            {payStep === 2 && <Button onClick={handleSaveDeposit} disabled={!payAmount}>Save</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Bill Modal */}
      <Dialog open={billModal} onOpenChange={v => { setBillModal(v); if (!v) setEditBillPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBillPayment ? 'Edit Bill Payment' : 'Pay Bill'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={billCatId} onValueChange={v => { setBillCatId(v); setBillAmount(''); }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(editBillPayment ? categories : unpaidCategories).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title} — Due: {formatCurrency(c.totalCost - (categoryPaidMap[c.id] || 0))}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={billAmount}
                onChange={e => {
                  const val = Number(e.target.value);
                  const maxAllowed = Math.min(selectedBillCatDue, currentBalance);
                  if (!editBillPayment && val > maxAllowed) return;
                  setBillAmount(e.target.value);
                }}
                placeholder={billCatId ? `Due: ${formatCurrency(selectedBillCatDue)}` : 'Select a category first'}
                max={editBillPayment ? undefined : Math.min(selectedBillCatDue, currentBalance)}
              />
              {billCatId && !editBillPayment && (
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Category due: {formatCurrency(selectedBillCatDue)}</span>
                  <span>Balance: {formatCurrency(currentBalance)}</span>
                </div>
              )}
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={billDesc} onChange={e => setBillDesc(e.target.value)} placeholder="Payment note..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBillModal(false); setEditBillPayment(null); }}>Cancel</Button>
            <Button onClick={handleSaveBillPayment} disabled={!billCatId || !billAmount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Warning Modal */}
      <AlertDialog open={depositWarning} onOpenChange={setDepositWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <Wallet className="h-5 w-5" /> Deposit Limit Reached
            </AlertDialogTitle>
            <AlertDialogDescription>
              Total deposits have reached the Monthly Total of <span className="font-semibold text-foreground">{formatCurrency(monthlyTotal)}</span> and all members have paid their dues. No more deposits can be added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* No Unpaid Categories Warning Modal */}
      <AlertDialog open={billWarning} onOpenChange={setBillWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-warning">
              <CheckCircle className="h-5 w-5" /> No Bills to Pay
            </AlertDialogTitle>
            <AlertDialogDescription>
              {categories.length === 0
                ? 'There are no expense categories created yet. Please add a category first before paying bills.'
                : 'All expense categories have been fully paid. There are no remaining bills to pay.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'category') handleDeleteCategory(deleteTarget.id);
          else if (deleteTarget.type === 'exception') handleDeleteException(deleteTarget.id);
          else if (deleteTarget.type === 'deposit') handleDeleteDeposit(deleteTarget.id);
          else if (deleteTarget.type === 'billPayment') handleDeleteBillPayment(deleteTarget.id);
        }}
        title={`Delete ${deleteTarget?.label}?`}
        description="This will be permanently deleted. This action cannot be undone."
      />
    </DashboardLayout>
  );
}
