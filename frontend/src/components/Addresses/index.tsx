import { StringUtils } from '../../utils/string.utils'

import classes from './index.module.css'
import { FC, ReactNode } from 'react'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const AddressShower: FC<{ address: string; className?: string }> = ({ address, className }) => (
  <MaybeWithTooltip overlay={address} placement={'top'}>
    <abbr className={className ?? classes.address}>{StringUtils.truncateAddress(address)}</abbr>
  </MaybeWithTooltip>
)

export const renderAddress = (address: string): ReactNode => <AddressShower address={address} />
