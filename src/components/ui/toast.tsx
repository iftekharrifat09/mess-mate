import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const borderColors: Record<string, string> = {
  default: "linear-gradient(180deg, hsl(280,70%,60%), hsl(330,80%,60%))",
  success: "hsl(142,71%,45%)",
  destructive: "hsl(0,84%,60%)",
  warning: "hsl(45,93%,47%)",
  info: "hsl(217,91%,60%)",
};

const progressColors: Record<string, string> = {
  default: "linear-gradient(90deg, hsl(280,70%,60%), hsl(330,80%,60%))",
  success: "hsl(142,71%,45%)",
  destructive: "hsl(0,84%,60%)",
  warning: "hsl(45,93%,47%)",
  info: "hsl(217,91%,60%)",
};

const variantIcons: Record<string, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "hsl(142,71%,45%)" }} />,
  destructive: <AlertCircle className="h-5 w-5 shrink-0" style={{ color: "hsl(0,84%,60%)" }} />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "hsl(45,93%,47%)" }} />,
  info: <Info className="h-5 w-5 shrink-0" style={{ color: "hsl(217,91%,60%)" }} />,
};

const TOAST_DURATION = 5000;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center overflow-hidden rounded-xl bg-card shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "",
        destructive: "",
        success: "",
        warning: "",
        info: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants> & { duration?: number }
>(({ className, variant, children, duration, ...props }, ref) => {
  const v = variant || "default";
  const icon = variantIcons[v];
  const borderColor = borderColors[v];
  const progressColor = progressColors[v];
  const dur = duration || TOAST_DURATION;

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      duration={dur}
      {...props}
    >
      {/* Left colored border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl"
        style={{ background: borderColor }}
      />
      {/* Content area */}
      <div className="flex items-center gap-3 pl-4 pr-10 py-3.5 w-full">
        {icon}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]">
        <div
          className="h-full toast-progress-bar rounded-b-xl"
          style={{
            background: progressColor,
            animation: `toast-shrink ${dur}ms linear forwards`,
          }}
        />
      </div>
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-50 transition-opacity hover:opacity-100 focus:outline-none",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold text-foreground", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
