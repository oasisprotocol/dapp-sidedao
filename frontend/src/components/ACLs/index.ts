import { allowAll } from './allowAll'
import { allowList } from './allowList'
import { tokenHolder } from './tokenHolder'
import { xchain } from './xchain'
import { AclOptions } from '../../types'

/**
 * The list of supported ACLs
 */
export const acls = [allowAll, allowList, tokenHolder, xchain] as const

/**
 * Find the ACL needed to manage a poll, based on ACL options
 */
export const findACLForOptions = (options: AclOptions) => acls.find(acl => acl.isThisMine(options))
