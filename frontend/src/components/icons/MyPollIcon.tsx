import { FC } from 'react'
import { JazzIcon } from '../JazzIcon'
import classes from './index.module.css'
import { useEthereum } from '../../hooks/useEthereum'
import { MaybeWithTooltip } from '../Tooltip/MaybeWithTooltip'

export const MyPollIcon: FC = () => {
  const { userAddress } = useEthereum()
  return (
    <MaybeWithTooltip overlay={'This is my poll!'}>
      <div className={classes.myPollIndicator}>
        <JazzIcon address={userAddress} size={24} />
      </div>
    </MaybeWithTooltip>
  )
}
