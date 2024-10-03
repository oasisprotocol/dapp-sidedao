import { Choice, DecisionWithReason, FieldConfiguration } from '../InputFields'
import { AclOptions, IPollACL } from '@oasisprotocol/blockvote-contracts'
import { BytesLike } from 'ethers'
import { ReactNode } from 'react'
export type StatusUpdater = (status: string | undefined) => void

/**
 * This data structure describes an ACL
 */
export type ACL<Name, ConfigInputValues, Options extends AclOptions, Extra> = Choice<Name> & {
  /**
   * Estimated cost per vote
   *
   * This is used for setting up gasless voting.
   */
  costEstimation: number

  /**
   * Specify the fields and values needed for configuring the ACL when creating a poll
   */
  useConfiguration: (selected: boolean) => { fields: FieldConfiguration; values: ConfigInputValues }

  /**
   * Compose the ACL options when creating a poll
   */
  getAclOptions:
    | ((config: ConfigInputValues, statusUpdater?: StatusUpdater) => [string, Options])
    | ((config: ConfigInputValues, statusUpdater?: StatusUpdater) => Promise<[string, Options]>)

  /**
   * Attempt to recognize if this ACL is managing a given poll, based on ACL options
   * @param options
   */
  isThisMine: (options: AclOptions) => boolean

  /**
   * Determine if we can vote on this poll
   *
   * The actual contract is made available, this function just needs to interpret the result
   * and compose the required messages.
   */
  checkPermission: (
    pollACL: IPollACL,
    daoAddress: string,
    proposalId: string,
    userAddress: string,
    options: Options,
  ) => Promise<
    { canVote: DecisionWithReason; explanation?: ReactNode; proof: BytesLike; error?: string } & Extra
  >
}

export function defineACL<Name, ConfigInputValues, Options extends AclOptions, Extra>(
  acl: ACL<Name, ConfigInputValues, Options, Extra>,
): ACL<Name, ConfigInputValues, Options, Extra> {
  return acl
}
