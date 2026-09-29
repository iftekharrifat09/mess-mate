import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronDown, Loader2 } from 'lucide-react';
import { ServiceStatus, User } from '@/types';
import { SERVICE_OPTIONS } from '@/lib/serviceStatus';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: User[];
  onSubmit: (ids: string[], status: ServiceStatus) => Promise<void>;
}

export default function ServiceSettingDialog({ open, onOpenChange, members, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<ServiceStatus>('default');
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  const allSelected = selected.length === members.length && members.length > 0;

  const handleSubmit = async () => {
    if (!selected.length || saving) return;
    setSaving(true);
    try {
      await onSubmit(selected, status);
      setSelected([]);
      setStatus('default');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const triggerText = selected.length === 0
    ? 'Select members'
    : selected.length <= 2
      ? members.filter(m => selected.includes(m.id)).map(m => m.fullName).join(', ')
      : `${selected.length} members selected`;

  return (
    <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member's Service Setting</DialogTitle>
          <DialogDescription>Choose which services the selected members take part in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Members</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">{triggerText}</span>
                  <ChevronDown className="h-4 w-4 opacity-60 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-1 max-h-72 overflow-y-auto" align="start">
                <label className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer text-sm font-medium border-b border-border mb-1">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => setSelected(allSelected ? [] : members.map(m => m.id))}
                  />
                  Select all
                </label>
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer text-sm">
                    <Checkbox checked={selected.includes(m.id)} onCheckedChange={() => toggle(m.id)} />
                    <span className="truncate">{m.fullName}</span>
                    {m.role === 'manager' && <span className="ml-auto text-xs text-primary">Manager</span>}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={status} onValueChange={v => setStatus(v as ServiceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SERVICE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Close</Button>
          <Button onClick={handleSubmit} disabled={!selected.length || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
