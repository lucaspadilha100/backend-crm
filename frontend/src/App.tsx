import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { KanbanPage } from "@/pages/KanbanPage";
import { StalledPage } from "@/pages/StalledPage";
import { ReactivationPage } from "@/pages/ReactivationPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientsPage } from "@/pages/ClientsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <KanbanPage /> },
      { path: "parados", element: <StalledPage /> },
      { path: "reativacao", element: <ReactivationPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "clientes", element: <ClientsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
