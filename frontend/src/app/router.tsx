import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { FilesPage } from '@/pages/FilesPage'
import { TasksPage } from '@/pages/TasksPage'
import { ActionPlansPage } from '@/pages/ActionPlansPage'
import { ActivityPage } from '@/pages/ActivityPage'
import { SettingsPage } from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'files', element: <FilesPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'action-plans', element: <ActionPlansPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
