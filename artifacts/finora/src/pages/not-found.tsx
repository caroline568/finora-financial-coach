import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <div className="w-10 h-10 bg-primary rounded-full" />
        </div>
        <h1 className="text-4xl font-display font-bold">Lost your way?</h1>
        <p className="text-muted-foreground text-lg">
          It looks like this path doesn't lead to any financial clarity. Let's get you back to safe ground.
        </p>
        <div className="pt-4">
          <Link href="/" className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            Return to Finora
          </Link>
        </div>
      </div>
    </div>
  );
}
