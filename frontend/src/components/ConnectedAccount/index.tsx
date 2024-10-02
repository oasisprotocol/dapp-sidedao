import { FC } from 'react'
import { JazzIcon } from '../JazzIcon'
import { useWeb3 } from '../../hooks/useWeb3'
import { StringUtils } from '../../utils/string.utils'
import classes from './index.module.css'
import { useAppState } from '../../hooks/useAppState'
import { AddressShower } from '../Addresses'
import { motion } from 'framer-motion'

interface Props {
  className?: string
  address: string
  chainName: string
}

export const ConnectedAccount: FC<Props> = ({ className, address, chainName }) => {
  const {
    state: { explorerBaseUrl },
  } = useWeb3()
  const {
    state: { isDesktopScreen },
  } = useAppState()

  const url = explorerBaseUrl ? StringUtils.getAccountUrl(explorerBaseUrl, address) : undefined

  return (
    <a
      href={url}
      className={StringUtils.clsx(className, classes.connectedAccount)}
      target="_blank"
      rel="nofollow noreferrer"
    >
      <JazzIcon size={isDesktopScreen ? 30 : 20} address={address} />
      {isDesktopScreen && (
        <p className={classes.connectedAccountDetails}>
          <motion.span
            className={classes.network}
            whileHover={{ width: 'auto' }}
            transition={{ ease: 'easeInOut' }}
          >
            {chainName}
          </motion.span>
          <AddressShower address={address} className={classes.connectedAccountAddress} />
        </p>
      )}
    </a>
  )
}
