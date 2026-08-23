import { SignUp } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2">ComplAI</h1>
        <p className="text-muted-foreground">
          La normativa colombiana convertida en un agente que vigila la ley por tu empresa.
        </p>
      </div>
      <SignUp />
    </div>
  );
}
