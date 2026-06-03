import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { KanbanPage } from "@/pages/KanbanPage";
import { ReactivationPage } from "@/pages/ReactivationPage";
import { PostSalePage } from "@/pages/PostSalePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientsPage } from "@/pages/ClientsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <KanbanPage /> },
      { path: "reativacao", element: <ReactivationPage /> },
      { path: "pos-venda", element: <PostSalePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "clientes", element: <ClientsPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
