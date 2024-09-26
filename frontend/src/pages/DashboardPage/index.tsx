import { FC } from 'react'
import { RestrictedContent } from '../RestrictedContent'
import { Dashboard } from './Dashboard'
import { Helmet } from 'react-helmet-async'
import { appNameAndTagline, appRootUrl } from '../../constants/config'
import { defaultMetatags } from '../../components/metatags'

export const DashboardPage: FC = () => {
  return (
    <>
      <Helmet>
        {...defaultMetatags}
        <title>{appNameAndTagline}</title>
        <meta name="twitter:title" content={appNameAndTagline} />
        ,
        <meta property="og:title" content={appNameAndTagline} />,
        <meta property="og:url" content={appRootUrl} />
      </Helmet>
      <RestrictedContent>
        <Dashboard />
      </RestrictedContent>
    </>
  )
}
