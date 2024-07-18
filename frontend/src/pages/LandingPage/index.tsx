import { FC } from 'react';
import { Layout } from '../../components/Layout';
import { ConnectWallet } from '../../components/ConnectWallet';
import classes from "./index.module.css"

export const LandingPage: FC = () => (
  <Layout variation={'landing'}>
    <div className={classes.landing}>
      <h2>
        Welcome to SideDAO, a poll creation tool for your DAO.
      </h2>
      To participate in a poll or create one, please connect your wallet above. This ensures secure and verified
      interaction with the polling system.
      {/*View Demo*/}
      <ConnectWallet mobileSticky={false} />
    </div>
  </Layout>
)

