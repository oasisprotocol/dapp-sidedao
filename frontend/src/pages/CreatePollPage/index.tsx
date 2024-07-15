import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';

export const CreatePollPage = () => {
  return (
    <Layout variation="dashboard" >
      <Card>
        <h2>Poll creation</h2>
        <p>
          Once created, your poll will be live immediately and responses will start being recorded.
        </p>
      </Card>
    </Layout>
  )
}