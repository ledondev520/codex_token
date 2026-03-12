import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

export function SectionCard({ title, description, actions, children, className = "" }) {
  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-5">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
