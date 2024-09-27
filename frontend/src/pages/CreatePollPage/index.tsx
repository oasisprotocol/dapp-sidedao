import { FC } from 'react'
import { CreatePollForm } from './CreatePollForm'
import { RestrictedContent } from '../RestrictedContent'
import { Helmet } from 'react-helmet-async'
import { defaultMetatags } from '../../components/metatags'
import { appName } from '../../constants/config'

export const CreatePollPage: FC = () => {
  const title = `Create a new poll with ${appName}`
  return (
    <>
      <Helmet>
        {...defaultMetatags}
        <title>{title}</title>
        <meta name="twitter:title" content={title} />
        <meta property="og:title" content={title} />,
        <meta property="og:url" content={`appRootUrl/$/create`} />
      </Helmet>
      <RestrictedContent>
        <CreatePollForm />
      </RestrictedContent>
    </>
  )
}
