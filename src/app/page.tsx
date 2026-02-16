import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase-server';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center border-b">
        <Link className="flex items-center justify-center" href="/">
          <span className="font-bold text-xl">DeepResearch AI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          {user ? (
            <Button asChild variant="outline">
              <Link href="/deep_research">Go to App</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/login">Login</Link>
            </Button>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Intelligent Iterative Research
                </h1>
                <p className="mx-auto max-w-[700px] text-zinc-500 md:text-xl dark:text-zinc-400">
                  Execute complex research tasks with our agentic AI. 
                  Get deep insights and comprehensive reports in minutes.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg">
                  <Link href={user ? "/deep_research" : "/login"}>
                    {user ? "Enter Workspace" : "Get Started"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          © 2026 DeepResearch AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
