import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { useCreatePollForm } from './useCreatePollForm';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { DottedProgressIndicator } from '../../components/DottedProgressIndicator';
import { InputFieldGroup } from '../../components/InputFields';

export const CreatePollPage = () => {
  const {
    stepTitle,
    stepIndex, numberOfSteps,
    validationPending,
    previousStep, nextStep,
    fields,
    hasErrorsOnCurrentPage,
    createPoll
  } = useCreatePollForm()

  return (
    <Layout variation="dashboard" >
      <Card>
        <h2>{stepTitle}</h2>
        <p>
          Once created, your poll will be live immediately and responses will start being recorded.
        </p>
        <InputFieldGroup fields={fields} />
        <div className={classes.buttons}>
          { stepIndex > 0 && <Button onClick={previousStep} color={"secondary"} variant={"outline"} >Back</Button> }
          { stepIndex < numberOfSteps - 1 && <Button onClick={nextStep} pending={validationPending}>Next</Button> }
          { stepIndex === numberOfSteps - 1 && <Button onClick={createPoll} disabled={hasErrorsOnCurrentPage}>Create poll</Button> }
        </div>
      </Card>
      <DottedProgressIndicator steps={ numberOfSteps} currentStepIndex={stepIndex} />
    </Layout>
  )
}