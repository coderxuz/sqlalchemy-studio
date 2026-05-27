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
    <div className="app-root flex min-h-screen flex-col bg-neutral-950 text-neutral-100 lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:overflow-auto lg:p-6">
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
