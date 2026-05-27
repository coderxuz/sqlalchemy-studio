import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '../styles.css'
import { Suspense } from 'react'
import Sidebar from '../components/Sidebar'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="app-root min-h-screen flex bg-slate-900 text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6">
        <Suspense fallback={<div>Loading...</div>}>
          <Outlet />
        </Suspense>
      </main>

      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  )
}
