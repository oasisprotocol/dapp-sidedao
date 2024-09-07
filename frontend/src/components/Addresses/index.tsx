import { StringUtils } from '../../utils/string.utils';

import classes from "./index.module.css"
import { FC, ReactNode } from 'react';

export const AddressShower: FC<{address: string}> = ({address}) => (
  <abbr title={address} className={classes.address}>
    {StringUtils.truncateAddress(address)}
  </abbr>
)

export const renderAddress = (address: string): ReactNode => <AddressShower address={address} />
