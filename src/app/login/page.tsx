import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Branch ops</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Don Macchiatos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Record daily sales and expenses for Don Mac, Don Lemon, and Yogurt.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
