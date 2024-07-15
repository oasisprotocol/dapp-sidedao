import { Card } from '../../components/Card';
import { Layout } from '../../components/Layout';
import { useCreatePollData } from './hook';
import { ReactNode } from 'react';
import { TextInput } from '../../components/InputFields/TextInput';
import { TextArrayInput } from '../../components/InputFields/TextArrayInput';
import classes from "./index.module.css"
import { Button } from '../../components/Button';
import { DottedProgressIndicator } from '../../components/DottedProgressIndicator';

export const CreatePollPage = () => {
  const {
    step,
    stepTitle,
    stepIndex, numberOfSteps,
    previousStep, nextStep,
    question,
    description,
    answers,
    createPoll
  } = useCreatePollData()
  // console.log("Current step is", step, ",", stepIndex, "of", numberOfSteps)

  console.log("Q is", question)
  // console.log("Answers:", answers)

  const getCurrentField = (): ReactNode => {

    switch (step) {
      case 'basics':
        return (
          <>
            <TextInput { ...question} />
            <TextInput { ...description} />
            <TextArrayInput { ...answers } />
          </>
        )
      default:
        return <div>I don't know what fields should be displayed here.</div>
    }

  }


  return (
    <Layout variation="dashboard" >
      <Card>
        <h2>{stepTitle}</h2>
        <p>
          Once created, your poll will be live immediately and responses will start being recorded.
        </p>
        { getCurrentField() }
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