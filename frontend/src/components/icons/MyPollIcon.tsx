import { FC } from 'react'
import { JazzIcon } from '../JazzIcon'
import classes from './index.module.css'
import { useEthereum } from '../../hooks/useEthereum'

export const MyPollIcon: FC = () => {
  const { userAddress } = useEthereum()
  return (
    <div title={'This is my poll!'} className={classes.myPollIndicator}>
      <JazzIcon address={userAddress} size={24} />
    </div>
  )
}
