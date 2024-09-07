import { StringUtils } from '../../utils/string.utils';

import classes from "./index.module.css"
import { FC, ReactNode } from 'react';

export const AddressShower: FC<{address: string, className?: string}> = ({address, className }) => (
  <abbr title={address} className={className ?? classes.address}>
    {StringUtils.truncateAddress(address)}
  </abbr>
)

export const renderAddress = (address: string): ReactNode => <AddressShower address={address} />
