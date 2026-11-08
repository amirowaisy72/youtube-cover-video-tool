import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { AppProvider, useApp } from "@/lib/app-store";
import { SETUP_DOWNLOAD_URL } from "@/lib/setup";
import { TopBar } from "@/components/TopBar";
import { ActiveJobsBar } from "@/components/ActiveJobsBar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    // Route-level errors are shown inline below; nothing to report.
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function LockScreen() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="text-6xl">🔒</div>
      <h1 className="mt-4 text-3xl font-bold">This tool is locked</h1>
      <p className="mt-2 text-muted-foreground">
        Install YT Guru Setup on your computer to unlock all 18 tools.
      </p>
      <a className="btn btn-primary mt-6" href={SETUP_DOWNLOAD_URL}>⬇ Install Setup</a>
      <p className="mt-4 text-sm text-muted-foreground">
        Already installed? Open YT Guru from your computer — or activate your license from the top bar.
      </p>
      <Link to="/" className="btn btn-ghost btn-sm mt-6">← Home</Link>
    </div>
  );
}

/** Tool pages are locked unless the installed setup (with an
    active license) is running. Before the first license check
    lands, pages render normally: the check is a fast same-origin
    call, and the gate engages the moment it lands. */
function LockGate({ children }: { children: ReactNode }) {
  const { unlocked, licenseChecked } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (licenseChecked && !unlocked && pathname !== "/") {
    return <LockScreen />;
  }
  return <>{children}</>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AppProvider>
        <TopBar />
        <ActiveJobsBar />
        <main className="mx-auto max-w-6xl px-6 py-10">
          <LockGate>
            <Outlet />
          </LockGate>
        </main>
      </AppProvider>
    </QueryClientProvider>
  );
}
