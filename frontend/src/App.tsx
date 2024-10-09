import { FC } from 'react'
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { EIP1193ContextProvider } from './providers/EIP1193Provider'
import { Web3ContextProvider } from './providers/Web3Provider'
import { AppStateContextProvider } from './providers/AppStateProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouterErrorBoundary } from './components/RouterErrorBoundary'
import { EthereumContextProvider } from './providers/EthereumProvider'
import { PollPage } from './pages/PollPage'
import { DashboardPage } from './pages/DashboardPage'
import { CreatePollPage } from './pages/CreatePollPage'
import { ContractContextProvider } from './providers/ContractProvider'

const router = createHashRouter([
  {
    path: '/',
    element: <Outlet />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        path: '',
        element: <DashboardPage />,
      },
      {
        path: 'polls/:pollId',
        element: <PollPage />,
      },
      {
        path: 'create',
        element: <CreatePollPage />,
      },
    ],
  },
])

export const App: FC = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <EthereumContextProvider>
          <ContractContextProvider>
            <EIP1193ContextProvider>
              <Web3ContextProvider>
                <AppStateContextProvider>
                  <RouterProvider router={router} />
                </AppStateContextProvider>
              </Web3ContextProvider>
            </EIP1193ContextProvider>
          </ContractContextProvider>
        </EthereumContextProvider>
      </ErrorBoundary>
    </HelmetProvider>
  )
}
