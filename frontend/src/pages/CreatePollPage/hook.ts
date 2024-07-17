import { useEffect, useState } from 'react';
// import { AbiCoder } from "ethers";
import { AclOptions, Poll, PollManager } from "../../types"
import { InputFieldControls  } from '../../components/InputFields/useInputField';
import { useEthereum } from '../../hooks/useEthereum';
import { encryptJSON } from '../../utils/crypto.demo';
import { Pinata } from '../../utils/Pinata';
import { useContracts } from '../../hooks/useContracts';
import { useTextField } from '../../components/InputFields/useTextField';
import { useTextArrayField } from '../../components/InputFields/useTextArrayField';
import { useBooleanField } from '../../components/InputFields/useBoolField';
import { useOneOfField } from '../../components/InputFields/useOneOfField';

type CreationStep = "basics" | "permission" | "results"

const process: CreationStep[] = ["basics", "permission", "results"]

const StepTitle: Record<CreationStep, string> = {
  basics : "Poll creation",
  permission: "Pre-vote settings",
  results : "Results settings",
}

const numberOfSteps = process.length

const acl_allowAll = import.meta.env.VITE_CONTRACT_ACL_ALLOWALL;

type AccessControlMethod = "acl_allowAll" | "acl_tokenHolders" | "acl_allowList" | "acl_xchain"

// type VoteWeightingMethod = "weight_perWallet" | "weight_perToken"

export const useCreatePollData = () => {
  const eth = useEthereum()
  const { pollManagerWithSigner: daoSigner} = useContracts(eth)
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [step, setStep] = useState<CreationStep>("basics");
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(process.indexOf(step))
  }, [step]);

  const goToPreviousStep = () => {
    if (stepIndex === 0) return
    setStep(process[stepIndex - 1])
  }

  const goToNextStep = () => {
    if (stepIndex === numberOfSteps - 1) return
    const correct = stepFields[step]
      .filter(field => field.visible)
      .map(field => field.validate())
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
    requiredMessage: "Please specify the question for your poll!",

    minLength: [10, minLength => `Please describe the question using at least ${minLength} characters!`],

    maxLength: [20, maxLength => `Please state the question in more more than ${maxLength} characters!`],
  })

  const description = useTextField({
    name: "description",
    label: "Description",
    placeholder: "Please elaborate the question, if you want to.",
    required: true,
    hidden: true,
  })

  const answers = useTextArrayField({
    name: "answers",
    label: "Answers",
    addItemLabel: "Add answer",
    removeItemLabel: "Remove this answer",

    initialItemCount: 3, // Let's start with 3 answers.
    placeholderTemplate: (index) => `Answer ${index + 1}`,
    minItems: [2, minCount => `You need at least ${minCount} answers in order to create this poll.`],
    maxItem: [10, maxCount => `Please don't offer more than ${maxCount} answers.`],
    allowDuplicates: [false, "The same answer appears more than once!"],
    allowEmptyItems: [false, "Please either fill this in, or remove this answer."],
    minItemLength: [3, minLength => `Please use at least ${minLength} characters for this answer.`],
    // maxItemLength: [10, maxLength => `Please don't use more than ${maxLength} characters for this answer.`],

    // Only the last item can be removed
    // canRemoveElement: (index, field) => index === field.numberOfValues - 1,
  })

  const customCSS = useBooleanField({
    name: "customCSS",
    label: "I want to create a customized theme for the poll",
  })

  const accessControlMethod = useOneOfField<AccessControlMethod>({
    name: "accessControlMethod",
    label: "Who can vote",
    choices: [
      { value: "acl_allowAll", label: "Everybody" },
      { value: "acl_tokenHolders", label: "Holds Token on Sapphire" },
      { value: "acl_allowList", label: "Address Whitelist", description: 'You can specify a list of addresses that are allowed to vote.' },
      { value: "acl_xchain", label: "Cross-Chain DAO", description: "You can set a condition that is evaluated on another chain." },
    ],
    initialValue: "acl_allowAll",
  })

  const tokenAddress = useTextField({
    name: "tokenAddress",
    label: "Token Address",
    visible: accessControlMethod.value === "acl_tokenHolders",
  })

  const isValidAddress = (address: string) => address.startsWith("0"); // TODO

  const addressWhitelist = useTextArrayField({
    name: "addressWhitelist",
    label: "Acceptable Addresses",
    addItemLabel: "Add address",
    removeItemLabel: "Remove address",
    visible: accessControlMethod.value === "acl_allowList",
    allowEmptyItems: [false, "Please specify address, or remove this field!"],
    minItems: 1,
    allowDuplicates: [false, "The same address appears more than once!"],
    itemValidator: value => (value && !isValidAddress(value)) ? "This doesn't seem to be a valid address." : undefined,
  })

  const gasFree = useBooleanField({
    name: "gasless",
    label: "Make this vote gas-free",
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
    basics: [question, description, answers, customCSS],
    permission: [accessControlMethod, tokenAddress, addressWhitelist, gasFree],
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
    // step,
    stepTitle: StepTitle[step],
    stepIndex,
    numberOfSteps,
    fields: stepFields[step],
    previousStep: goToPreviousStep,
    nextStep: goToNextStep,
    init,
    // question,
    // description,
    // answers,
    isCreating,
    createPoll
  }

}