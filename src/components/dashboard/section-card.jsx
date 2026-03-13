import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { cn } from "@/lib/utils.js";

export function SectionCard({ title, description, actions, children, className = "" }) {
  return (
    <Card className={cn("min-w-0 overflow-hidden rounded-2xl", className)}>
      <CardHeader className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          {description ? <CardDescription className="max-w-3xl leading-6">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="w-full min-w-0 sm:w-auto sm:shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className="min-w-0 pt-0">{children}</CardContent>
    </Card>
  );
}
