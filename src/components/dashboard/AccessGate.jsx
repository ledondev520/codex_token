import { Button } from "../ui/button.jsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card.jsx";
import { Input } from "../ui/input.jsx";
import { Label } from "../ui/label.jsx";

export function AccessGate({ password, errorMessage, onPasswordChange, onSubmit }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-8">
      <Card className="w-full rounded-2xl border shadow-lg bg-card/50 backdrop-blur-xl transition-all">
        <CardHeader className="space-y-3 pb-6 border-b border-border/40">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary/80">
            Codex Local Dashboard
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">安全访问验证</CardTitle>
          <CardDescription className="text-sm sm:text-[15px] leading-relaxed">
            首次访问需要验证密码。验证一次后浏览器会自动记住，直到你手动重新锁定。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={onSubmit}>
             <div className="space-y-3">
               <Label htmlFor="access-password" className="text-[14px] font-semibold text-foreground">访问密码</Label>
               <Input
                 id="access-password"
                 type="password"
                 autoComplete="current-password"
                 inputMode="numeric"
                 placeholder="请输入 6 位访问密码"
                 className="h-12 text-center text-xl tracking-[0.2em] font-mono shadow-inner bg-muted/30 focus:bg-background transition-colors"
                 value={password}
                 onChange={(event) => onPasswordChange(event.target.value)}
               />
             </div>
             {errorMessage ? (
               <p className="text-sm font-medium text-destructive text-center bg-destructive/10 py-2 rounded-md transition-all">{errorMessage}</p>
             ) : null}
             <Button className="w-full h-12 text-base font-semibold shadow-md active:scale-[0.98] transition-all" type="submit">允许进入页面</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
