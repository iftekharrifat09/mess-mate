import { motion, Transition } from 'framer-motion';

interface LoadingSkeletonProps {
  type?: 'dashboard' | 'page' | 'card' | 'table';
  count?: number;
}

const shimmerTransition: Transition = {
  repeat: Infinity,
  duration: 1.5,
  ease: 'linear'
};

function ShimmerOverlay({ className = '' }: { className?: string }) {
  return (
    <motion.div 
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-transparent ${className}`}
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={shimmerTransition}
    />
  );
}

function PrimaryShimmer() {
  return (
    <motion.div 
      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none"
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={shimmerTransition}
    />
  );
}

export function LoadingSkeleton({ type = 'page', count = 1 }: LoadingSkeletonProps) {
  if (type === 'dashboard') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <motion.div 
            className="h-8 w-48 bg-muted rounded-lg relative overflow-hidden"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
          >
            <ShimmerOverlay />
          </motion.div>
          <motion.div 
            className="h-4 w-64 bg-muted rounded-lg relative overflow-hidden"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8, delay: 0.1 }}
          >
            <ShimmerOverlay />
          </motion.div>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-64 bg-card rounded-xl border border-border relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="h-10 w-10 bg-muted rounded-lg"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  <motion.div 
                    className="h-6 w-32 bg-muted rounded-lg"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: 0.1 }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((j) => (
                    <motion.div
                      key={j}
                      className="h-16 bg-muted/50 rounded-lg"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: j * 0.1 }}
                    />
                  ))}
                </div>
              </div>
              <PrimaryShimmer />
            </motion.div>
          ))}
        </div>

        {/* Bazar Dates Skeleton */}
        <motion.div
          className="h-48 bg-card rounded-xl border border-border relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="p-6 space-y-4">
            <motion.div 
              className="h-6 w-40 bg-muted rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <div className="flex gap-4">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="h-24 w-32 bg-muted/50 rounded-lg"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15 }}
                />
              ))}
            </div>
          </div>
          <PrimaryShimmer />
        </motion.div>

        {/* Members Skeleton */}
        <div className="space-y-4">
          <motion.div 
            className="h-6 w-32 bg-muted rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-40 bg-card rounded-xl border border-border relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="h-10 w-10 bg-muted rounded-full"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <motion.div 
                      className="h-5 w-24 bg-muted rounded-lg"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: 0.1 }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <motion.div
                        key={j}
                        className="h-8 bg-muted/50 rounded"
                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5, delay: j * 0.1 }}
                      />
                    ))}
                  </div>
                </div>
                <PrimaryShimmer />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <motion.div 
            className="h-8 w-48 bg-muted rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <motion.div 
            className="h-10 w-32 bg-muted rounded-lg"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, delay: 0.1 }}
          />
        </div>
        <motion.div
          className="bg-card rounded-xl border border-border overflow-hidden relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 border-b border-border flex gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="h-6 flex-1 bg-muted rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
              />
            ))}
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="p-4 border-b border-border/50 flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <motion.div
                  key={j}
                  className="h-5 flex-1 bg-muted/50 rounded"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: (i + j) * 0.05 }}
                />
              ))}
            </div>
          ))}
          <PrimaryShimmer />
        </motion.div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(count, 3)}, 1fr)` }}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div
            key={i}
            className="h-48 bg-card rounded-xl border border-border relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="p-6 space-y-4">
              <motion.div 
                className="h-6 w-2/3 bg-muted rounded-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <motion.div
                    key={j}
                    className="h-4 bg-muted/50 rounded"
                    style={{ width: `${100 - j * 15}%` }}
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5, delay: j * 0.1 }}
                  />
                ))}
              </div>
            </div>
            <PrimaryShimmer />
          </motion.div>
        ))}
      </div>
    );
  }

  // Default page loading
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <motion.div 
        className="relative w-16 h-16"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <motion.div 
          className="absolute inset-2 rounded-full border-2 border-primary/30 border-b-transparent"
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </motion.div>
      <motion.p 
        className="text-muted-foreground font-medium"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        Loading...
      </motion.p>
    </div>
  );
}

export default LoadingSkeleton;
