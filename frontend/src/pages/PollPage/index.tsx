import { Layout } from '../../components/Layout';
import { FC } from 'react';
import { useEthereum } from '../../hooks/useEthereum';
import { usePollData } from '../../hooks/usePollData';
import { useParams } from 'react-router-dom';
import { Poll } from '../../types';
import { Alert } from '../../components/Alert';
// import classes from "./index.module.css"
import { CompletedPollPage } from './CompletedPollPage';

const ActivePollLoadingPage: FC = () => {
  return (
    <Layout variation="light">
      <Alert headerText="Please wait" type="loading" actions={<span>Fetching poll...</span>} />
    </Layout>
  )
}

const CompletedPollLoadingPage = ActivePollLoadingPage // TODO

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
    poll : loadedPoll,
    active,
    // hasVoted,
    // existingVote,
    // isClosed,
    pollResults,
  } = usePollData(eth, pollId!)
  const poll = loadedPoll?.ipfsParams

  // TODO: show something special if just voted (hasVoted)
  // TODO: show something special if the poll has just been closed (isClosed)

  if (active) {
    return poll ? <ActivePollPage poll={poll} /> : <ActivePollLoadingPage />
  } else {
    if (!poll || !pollResults) return <CompletedPollLoadingPage />
    return <CompletedPollPage poll={poll} results={pollResults}/>
  }
}