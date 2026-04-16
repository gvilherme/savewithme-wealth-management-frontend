import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { BudgetSetupPage } from '@/pages/BudgetSetupPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    element: <DashboardPage /> },
      { path: 'accounts',     element: <AccountsPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'budgets/setup', element: <BudgetSetupPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
