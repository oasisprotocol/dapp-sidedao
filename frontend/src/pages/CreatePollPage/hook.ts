import { useEffect, useState } from 'react';
// import { AbiCoder } from "ethers";
import { AclOptions, Poll, PollManager } from "../../types"
import { InputFieldControls, useTextArrayField, useTextField } from '../../components/InputFields/hooks';
import { useEthereum } from '../../hooks/useEthereum';
import { encryptJSON } from '../../utils/crypto.demo';
import { Pinata } from '../../utils/Pinata';
import { useContracts } from '../../hooks/useContracts';

type CreationStep = "basics" | "permission" | "results"




const acl_allowAll = import.meta.env.VITE_CONTRACT_ACL_ALLOWALL;

export const useCreatePollData = () => {
  const eth = useEthereum()
  const { pollManagerWithSigner: daoSigner} = useContracts(eth)

  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [step, setStep] = useState<CreationStep>("basics");

  const [stepIndex, setStepIndex] = useState(0);

  const process: CreationStep[] = ["basics", "permission", "results"]

  const numberOfSteps = process.length

  const StepTitle: Record<CreationStep, string> = {
    basics : "Poll creation",
    permission: "Pre-vote settings",
    results : "Results settings",
  }


  useEffect(() => {
    setStepIndex(process.indexOf(step))
  }, [step]);

  const previousStep = () => {
    if (stepIndex === 0) return
    setStep(process[stepIndex - 1])
  }

  const nextStep = () => {
    if (stepIndex === numberOfSteps - 1) return
    const correct = stepFields[step].map(field => field.validate())
    if (!correct.every(e => e)) return
    setStep(process[stepIndex + 1])
  }

  const init = () => {
    setStep("basics")
  }

  const question = useTextField({
    name: "question",
    label: "Question",
    placeholder: "Your question",
    required: true,
    minLength: 10,
    // maxLength: 20,
    requiredMessage: "Please specify the question for your poll!"
  })

  const description = useTextField({
    name: "description",
    label: "Description",
    placeholder: "Please elaborate the question, if you want to.",
  })

  const answers = useTextArrayField({
    name: "answers",
    label: "Answers",
    description: "You need at least 2 answers in order to create this poll.",
    addLabel: "Add answer",
    removeLabel: "Remove this answer",
    minCount: 2,
    placeholderTemplate: (index) => `Answer ${index + 1}`,
    canRemoveElement: (index, field) => index === field.numberOfValues - 1,
  })


  async function getACLOptions(): Promise<[string, AclOptions]> {
    const acl = acl_allowAll;
    // const abi = AbiCoder.defaultAbiCoder();
    return [
      '0x', // Empty bytes is passed
      {
        address: acl,
        options: { allowAll: true },
      },
    ];
  }

  const stepFields: Record<CreationStep, InputFieldControls<any>[]> = {
    basics: [question, answers],
    permission: [],
    results: [],
  }

  const doCreatePoll = async () => {
    // TODO: check for any errors

    const [aclData, aclOptions] = await getACLOptions();

    const poll: Poll = {
      creator: eth.state.address!,
      name: question.value,
      description: description.value,
      choices: answers.value,
      options: {
        publishVotes: false, // publishVotes.value,
        closeTimestamp: 0, //toValue(expirationTime) ? toValue(expirationTime)!.valueOf() / 1000 : 0,
      },
      acl: aclOptions,
    };

    const { key, cipherbytes } = encryptJSON(poll);

    const ipfsHash = await Pinata.pinData(cipherbytes);
    console.log('Poll ipfsHash', ipfsHash);

    const proposalParams: PollManager.ProposalParamsStruct = {
      ipfsHash,
      ipfsSecret: key,
      numChoices: answers.value.length,
      publishVotes: poll.options.publishVotes,
      closeTimestamp: poll.options.closeTimestamp,
      acl: acl_allowAll, // toValue(chosenPollACL),
    };

    const createProposalTx = await daoSigner!.create(proposalParams, aclData, {
      // Provide additional subsidy
      value: 10, //toValue(subsidyAmount) ?? 0n,
    });
    console.log('doCreatePoll: creating proposal tx', createProposalTx.hash);

    const receipt = (await createProposalTx.wait())!;
    if (receipt.status !== 1) {
      throw new Error('createProposal tx receipt reported failure.');
    }
    const proposalId = receipt.logs[0].data;

    console.log('doCreatePoll: Proposal ID', proposalId);


  }

  const createPoll = async () => {
    console.log("Should create poll", question.value)

    setIsCreating(true)
    try {
      const newId = await doCreatePoll()
      console.log("Created new poll", newId)
    } catch (ex) {
      console.log("Failed to create poll", ex)
    } finally {
      setIsCreating(false)
    }

  }

  return {
    step,
    stepTitle: StepTitle[step],
    stepIndex,
    numberOfSteps,
    previousStep,
    nextStep,
    init,
    question,
    description,
    answers,
    isCreating,
    createPoll
  }

}