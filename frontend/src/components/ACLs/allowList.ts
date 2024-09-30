import { defineACL } from './common'
import { VITE_CONTRACT_ACL_VOTERALLOWLIST } from '../../constants/config'
import { abiEncode, isValidAddress } from '../../utils/poll.utils'
import { denyWithReason, useTextArrayField } from '../InputFields'
import { AclOptions } from '@oasisprotocol/blockvote-contracts'

// Split a list of addresses by newLine, comma or space
const splitAddresses = (addressSoup: string): string[] =>
  addressSoup
    .split('\n')
    .flatMap(x => x.split(','))
    .flatMap(x => x.split(' '))
    .map(x => x.trim())
    .filter(x => x.length > 0)

export const allowList = defineACL({
  value: 'acl_allowList',
  label: 'Address Whitelist',
  costEstimation: 0.1,
  description: 'You can specify a list of addresses that are allowed to vote.',
  useConfiguration: active => {
    const addresses = useTextArrayField({
      name: 'addresses',
      label: 'Acceptable Addresses',
      visible: active,
      description: 'You can just copy-paste your list here',
      addItemLabel: 'Add address',
      removeItemLabel: 'Remove address',
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

    return {
      fields: [addresses],
      values: {
        addresses: addresses.value,
      },
    }
  },

  getAclOptions: (props): [string, AclOptions] => {
    if (!props.addresses) throw new Error('Internal errors: parameter mismatch, addresses missing.')
    return [
      abiEncode(['address[]'], [props.addresses]),
      {
        address: VITE_CONTRACT_ACL_VOTERALLOWLIST,
        options: { allowList: true },
      },
    ]
  },

  isThisMine: options => 'allowList' in options.options,

  checkPermission: async (pollACL, daoAddress, proposalId, userAddress) => {
    const proof = new Uint8Array()
    const explanation = 'This poll is only for a predefined list of addresses.'
    const result = 0n !== (await pollACL.canVoteOnPoll(daoAddress, proposalId, userAddress, proof))
    // console.log("whiteListAcl check:", result)
    const canVote = result ? true : denyWithReason('you are not on the list of allowed addresses')
    return { canVote, explanation, proof }
  },
} as const)
