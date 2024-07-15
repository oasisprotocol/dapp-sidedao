import { FC } from 'react';
import { useDashboardData } from './hook';
import { Alert } from '../../components/Alert';
import { PollCard } from '../../components/PollCard';
import { Layout } from '../../components/Layout';
import classes from './index.module.css';

export const DashboardPage: FC = () => {
  const {
    myPolls,
    otherPolls,
    isLoadingPolls,
  } = useDashboardData();

  return (
    <Layout variation="dashboard">
      <div className={classes.dashboardMain}>
        <div className={classes.dashboardMyColumn}>
          <div className={classes.dashboardLabel}>My polls</div>
          {isLoadingPolls
            ? <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
            : myPolls.map((poll) => <PollCard key={poll.id} poll={poll} />)
          }
        </div>
        <div className={classes.dashboardOtherColumn}>
          <div className={classes.dashboardLabel}>Explore polls</div>
          {isLoadingPolls
            ? <Alert headerText="Please wait" type="loading" actions={<span>Fetching polls...</span>} />
            : otherPolls.map((poll) => <PollCard key={poll.id} poll={poll} />)
          }
        </div>
      </div>
    </Layout>
  )
}
