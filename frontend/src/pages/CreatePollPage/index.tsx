import { FC } from 'react'
import { CreatePollForm } from './CreatePollForm'
import { RestrictedContent } from '../RestrictedContent'

export const CreatePollPage: FC = () => {
  // TODO: set meta tags
  return (
    <RestrictedContent>
      <CreatePollForm />
    </RestrictedContent>
  )
}
