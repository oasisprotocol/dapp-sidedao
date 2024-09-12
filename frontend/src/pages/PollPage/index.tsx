import { Layout } from '../../components/Layout'
import { FC } from 'react'
import { usePollData } from './hook'
import { useParams } from 'react-router-dom'
import { Alert } from '../../components/Alert'
import { CompletedPoll } from './CompletedPoll'
import { ActivePoll } from './ActivePoll'
// import { EnforceWallet } from '../../App';
import { ThanksForVote } from './ThanksForVoting'

const PollLoading: FC = () => {
  return (
    <Layout variation="light">
      <Alert headerText="Please wait" type="loading" actions={<span>Fetching poll...</span>} />
    </Layout>
  )
}

const WaitingForResults: FC = () => {
  return (
    <Layout variation="light">
      <Alert
        headerText="Poll closed, please wait"
        type="loading"
        actions={<span>Waiting for results to land...</span>}
      />
    </Layout>
  )
}

export const PollPage: FC = () => {
  const { pollId } = useParams()
  const pollData = usePollData(pollId!)
  const { isLoading, error, poll, active, hasVoted, existingVote, hasClosed, pollResults } = pollData
  if (error) {
    return (
      <Layout variation={'landing'}>
        <Alert type="error" headerText={error} />
      </Layout>
    )
  }

  // Closed poll, now waiting for results
  if (hasClosed) return <WaitingForResults />

  // Currently loading stuff
  if (isLoading || !poll?.ipfsParams) return <PollLoading />

  // You have voted. Thanks!
  if (hasVoted && active) {
    if (existingVote !== undefined) {
      return (
        <Layout variation={'dark'}>
          <ThanksForVote {...pollData} />
        </Layout>
      )
    } else {
      console.log('Inconsistent state: hasVoted, but no existingVote')
      return (
        <Layout variation={'landing'}>
          <Alert type="error" headerText={'Internal error'} />
        </Layout>
      )
    }
  }

  // Active vote
  if (active) {
    return (
      <Layout variation="light">
        <ActivePoll {...pollData} />
      </Layout>
    )
  } else {
    // Completed vote
    if (!pollResults) return <PollLoading />
    return (
      <Layout variation="dark">
        <CompletedPoll {...pollData} />
      </Layout>
    )
  }
}
