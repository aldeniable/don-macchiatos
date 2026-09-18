"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { isDemoMode } from "@/lib/config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  const demo = isDemoMode();

  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {demo ? (
        <Alert>
          <AlertDescription>
            Demo mode. Use <span className="font-medium">superadmin@demo.local</span>,{" "}
            <span className="font-medium">admin@demo.local</span>, or{" "}
            <span className="font-medium">user@demo.local</span> with password{" "}
            <span className="font-medium">demo</span>.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12 text-base"
          defaultValue={demo ? "admin@demo.local" : undefined}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 text-base"
          defaultValue={demo ? "demo" : undefined}
        />
      </div>
      <Button type="submit" disabled={pending} className="h-12 text-base">
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
