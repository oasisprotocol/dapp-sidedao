import { useEffect, useMemo, useState } from 'react'
import {
  Choice,
  collectErrorsInFields,
  deny,
  FieldConfiguration,
  findErrorsInFields,
  getVerdict,
  useBooleanField,
  useDateField,
  useLabel,
  useOneOfField,
  useTextArrayField,
  useTextField,
} from '../../components/InputFields'
import {
  chainsForXchain,
  checkXchainTokenHolder,
  createPoll as doCreatePoll,
  getAllowAllACLOptions,
  getAllowListAclOptions,
  getSapphireTokenDetails,
  getTokenHolderAclOptions,
  getXchainAclOptions,
  getLatestBlock,
  getERC20TokenDetails,
  isValidAddress,
  isERC20Token,
  parseEther,
  getNftType,
} from '../../utils/poll.utils'
import { useEthereum } from '../../hooks/useEthereum'
import { useContracts } from '../../hooks/useContracts'

import classes from './index.module.css'
import { DateUtils } from '../../utils/date.utils'
import { useTime } from '../../hooks/useTime'
import { designDecisions, MIN_CLOSE_TIME_MINUTES } from '../../constants/config'
import { AclOptions } from '../../types'
import { renderAddress } from '../../components/Addresses'
import { useNavigate } from 'react-router-dom'

// The steps / pages of the wizard
const StepTitles = {
  basics: 'Poll creation',
  permission: 'Pre-vote settings',
  results: 'Results settings',
} as const

type CreationStep = keyof typeof StepTitles
const process: CreationStep[] = Object.keys(StepTitles) as CreationStep[]
const numberOfSteps = process.length

const expectedRanges = {
  '1-100': 100,
  '100-1000': 1000,
  '1000-10000': 10000,
  '10000-': 100000,
} as const

const aclCostEstimates = {
  acl_allowAll: 0.1,
  acl_allowList: 0.1,
  acl_tokenHolder: 0.2,
  acl_xchain: 0.2,
} as const

// Split a list of addresses by newLine, comma or space
const splitAddresses = (addressSoup: string): string[] =>
  addressSoup
    .split('\n')
    .flatMap(x => x.split(','))
    .flatMap(x => x.split(' '))
    .map(x => x.trim())
    .filter(x => x.length > 0)

const hideDisabledIfNecessary = (choice: Choice): Choice => ({
  ...choice,
  hidden: choice.hidden || (designDecisions.hideDisabledSelectOptions && !getVerdict(choice.enabled, true)),
})

export const useCreatePollForm = () => {
  const eth = useEthereum()
  const { pollManagerWithSigner: daoSigner } = useContracts(eth)

  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [step, setStep] = useState<CreationStep>('basics')
  const [stepIndex, setStepIndex] = useState(0)
  const [validationPending, setValidationPending] = useState(false)

  const navigate = useNavigate()

  const question = useTextField({
    name: 'question',
    label: 'Question',
    placeholder: 'Your question',
    required: [true, 'Please specify the question for your poll!'],
    minLength: [10, minLength => `Please describe the question using at least ${minLength} characters!`],
    maxLength: [80, maxLength => `Please state the question in more more than ${maxLength} characters!`],
  })

  const description = useTextField({
    name: 'description',
    label: 'Description',
    placeholder: 'Please elaborate the question, if you want to.',
  })

  const answers = useTextArrayField({
    name: 'answers',
    label: 'Answers',
    addItemLabel: 'Add answer',
    removeItemLabel: 'Remove this answer',

    initialItemCount: 3, // Let's start with 3 answers.
    placeholderTemplate: index => `Answer ${index + 1}`,
    minItems: [2, minCount => `You need at least ${minCount} answers in order to create this poll.`],
    maxItem: [10, maxCount => `Please don't offer more than ${maxCount} answers.`],
    allowDuplicates: [false, ['This answer is repeated below.', 'The same answer was already listed above!']],
    allowEmptyItems: [false, 'Please either fill this in, or remove this answer.'],
    minItemLength: [1, minLength => `Please use at least ${minLength} characters for this answer.`],
    // maxItemLength: [10, maxLength => `Please don't use more than ${maxLength} characters for this answer.`],

    // Only the last item can be removed
    // canRemoveElement: (index, field) => index === field.numberOfValues - 1,
  })

  const customCSS = useBooleanField({
    name: 'customCSS',
    label: 'I want to create a customized theme for the poll',
    enabled: deny('Coming soon!'),
  })

  const accessControlMethod = useOneOfField({
    name: 'accessControlMethod',
    label: 'Who can vote',
    choices: [
      { value: 'acl_allowAll', label: 'Everybody' },
      {
        value: 'acl_tokenHolder',
        label: 'Holds Token on Sapphire',
        hidden: true, // We decided to hide this option, since this is not the focus
      },
      {
        value: 'acl_allowList',
        label: 'Address Whitelist',
        description: 'You can specify a list of addresses that are allowed to vote.',
      },
      {
        value: 'acl_xchain',
        label: 'Cross-Chain DAO',
        description: 'You can set a condition that is evaluated on another chain.',
      },
    ],
  } as const)

  const sapphireTokenAddress = useTextField({
    name: 'tokenAddress',
    label: 'Token Address',
    visible: accessControlMethod.value === 'acl_tokenHolder',
    required: [true, 'Please specify the address of the token that is the key to this poll!'],
    validators: [
      value => (!isValidAddress(value) ? "This doesn't seem to be a valid address." : undefined),
      async (value, changed, controls) => {
        if (!changed) return
        controls.updateStatus({ message: 'Fetching token details...' })
        const details = await getSapphireTokenDetails(value)
        if (!details) {
          return "Can't find token details!"
        }
        sapphireTokenName.setValue(details.name)
        sapphireTokenSymbol.setValue(details.symbol)
      },
    ],
    validateOnChange: true,
    showValidationSuccess: true,
  })

  const hasValidSapphireTokenAddress =
    sapphireTokenAddress.visible && sapphireTokenAddress.isValidated && !sapphireTokenAddress.hasProblems

  const sapphireTokenName = useLabel({
    name: 'sapphireTokenName',
    visible: hasValidSapphireTokenAddress,
    label: 'Selected token:',
    initialValue: '',
  })

  const sapphireTokenSymbol = useLabel({
    name: 'sapphireTokenSymbol',
    visible: hasValidSapphireTokenAddress,
    label: 'Symbol:',
    initialValue: '',
  })

  const addressWhitelist = useTextArrayField({
    name: 'addressWhitelist',
    label: 'Acceptable Addresses',
    description: 'You can just copy-paste your list here',
    addItemLabel: 'Add address',
    removeItemLabel: 'Remove address',
    visible: accessControlMethod.value === 'acl_allowList',
    allowEmptyItems: [false, 'Please specify address, or remove this field!'],
    minItems: 1,
    allowDuplicates: [
      false,
      ['This address is repeated below.', 'The same address was already listed above!'],
    ],
    itemValidator: value =>
      value && !isValidAddress(value) ? "This doesn't seem to be a valid address." : undefined,
    onItemEdited: (index, value, me) => {
      if (value.indexOf(',') !== -1 || value.indexOf(' ') !== -1 || value.indexOf('\n') !== -1) {
        const addresses = splitAddresses(value)
        const newAddresses = [...me.value]
        for (let i = 0; i < addresses.length; i++) {
          newAddresses[index + i] = addresses[i]
        }
        me.setValue(newAddresses)
      }
    },
    validateOnChange: true,
    showValidationSuccess: true,
  })

  const chainChoices: Choice<number>[] = useMemo(
    () =>
      chainsForXchain.map(([id, name]) => ({
        value: id,
        label: `${name} (${id})`,
      })),
    [],
  )

  const chain = useOneOfField({
    name: 'chain',
    label: 'Chain',
    visible: accessControlMethod.value === 'acl_xchain',
    choices: chainChoices,
    onValueChange: () => {
      if (xchainTokenAddress.isValidated) {
        void xchainTokenAddress.validate({ forceChange: true, reason: 'change' })
      }
    },
  })

  const xchainTokenAddress = useTextField({
    name: 'xchainTokenAddress',
    label: 'Token Address',
    visible: accessControlMethod.value === 'acl_xchain',
    placeholder: 'Token address on chain. (Currently on ERC-20 tokens are supported.)',
    required: [true, 'Please specify the address on the other chain that is the key to this poll!'],
    validators: [
      value => (isValidAddress(value) ? undefined : "This doesn't seem to be a valid address."),
      async (value, changed) => {
        if (!changed) return
        if (await isERC20Token(chain.value, value)) return undefined
        const nftType = await getNftType(chain.value, value)
        if (nftType)
          return `This seems to be an ${nftType} NFT, not an ERC-20 token. Support is coming, but we are not there yet.`
        return "The address is valid, but this doesn't seem to be an ERC-20 token."
      },
      async (value, changed, controls) => {
        if (!changed) return
        controls.updateStatus({ message: 'Fetching token details...' })
        const details = await getERC20TokenDetails(chain.value, value)
        if (!details) {
          return "Can't find token details!"
        }
        xchainTokenName.setValue(details.name)
        xchainTokenSymbol.setValue(details.symbol)
      },
    ],
    validateOnChange: true,
    showValidationSuccess: true,
  })

  const hasValidXchainTokenAddress =
    xchainTokenAddress.visible && xchainTokenAddress.isValidated && !xchainTokenAddress.hasProblems

  const xchainTokenName = useLabel({
    name: 'xchainTokenName',
    visible: hasValidXchainTokenAddress,
    label: 'Selected token:',
    initialValue: '',
  })

  const xchainTokenSymbol = useLabel({
    name: 'xchainTokenSymbol',
    visible: hasValidXchainTokenAddress,
    label: 'Symbol:',
    initialValue: '',
  })

  const xchainWalletAddress = useTextField({
    name: 'xchainWalletAddress',
    label: 'Wallet Address',
    visible: hasValidXchainTokenAddress,
    placeholder: 'Wallet address of a token holder on chain',
    required: [true, 'Please specify the address of a token holder!'],
    validators: [
      value => (isValidAddress(value) ? undefined : "This doesn't seem to be a valid address."),
      async (value, changed, controls) => {
        if (!changed) return
        const slot = await checkXchainTokenHolder(chain.value, xchainTokenAddress.value, value, progress => {
          controls.updateStatus({ message: progress })
        })
        if (!slot) return "Can't confirm this token at this wallet."
        xchainWalletBalance.setValue(`Confirmed ${slot.balanceDecimal} ${xchainTokenSymbol.value}`)
        xchainWalletSlotNumber.setValue(slot.index.toString())
      },
      async (_value, changed, controls) => {
        if (!changed) return
        controls.updateStatus({ message: 'Looking up reference block ...' })
        const block = await getLatestBlock(chain.value)
        if (!block?.hash) return 'Failed to fetch latest block.'
        xchainBlockHash.setValue(block.hash)
        xchainBlockHeight.setValue(block.number.toString())
      },
    ],
    validateOnChange: true,
    showValidationSuccess: true,
  })

  const hasValidXchainWallet =
    hasValidXchainTokenAddress && xchainWalletAddress.isValidated && !xchainWalletAddress.hasProblems

  const xchainWalletBalance = useLabel({
    name: 'xchainWalletBalance',
    label: 'Tokens confirmed:',
    visible: hasValidXchainWallet,
    initialValue: '',
    classnames: classes.explanation,
  })

  const xchainWalletSlotNumber = useLabel({
    name: 'xchainWalletSlotNumber',
    label: 'Stored at:',
    visible: hasValidXchainWallet,
    initialValue: '',
    classnames: classes.explanation,
    formatter: slot => `Slot #${slot}`,
  })

  const xchainBlockHash = useLabel({
    name: 'xchainBlockHash',
    label: 'Reference Block Hash',
    visible: hasValidXchainWallet,
    initialValue: 'unknown',
    classnames: classes.explanation,
    renderer: renderAddress,
  })

  const xchainBlockHeight = useLabel({
    name: 'xchainBlockHeight',
    label: 'Block Height',
    visible: hasValidXchainWallet,
    initialValue: 'unknown',
    classnames: classes.explanation,
  })

  const voteWeighting = useOneOfField({
    name: 'voteWeighting',
    label: 'Vote weight',
    choices: [
      {
        value: 'weight_perWallet',
        label: '1 vote per wallet',
      },
      {
        value: 'weight_perToken',
        label: 'According to token distribution',
        enabled: deny('Coming soon'),
      },
    ].map(hideDisabledIfNecessary),
    disableIfOnlyOneVisibleChoice: designDecisions.disableSelectsWithOnlyOneVisibleOption,
  } as const)

  const gasFree = useBooleanField({
    name: 'gasless',
    label: 'Make this vote gas-free',
  })

  const gasFreeExplanation = useLabel({
    name: 'gasFreeExplanation',
    initialValue:
      'We calculate and suggest the amount of ROSE needed for gas based on the amount of users that are expected to vote. Any remaining ROSE from the gas sponsoring wallet will be refunded to you once the poll is closed.',
    visible: gasFree.value,
    classnames: classes.explanation,
  })

  const numberOfExpectedVoters = useOneOfField({
    name: 'numberOfExpectedVoters',
    visible: gasFree.value,
    label: 'Number of voters',
    choices: [
      { value: '1-100', label: 'Less than 100' },
      { value: '100-1000', label: 'Between 100 and 1000' },
      { value: '1000-10000', label: 'Between 1000 and 10,000' },
      { value: '10000-', label: 'Above 10,000' },
    ],
  } as const)

  const amountOfSubsidy = useTextField({
    name: 'suggestedAmountOfRose',
    visible: gasFree.value,
    label: 'Amount of ROSE to set aside',
  })

  useEffect(() => {
    if (!gasFree.value) return
    const cost = aclCostEstimates[accessControlMethod.value] * expectedRanges[numberOfExpectedVoters.value]
    amountOfSubsidy.setValue(cost.toString())
  }, [gasFree.value, accessControlMethod.value, numberOfExpectedVoters.value])

  const resultDisplayType = useOneOfField({
    name: 'resultDisplayType',
    label: 'Type of result display',
    choices: [
      {
        value: 'end_result_only',
        label: 'Show only the end result',
        enabled: deny('Coming soon'),
      },
      {
        value: 'percentages',
        label: 'Show percentage for each answer',
      },
      {
        value: 'percentages_and_voters',
        label: 'Show percentage for each answer, plus the list of voters',
        description:
          'The individual votes will still be hidden, only the existence of the vote will be published.',
        enabled: deny('Coming soon'),
      },
      {
        value: 'percentages_and_votes',
        label: 'Show percentage and votes for each answer',
        description: 'Everyone can see who voted for what.',
      },
    ].map(hideDisabledIfNecessary),
  } as const)

  const authorResultDisplayType = useOneOfField({
    name: 'authorResultDisplayType',
    label: 'Type of result display for the author',
    visible: resultDisplayType.value !== 'percentages_and_votes',
    choices: [
      {
        value: 'same',
        label: 'Same as for everybody else',
      },
      {
        value: 'also_percentages',
        label: 'Also show percentage for each answer',
        hidden: resultDisplayType.value === 'percentages',
      },
      {
        value: 'voters',
        label: 'Also show the list of voters',
        hidden: ['percentages_and_votes', 'percentages_and_voters'].includes(resultDisplayType.value),
        enabled: deny('Coming soon'),
        description:
          'The individual votes will still be hidden, only the existence of the vote will be published.',
      },
      {
        value: 'votes',
        label: 'Also show the votes for each answer',
        description: 'The author can see who voted for what.',
        enabled: deny('Coming soon'),
      },
    ].map(hideDisabledIfNecessary),
    disableIfOnlyOneVisibleChoice: designDecisions.disableSelectsWithOnlyOneVisibleOption,
  } as const)

  const hasCloseDate = useBooleanField({
    name: 'hasCloseDate',
    label: 'Fixed close date',
    onValueChange: value => {
      if (value) pollCloseDate.setValue(new Date(Date.now() + 1000 * 3600))
    },
  })

  const { now } = useTime()

  const pollCloseDate = useDateField({
    name: 'pollCloseDate',
    label: `Poll close date (Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    visible: hasCloseDate.value,
    validateOnChange: true,
    showValidationStatus: false,
    validators: value => {
      const deadline = value.getTime() / 1000
      const remaining = DateUtils.calculateRemainingTimeFrom(deadline, now)
      const { isPastDue, totalSeconds } = remaining
      if (isPastDue || totalSeconds < MIN_CLOSE_TIME_MINUTES * 60) {
        return `Please set a time at least ${MIN_CLOSE_TIME_MINUTES} minutes in the future!`
      }
    },
  })

  const hasValidCloseDate = hasCloseDate.value && !!pollCloseDate.value && !pollCloseDate.hasProblems

  const pollCloseLabel = useLabel({
    name: 'pollCloseLabel',
    visible: hasValidCloseDate,
    initialValue: '??',
  })

  useEffect(() => {
    void pollCloseDate.validate({ forceChange: true, reason: 'change' })
  }, [hasCloseDate.value, now])

  useEffect(() => {
    if (hasValidCloseDate) {
      const deadline = pollCloseDate.value.getTime() / 1000
      const remaining = DateUtils.calculateRemainingTimeFrom(deadline, now)
      pollCloseLabel.setValue(DateUtils.getTextDescriptionOfTime(remaining) ?? '')
    }
  }, [hasCloseDate.value, hasValidCloseDate, now])

  const creationStatus = useLabel({
    name: 'creationStatus',
    label: '',
    initialValue: '',
  })

  const stepFields: Record<CreationStep, FieldConfiguration> = {
    basics: [question, description, answers, customCSS],
    permission: [
      accessControlMethod,
      sapphireTokenAddress,
      [sapphireTokenName, sapphireTokenSymbol],
      addressWhitelist,
      chain,
      xchainTokenAddress,
      [xchainTokenName, xchainTokenSymbol],
      xchainWalletAddress,
      [xchainWalletBalance, xchainWalletSlotNumber],
      [xchainBlockHash, xchainBlockHeight],
      voteWeighting,
      gasFree,
      gasFreeExplanation,
      [numberOfExpectedVoters, amountOfSubsidy],
    ],
    results: [
      resultDisplayType,
      authorResultDisplayType,
      hasCloseDate,
      pollCloseDate,
      pollCloseLabel,
      creationStatus,
    ],
  }

  const goToPreviousStep = () => {
    if (stepIndex === 0) return
    setStep(process[stepIndex - 1])
    setStepIndex(stepIndex - 1)
  }

  const goToNextStep = async () => {
    if (stepIndex === numberOfSteps - 1) return
    setValidationPending(true)
    const hasErrors = await findErrorsInFields(stepFields[step], 'submit')
    setValidationPending(false)
    if (hasErrors) return
    setStep(process[stepIndex + 1])
    setStepIndex(stepIndex + 1)
  }

  const getAclOptions = async (
    updateStatus?: ((status: string | undefined) => void) | undefined,
  ): Promise<[string, AclOptions]> => {
    const acl = accessControlMethod.value
    switch (acl) {
      case 'acl_allowAll':
        return getAllowAllACLOptions()
      case 'acl_tokenHolder':
        return getTokenHolderAclOptions(sapphireTokenAddress.value)
      case 'acl_allowList':
        return getAllowListAclOptions(addressWhitelist.value)
      case 'acl_xchain':
        return await getXchainAclOptions(
          {
            chainId: chain.value,
            contractAddress: xchainTokenAddress.value,
            slotNumber: parseInt(xchainWalletSlotNumber.value),
            blockHash: xchainBlockHash.value,
          },
          updateStatus,
        )
      default:
        throw new Error(`Unknown ACL contract ${acl}`)
    }
  }

  const createPoll = async () => {
    setValidationPending(true)
    const hasErrors = await findErrorsInFields(stepFields[step], 'submit')
    setValidationPending(false)
    if (hasErrors) return

    if (!daoSigner) throw new Error('DAO signer not found!')
    if (!eth.state.address) throw new Error("Can't find my own address!")

    const logger = (message?: string | undefined) => creationStatus.setValue(message ?? '')

    // const logger = console.log

    setIsCreating(true)
    try {
      const [aclData, aclOptions] = await getAclOptions(logger)
      const newId = await doCreatePoll(
        daoSigner,
        eth.state.address,
        {
          question: question.value,
          description: description.value,
          answers: answers.value,
          aclData,
          aclOptions,
          subsidizeAmount: gasFree.value ? parseEther(amountOfSubsidy.value) : undefined,
          publishVotes: resultDisplayType.value === 'percentages_and_votes',
          closeTime: hasCloseDate.value ? pollCloseDate.value : undefined,
        },
        logger,
      )

      if (newId) {
        navigate(`/polls/${newId.substring(2)}`)
      }
    } catch (ex) {
      let exString = `${ex}`
      if (exString.startsWith('Error: user rejected action')) {
        exString = 'Signer refused to sign transaction.'
      }
      logger(`Failed to create poll: ${exString}`)
    } finally {
      setIsCreating(false)
    }
  }

  const hasErrorsOnCurrentPage = collectErrorsInFields(stepFields[step])

  return {
    stepTitle: StepTitles[step],
    stepIndex,
    numberOfSteps,
    fields: stepFields[step],
    previousStep: goToPreviousStep,
    validationPending,
    nextStep: goToNextStep,
    isCreating,
    hasErrorsOnCurrentPage,
    createPoll,
  }
}
