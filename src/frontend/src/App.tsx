import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { PlayerProvider } from "@/context/PlayerContext";
import { HomePage } from "@/pages/HomePage";
import { LibraryPage } from "@/pages/LibraryPage";
import { PlaylistPage } from "@/pages/PlaylistPage";
import { SearchPage } from "@/pages/SearchPage";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useParams,
} from "@tanstack/react-router";

// Export Link and navigation utilities for use in components
export { Link, useParams };

const rootRoute = createRootRoute({
  component: () => (
    <PlayerProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "oklch(0.17 0.022 270)",
            border: "1px solid oklch(0.28 0.03 270)",
            color: "oklch(0.96 0.008 270)",
          },
        }}
      />
    </PlayerProvider>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: LibraryPage,
});

const playlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/playlist/$id",
  component: PlaylistPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  searchRoute,
  libraryRoute,
  playlistRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
