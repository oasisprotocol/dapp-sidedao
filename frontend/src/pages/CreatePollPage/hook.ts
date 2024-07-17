import { useEffect, useState } from 'react';
// import { AbiCoder } from "ethers";
import { AclOptions, Poll, PollManager } from "../../types"
import { useEthereum } from '../../hooks/useEthereum';
import { chainChoices, encryptJSON, isValidAddress } from '../../utils/crypto.demo';
import { Pinata } from '../../utils/Pinata';
import { useContracts } from '../../hooks/useContracts';
import classes from "./index.module.css"

import {
  deny, FieldConfiguration,
  findErrorsInFields,
  useBooleanField, useLabel,
  useOneOfField,
  useTextArrayField,
  useTextField,
} from '../../components/InputFields';

// The steps / pages of the wizard
const StepTitles= {
  basics : "Poll creation",
  permission: "Pre-vote settings",
  results : "Results settings",
} as const

type CreationStep = keyof typeof StepTitles
const process: CreationStep[] = Object.keys(StepTitles) as CreationStep[]
const numberOfSteps = process.length

const acl_allowAll = import.meta.env.VITE_CONTRACT_ACL_ALLOWALL;

const expectedRanges = {
  "1-100": 100,
  "100-1000": 1000,
  "1000-10000" : 10000,
  "10000-": 100000,
} as const

const aclCostEstimates = {
  acl_allowAll: 0.1,
  acl_allowList: 0.1,
  acl_tokenHolders: 0.2,
  acl_xchain: 0.2,
} as const


// Split a list of addresses by newLine, comma or space
const splitAddresses = (addressSoup: string): string[] => addressSoup
  .split('\n')
  .flatMap((x) => x.split(','))
  .flatMap((x) => x.split(' '))
  .map((x) => x.trim())
  .filter((x) => x.length > 0)


export const useCreatePollData = () => {
  const eth = useEthereum()
  const { pollManagerWithSigner: daoSigner } = useContracts(eth)
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
    if (findErrorsInFields(stepFields[step])) return
    setStep(process[stepIndex + 1])
  }

  const question = useTextField({
    name: "question",
    label: "Question",
    placeholder: "Your question",
    required: true,
    requiredMessage: "Please specify the question for your poll!",
    minLength: [10, minLength => `Please describe the question using at least ${minLength} characters!`],
    maxLength: [80, maxLength => `Please state the question in more more than ${maxLength} characters!`],
  })

  const description = useTextField({
    name: "description",
    label: "Description",
    placeholder: "Please elaborate the question, if you want to.",
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
    allowDuplicates: [false, ["This answer is repeated below.", "The same answer was already listed above!"]],
    allowEmptyItems: [false, "Please either fill this in, or remove this answer."],
    minItemLength: [3, minLength => `Please use at least ${minLength} characters for this answer.`],
    // maxItemLength: [10, maxLength => `Please don't use more than ${maxLength} characters for this answer.`],

    // Only the last item can be removed
    // canRemoveElement: (index, field) => index === field.numberOfValues - 1,
  })

  const customCSS = useBooleanField({
    name: "customCSS",
    label: "I want to create a customized theme for the poll",
    enabled: deny("Coming soon!"),
  })

  const accessControlMethod = useOneOfField({
    name: "accessControlMethod",
    label: "Who can vote",
    choices: [
      { value: "acl_allowAll", label: "Everybody" },
      { value: "acl_tokenHolders", label: "Holds Token on Sapphire" },
      {
        value: "acl_allowList",
        label: "Address Whitelist",
        description: 'You can specify a list of addresses that are allowed to vote.'
      },
      {
        value: "acl_xchain",
        label: "Cross-Chain DAO",
        description: "You can set a condition that is evaluated on another chain."
      },
    ],
  } as const)

  const tokenAddress = useTextField({
    name: "tokenAddress",
    label: "Token Address",
    visible: accessControlMethod.value === "acl_tokenHolders",
    required: [true, "Please specify the address of the token that is the key to this poll!"],
    validators: value => (value && !isValidAddress(value)) ? "This doesn't seem to be a valid address." : undefined,
  })

  const addressWhitelist = useTextArrayField({
    name: "addressWhitelist",
    label: "Acceptable Addresses",
    description: "You can just copy-paste your list here",
    addItemLabel: "Add address",
    removeItemLabel: "Remove address",
    visible: accessControlMethod.value === "acl_allowList",
    allowEmptyItems: [false, "Please specify address, or remove this field!"],
    minItems: 1,
    allowDuplicates: [false, ["This address is repeated below.", "The same address was already listed above!"]],
    itemValidator: value => (value && !isValidAddress(value)) ? "This doesn't seem to be a valid address." : undefined,
    onItemEdited: (index, value, me) => {
      if ((value.indexOf(",") !== -1)|| (value.indexOf(" ") !== -1) || (value.indexOf("\n") !== -1)) {
        const addresses = splitAddresses(value)
        for (let i = 0; i < addresses.length; i++) {
          me.value[index + i] = addresses[i]
        }
        me.setValue(me.value)
      }
    },
  })

  const chain= useOneOfField({
    name: "chain",
    label: "Chain",
    visible:  accessControlMethod.value === "acl_xchain",
    choices: chainChoices,
  })

  const xchainAddress = useTextField({
    name: "xchainAddress",
    label: "Address",
    visible: accessControlMethod.value === "acl_xchain",
    placeholder: "Token address on chain",
    required: [true, "Please specify the address on the other chain that is the key to this poll!"],
    validators: value => (value && !isValidAddress(value)) ? "This doesn't seem to be a valid address." : undefined,
  })

  const voteWeighting = useOneOfField({
    name: "voteWeighting",
    label: "Vote weight",
    choices: [
    {
      value: "weight_perWallet",
      label: "1 vote per wallet",
    },
    {
      value: "weight_perToken",
      label: "According to token distribution",
      enabled: deny("Coming soon"),
    }
    ],
  } as const)

  const gasFree = useBooleanField({
    name: "gasless",
    label: "Make this vote gas-free",
  })

  const gasFreeExplanation = useLabel({
    name: "gasFreeExplanation",
    initialValue: "We calculate and suggest the amount of ROSE needed for gas based on the amount of users that are expected to vote. Any remaining ROSE from the gas sponsoring wallet will be refunded to you once the poll is closed.",
    visible: gasFree.value,
    classnames: classes.explanation,
  })

  const numberOfExpectedVoters = useOneOfField({
    name: "numberOfExpectedVoters",
    visible: gasFree.value,
    label: "Number of voters",
    choices: [
      { value: "1-100", label: "Less than 100" },
      { value: "100-1000", label: "Between 100 and 1000"},
      { value: "1000-10000", label: "Between 1000 and 10,000"},
      { value: "10000-", label: "Above 10,000"}
    ],
  } as const)

  const suggestedAmountOfRose = useTextField({
    name: "suggestedAmountOfRose",
    visible: gasFree.value,
    label: "Suggested amount of ROSE",
  })

  useEffect(
    () => {
      if (!gasFree.value) return
      const cost = aclCostEstimates[accessControlMethod.value] * expectedRanges[numberOfExpectedVoters.value]
      if (isNaN(cost)) return
      suggestedAmountOfRose.setValue(cost.toString())
    },
    [accessControlMethod.value, numberOfExpectedVoters.value]
  );

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

  const stepFields: Record<CreationStep, FieldConfiguration> = {
    basics: [
      question,
      description,
      answers,
      customCSS,
    ],
    permission: [
      accessControlMethod,
      tokenAddress,
      addressWhitelist,
      [chain, xchainAddress],
      voteWeighting,
      gasFree,
      gasFreeExplanation,
      [numberOfExpectedVoters, suggestedAmountOfRose],
    ],
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
    stepTitle: StepTitles[step],
    stepIndex,
    numberOfSteps,
    fields: stepFields[step],
    previousStep: goToPreviousStep,
    nextStep: goToNextStep,
    isCreating,
    createPoll
  }

}
