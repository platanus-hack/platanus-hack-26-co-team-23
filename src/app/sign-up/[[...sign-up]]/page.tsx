import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 p-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold mb-2">CumplAI</h1>
        <p className="text-muted-foreground">
          La normativa colombiana convertida en un agente que vigila la ley por tu empresa.
        </p>
      </div>
      <SignUp />
    </div>
  );
}
