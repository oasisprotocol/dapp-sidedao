import { FC } from 'react';
import { useEthereum } from '../../hooks/useEthereum';
import { useDashboardData } from '../../hooks/useDashboardData';
import { Alert } from '../../components/Alert';
import { PollCard } from '../../components/PollCard';
import { Layout } from '../../components/Layout';
import classes from './index.module.css';

export const DashboardPage: FC = () => {

  const eth = useEthereum();
  const {
    myPolls,
    otherPolls,
    isLoadingPolls,
  } = useDashboardData(eth);

  return (
    <Layout variation="dashboard">
      <h2>My polls</h2>
      { isLoadingPolls ? (
        <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
      ) : (
        <div className={ classes.pollCardList }>
          { myPolls.map((poll) => <PollCard key={poll.id} poll={poll} />) }
        </div>
      )}
      <h2>Explore polls</h2>
      { isLoadingPolls ? (
        <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
      ) : (
        <div className={ classes.pollCardList }>
          { otherPolls.map((poll) => <PollCard key={poll.id} poll={poll} />) }
        </div>
      )}
    </Layout>
  )
}
