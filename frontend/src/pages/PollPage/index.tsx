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

const WaitingForResults: FC = () => {
  return (
    <Layout variation="light">
      <Alert headerText="Poll closed, please wait" type="loading" actions={<span>Waiting for results to land...</span>} />
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
    selectedChoice, setSelectedChoice, canSelect,
    canVote, gaslessPossible, vote, isVoting,
    isMine,
    canClosePoll,
    closePoll,
    isClosing,
    hasClosed,
    pollResults,
  } = usePollData(eth, pollId!)
  // console.log("Error:", error, "poll?", !!loadedPoll)
  // console.log("Has voted?", hasVoted, "existingVote:", existingVote, "active?", active, "hasClosed:", hasClosed)
  if (error) {
    return <Layout variation={"landing"}><Alert type='error' headerText={error} /></Layout>
  }

  const poll = loadedPoll?.ipfsParams

  // Closed poll, now waiting for results
  if (hasClosed) return <WaitingForResults />

  // Currently loading stuff
  if (isLoading || !poll) return <PollLoading />

  // You have voted. Thanks!
  if (hasVoted && active) {
    if (existingVote !== undefined) {
      return (
        <Layout variation={"dark"}>
          <ThanksForVote
            poll={poll}
            myVote={existingVote}
            remainingTime={remainingTime}
            remainingTimeString={remainingTimeString}
            isMine={isMine}
            canClose={canClosePoll}
            closePoll={closePoll}
            isClosing={isClosing}
          />
        </Layout>
      )
    } else {
      console.log("Inconsistent state: hasVoted, but no existingVote")
      return <Layout variation={"landing"}><Alert type='error' headerText={"Internal error"} /></Layout>
    }
  }

  // Active vote
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
          gaslessPossible={gaslessPossible}
          vote={vote}
          isVoting={isVoting}
          isMine={isMine}
          canClose={canClosePoll}
          isClosing={isClosing}
          closePoll={closePoll}
        />
      </Layout>
    } />
  } else {
    // Completed vote
    if (!pollResults) return <PollLoading />
    return (
      <Layout variation="dark">
        <CompletedPoll poll={poll} results={pollResults} isMine={isMine}/>
      </Layout>
    )

  }
}