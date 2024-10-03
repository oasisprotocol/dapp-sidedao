import { FC } from 'react'
import { JazzIcon } from '../JazzIcon'
import { useWeb3 } from '../../hooks/useWeb3'
import { StringUtils } from '../../utils/string.utils'
import classes from './index.module.css'
import { useAppState } from '../../hooks/useAppState'
import { AddressShower } from '../Addresses'
import { motion } from 'framer-motion'
import { getChainDefinition } from '../../utils/poll.utils'
import { getChainIconUrl } from '../../utils/crypto.demo'

interface Props {
  className?: string
  address: string
  chainId: number
}

export const ConnectedAccount: FC<Props> = ({ className, address, chainId }) => {
  const {
    state: { explorerBaseUrl },
  } = useWeb3()
  const {
    state: { isDesktopScreen },
  } = useAppState()

  const chainDefinition = getChainDefinition(chainId)!

  const url = explorerBaseUrl ? StringUtils.getAccountUrl(explorerBaseUrl, address) : undefined
  const imageUrl = getChainIconUrl(chainDefinition.icon)

  return (
    <a
      href={url}
      className={StringUtils.clsx(className, classes.connectedAccount)}
      target="_blank"
      rel="nofollow noreferrer"
    >
      {isDesktopScreen ? (
        <div className={classes.connectedAccountDetails}>
          <motion.span
            layout
            className={classes.network}
            whileHover={{ width: 'auto' }}
            transition={{ ease: 'easeInOut' }}
          >
            <img src={imageUrl} width={30} height={30} />
            {chainDefinition.name}
          </motion.span>
          <JazzIcon size={30} address={address} />
          <AddressShower address={address} className={classes.connectedAccountAddress} />
        </div>
      ) : (
        <JazzIcon size={20} address={address} />
      )}
    </a>
  )
}
