import { SignIn } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">CumplIA</h1>
            <p className="text-muted-foreground">
              La normativa colombiana convertida en un agente que vigila la ley por tu empresa.
            </p>
          </div>
          <SignIn />
        </div>
      </Card>
    </div>
  );
}
