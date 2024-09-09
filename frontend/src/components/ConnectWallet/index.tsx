import { FC, useEffect, useState } from 'react'
import { useWeb3 } from '../../hooks/useWeb3'
import { METAMASK_HOME_PAGE_URL } from '../../constants/config'
import { Button, ButtonSize } from '../Button';
import { toErrorString, UnknownNetworkError } from '../../utils/errors'
import { ConnectedAccount } from '../ConnectedAccount'
import { useAppState } from '../../hooks/useAppState'
import classes from './index.module.css'

interface Props {
  mobileSticky: boolean
  avoidButtonClasses?: boolean
  buttonSize?: ButtonSize
}

export const ConnectWallet: FC<Props> = ({ mobileSticky, avoidButtonClasses = false, buttonSize }) => {
  const { setAppError } = useAppState()

  const [isLoading, setIsLoading] = useState(false)
  const [providerAvailable, setProviderAvailable] = useState(true)

  const {
    state: { isConnected, account, chainName, isUnknownNetwork },
    connectWallet,
    switchNetwork,
    isProviderAvailable,
  } = useWeb3()
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      setProviderAvailable(await isProviderAvailable())
      setIsLoading(false)
    }

    init().catch(ex => {
      setAppError(toErrorString(ex as Error))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleConnectWallet = async () => {
    setIsLoading(true)
    try {
      await connectWallet()
    } catch (ex) {
      if (ex instanceof UnknownNetworkError) {
        // Already handled by provider layer
      } else {
        console.log(ex)
        alert((ex as Error).message ?? "Failed to connect")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwitchNetwork = async () => {
    setIsLoading(true)
    try {
      await switchNetwork()
      await handleConnectWallet()
    } catch (ex) {
      console.log(ex)
      alert((ex as Error).message ?? "Failed to connect")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {!isConnected && !providerAvailable && (
        <a href={METAMASK_HOME_PAGE_URL} target={'_blank'} rel={'noopener noreferrer'}>
          <Button
            className={avoidButtonClasses ? undefined : classes.connectWalletBtn}
            color={'primary'}
            disabled={isLoading}
            size={buttonSize}
          >
            Install MetaMask
          </Button>
        </a>
      )}
      {!isConnected && providerAvailable && isUnknownNetwork && (
        <Button
          className={avoidButtonClasses ? undefined : classes.connectWalletBtn}
          color={'primary'}
          size={buttonSize}
          disabled={isLoading}
          onClick={handleSwitchNetwork}
        >
          Switch Network
        </Button>
      )}
      {!isConnected && providerAvailable && !isUnknownNetwork && (
        <Button
          className={avoidButtonClasses ? undefined : classes.connectWalletBtn}
          color={'primary'}
          size={buttonSize}
          disabled={isLoading}
          onClick={handleConnectWallet}
        >
          <label className={classes.connectWalletBtnLabel}>
            Connect wallet
          </label>
        </Button>
      )}
      {isConnected && account && (
        <ConnectedAccount
          className={mobileSticky ? classes.stickyConnectedAccount : undefined}
          address={account}
          chainName={chainName!}
        />
      )}
    </>
  )
}
