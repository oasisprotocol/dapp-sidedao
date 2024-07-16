import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { useCreatePollData } from './hook';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { DottedProgressIndicator } from '../../components/DottedProgressIndicator';
import { InputField } from '../../components/InputFields/InputField';

export const CreatePollPage = () => {
  const {
    stepTitle,
    stepIndex, numberOfSteps,
    previousStep, nextStep,
    fields,
    createPoll
  } = useCreatePollData()
  // console.log("Current step is", step, ",", stepIndex, "of", numberOfSteps)

  // console.log("Q is", question)
  // console.log("Answers:", answers)

  return (
    <Layout variation="dashboard" >
      <Card>
        <h2>{stepTitle}</h2>
        <p>
          Once created, your poll will be live immediately and responses will start being recorded.
        </p>
        {fields.map( field => <InputField key={field.name} controls={field} />)}
        <div className={classes.buttons}>
          { stepIndex > 0 && <Button onClick={previousStep} color={"secondary"} variant={"outline"} >Back</Button> }
          { stepIndex < numberOfSteps - 1 && <Button onClick={nextStep}>Next</Button> }
          { stepIndex === numberOfSteps - 1 && <Button onClick={createPoll}>Create poll</Button> }

        </div>
        <DottedProgressIndicator steps={ numberOfSteps} currentStepIndex={stepIndex} />
      </Card>
    </Layout>
  )
}