import { Layout } from '../../components/Layout';
import { FC } from 'react';
import { useEthereum } from '../../hooks/useEthereum';
import { usePollData } from '../../hooks/usePollData';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/Alert';
import { CompletedPoll } from './CompletedPoll';
import { ActivePoll } from './ActivePoll';
import { EnforceWallet } from '../../App';
import { ThanksForVote } from './ThanksForVoting';

const PollLoading: FC = () => {
  return (
    <Layout variation="light">
      <Alert headerText="Please wait" type="loading" actions={<span>Fetching poll...</span>} />
    </Layout>
  )
}

export const PollPage: FC = () => {
  const eth = useEthereum()
  const { pollId} = useParams()
  const {
    isLoading,
    error,
    poll : loadedPoll,
    active,
    remainingTime,
    remainingTimeString,
    hasVoted,
    existingVote,
    // isClosed,
    selectedChoice, setSelectedChoice, canSelect,
    canVote, vote, isVoting,
    pollResults,
  } = usePollData(eth, pollId!)
  // console.log("Error:", error, "poll?", !!loadedPoll)
  if (error) {
    return <Layout variation={"landing"}><Alert type='error' headerText={error} /></Layout>
  }
  const poll = loadedPoll?.ipfsParams
  if (isLoading || !poll) return <PollLoading />

  if (hasVoted) {
    if (existingVote) {
      return (
        <Layout variation={"dark"}>
          <ThanksForVote poll={poll} myVote={existingVote} remainingTime={remainingTime} remainingTimeString={remainingTimeString} />
        </Layout>
      )
    } else {
      console.log("Inconsistent state: hasVoted, but no existingVote")
      return <Layout variation={"landing"}><Alert type='error' headerText={"Internal error"} /></Layout>
    }
  }


  // TODO: show something special if the poll has just been closed (isClosed)

  if (active) {
    return <EnforceWallet content={
      <Layout variation="light">
        <ActivePoll
          poll={poll}
          remainingTime={remainingTime}
          remainingTimeString={remainingTimeString}
          selectedChoice={selectedChoice}
          canSelect={canSelect}
          setSelectedChoice={setSelectedChoice}
          canVote={canVote}
          vote={vote}
          isVoting={isVoting}
        />
      </Layout>
    } />
  } else {
    if (!pollResults) return <PollLoading />
    return (
      <Layout variation="dark">
        <CompletedPoll poll={poll} results={pollResults}/>
      </Layout>
    )

  }
}