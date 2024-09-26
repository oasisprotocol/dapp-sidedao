import { FC } from 'react'
import { RestrictedContent } from '../RestrictedContent'
import { Dashboard } from './Dashboard'

export const DashboardPage: FC = () => {
  // TODO: set meta tags
  return (
    <RestrictedContent>
      <Dashboard />
    </RestrictedContent>
  )
}
