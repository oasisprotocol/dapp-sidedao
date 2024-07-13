import { Layout } from '../../components/Layout';
import { FC } from 'react';
import { useEthereum } from '../../hooks/useEthereum';
import { usePollData } from '../../hooks/usePollData';
import { useParams } from 'react-router-dom';
import { Poll } from '../../types';
import { Alert } from '../../components/Alert';
// import classes from "./index.module.css"
import { CompletedPollPage } from './CompletedPollPage';

const PollLoadingPage: FC = () => {
  return (
    <Layout variation="light">
      <Alert headerText="Please wait" type="loading" actions={<span>Fetching poll...</span>} />
    </Layout>
  )
}

const ActivePollPage: FC<{poll: Poll}> = ({poll}) => {
  return (
    <Layout variation="light">
      <div>
        Active poll: {poll.name}
      </div>
    </Layout>
  )
}

export const PollPage: FC = () => {
  const eth = useEthereum()
  const { pollId} = useParams()
  const {
    error,
    poll : loadedPoll,
    active,
    // hasVoted,
    // existingVote,
    // isClosed,
    pollResults,
  } = usePollData(eth, pollId!)
  // console.log("Error:", error, "poll?", !!loadedPoll)
  if (error) {
    return <Layout variation={"landing"}><Alert type='error' headerText={error} /></Layout>
  }
  const poll = loadedPoll?.ipfsParams
  if (!poll) return <PollLoadingPage />

  // TODO: show something special if just voted (hasVoted)
  // TODO: show something special if the poll has just been closed (isClosed)

  if (active) {
    return <ActivePollPage poll={poll} />
  } else {
    if (!pollResults) return <PollLoadingPage />
    return <CompletedPollPage poll={poll} results={pollResults}/>
  }
}