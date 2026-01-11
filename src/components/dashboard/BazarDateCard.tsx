import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BazarDate, User } from '@/types';
import { ShoppingCart, Calendar } from 'lucide-react';
import { format, isToday, isFuture, isPast } from 'date-fns';

interface BazarDateCardProps {
  bazarDates: BazarDate[];
  members: User[];
}

export default function BazarDateCard({ bazarDates = [], members = [] }: BazarDateCardProps) {
  const getMemberName = (userId: string) => {
    return members.find(m => m.id === userId)?.fullName || 'Unknown';
  };

  // Ensure bazarDates is always an array
  const safeBazarDates = Array.isArray(bazarDates) ? bazarDates : [];
  
  const sortedDates = [...safeBazarDates].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingDates = sortedDates.filter(d => isToday(new Date(d.date)) || isFuture(new Date(d.date)));
  const pastDates = sortedDates.filter(d => isPast(new Date(d.date)) && !isToday(new Date(d.date)));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Bazar Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {safeBazarDates.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No bazar dates scheduled</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {upcomingDates.map((bazar, index) => {
              const isTodayDate = isToday(new Date(bazar.date));
              return (
                <motion.div
                  key={bazar.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    isTodayDate 
                      ? 'bg-primary/10 border-2 border-primary animate-pulse' 
                      : 'bg-muted/50 hover:bg-muted'
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
                        {format(new Date(bazar.date), 'EEE, MMM d')}
                      </p>
                    </div>
                  </div>
                  {isTodayDate && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full"
                    >
                      Today!
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}