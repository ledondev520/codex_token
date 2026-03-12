import React from "react";

import { cn } from "@/lib/utils.js";

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="status"
    className={cn(
      "relative w-full rounded-lg border px-4 py-3 text-sm",
      variant === "muted"
        ? "border-dashed border-border bg-muted/35 text-muted-foreground"
        : "border-border bg-card text-card-foreground",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("leading-6", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
