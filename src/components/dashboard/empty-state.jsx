import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

export function EmptyState({ children, className }) {
  return (
    <Alert variant="muted" className={className}>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
