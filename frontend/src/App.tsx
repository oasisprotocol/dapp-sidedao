import { FC, ReactNode } from 'react'
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
import { EIP1193ContextProvider } from './providers/EIP1193Provider'
import { Web3ContextProvider } from './providers/Web3Provider'
import { AppStateContextProvider } from './providers/AppStateProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouterErrorBoundary } from './components/RouterErrorBoundary'
import { EthereumContextProvider } from './providers/EthereumProvider'
import { PollPage } from './pages/PollPage'
import { LandingPage } from './pages/LandingPage'
import { useWeb3 } from './hooks/useWeb3'
import { DashboardPage } from './pages/DashboardPage'
import { CreatePollPage } from './pages/CreatePollPage'

export const EnforceWallet: FC<{ content: ReactNode }> = ({ content }) =>
  useWeb3().state.isConnected ? content : <LandingPage />

const router = createHashRouter([
  {
    path: '/',
    element: <Outlet />,
    errorElement: <RouterErrorBoundary />,
    children: [
      {
        path: '',
        element: <EnforceWallet content={<DashboardPage />} />,
      },
      {
        path: 'polls/:pollId',
        element: <PollPage />,
      },
      {
        path: 'create',
        element: <EnforceWallet content={<CreatePollPage />} />,
      },
    ],
  },
])

export const App: FC = () => {
  return (
    <ErrorBoundary>
      <EthereumContextProvider>
        <EIP1193ContextProvider>
          <Web3ContextProvider>
            <AppStateContextProvider>
              <RouterProvider router={router} />
            </AppStateContextProvider>
          </Web3ContextProvider>
        </EIP1193ContextProvider>
      </EthereumContextProvider>
    </ErrorBoundary>
  )
}
