import { FC, PropsWithChildren, useCallback,
  useState } from 'react'
import * as sapphire from '@oasisprotocol/sapphire-paratime'
import {
  CHAINS,
  VITE_NETWORK_BIGINT, VITE_NETWORK_NUMBER,
} from '../constants/config';
import {
  UnknownNetworkError,
} from '../utils/errors'
import { Web3Context, Web3ProviderContext, Web3ProviderState } from './Web3Context'
import { useEIP1193 } from '../hooks/useEIP1193'
import {
  BrowserProvider,
} from 'ethers'

const web3ProviderInitialState: Web3ProviderState = {
  isConnected: false,
  ethProvider: null,
  sapphireEthProvider: null,
  account: null,
  explorerBaseUrl: null,
  chainName: null,
  isUnknownNetwork: false,
}

export const Web3ContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const [initiated, setInitiated] = useState(false)
  const {
    isEIP1193ProviderAvailable,
    connectWallet: connectWalletEIP1193,
    switchNetwork: switchNetworkEIP1193,
  } = useEIP1193()

  const [state, setState] = useState<Web3ProviderState>({
    ...web3ProviderInitialState,
  })

  const _connectionChanged = (isConnected: boolean) => {
    setState(prevState => ({
      ...prevState,
      isConnected,
    }))
  }

  const _accountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length <= 0) {
      _connectionChanged(false)
      return
    }

    const [account] = accounts
    setState(prevState => ({
      ...prevState,
      account,
    }))
  }, [])

  const _setNetworkSpecificVars = (
    chainId: bigint,
    sapphireEthProvider = state.sapphireEthProvider!
  ): void => {
    if (!sapphireEthProvider) {
      throw new Error('[Web3Context] Sapphire provider is required!')
    }

    if (!CHAINS.has(chainId) || VITE_NETWORK_BIGINT !== chainId) {
      throw new UnknownNetworkError('Unknown network!')
    }

    const { blockExplorerUrls, chainName } = CHAINS.get(chainId)!
    const [explorerBaseUrl] = blockExplorerUrls || [null]

    setState(prevState => ({
      ...prevState,
      explorerBaseUrl,
      chainName,
    }))
  }

  const _chainChanged = useCallback((chainId: string) => {
    // TODO: Integrate seamlessly, so that page reload is not needed

    if (parseInt(chainId) === VITE_NETWORK_NUMBER) {
      console.log("Switched to home network")
    } else {
      console.log("Apparently, we have switched to a different network")
      setState(prevState => ({
        ...prevState,
        isConnected: false,
        isUnknownNetwork: true,
      }))
    }

    if (state.isConnected) {
      window.location.reload()
    }
  }, [state.isConnected])

  const _connect = useCallback(() => _connectionChanged(true), [])
  const _disconnect = useCallback(() => _connectionChanged(false), [])

  // TODO: Try with removeListener(off seems specific for MetaMask), upon initializing the provider(network change)
  const _addEventListenersOnce = (() => {
    let eventListenersInitialized = false
    return (ethProvider: typeof window.ethereum) => {
      if (eventListenersInitialized) {
        return
      }

      ethProvider?.on?.('accountsChanged', _accountsChanged)
      ethProvider?.on?.('chainChanged', _chainChanged)
      ethProvider?.on?.('connect', _connect)
      ethProvider?.on?.('disconnect', _disconnect)

      eventListenersInitialized = true
    }
  })()

  const _init = async (account: string, provider: typeof window.ethereum) => {
    try {
      const ethProvider = new BrowserProvider(provider!)
      const sapphireEthProvider = sapphire.wrap(ethProvider) as BrowserProvider & sapphire.SapphireAnnex

      const network = await sapphireEthProvider.getNetwork()
      _setNetworkSpecificVars(network.chainId, sapphireEthProvider)

      setState(prevState => ({
        ...prevState,
        isConnected: true,
        ethProvider,
        sapphireEthProvider,
        account,
        isUnknownNetwork: false,
      }))
    } catch (ex) {
      setState(prevState => ({
        ...prevState,
        isConnected: false,
      }))

      if (ex instanceof UnknownNetworkError) {
        setState(prevState => ({
          ...prevState,
          isUnknownNetwork: true,
        }))
        throw ex
      } else {
        throw new Error('[Web3Context] Unable to initialize providers!')
      }
    }
  }

  const isProviderAvailable = async () => {
    return isEIP1193ProviderAvailable()
  }

  const connectWallet = async (gentle?: boolean) => {
    const account = await connectWalletEIP1193(gentle)

    if (!account) {
      if (gentle) return
      throw new Error('[Web3Context] Request account failed!')
    }

    await _init(account, window.ethereum)
    _addEventListenersOnce(window.ethereum)
  }

  const switchNetwork = async (chainId = VITE_NETWORK_BIGINT) => {
    return switchNetworkEIP1193(chainId)
  }

  const providerState: Web3ProviderContext = {
    state,
    isProviderAvailable,
    connectWallet,
    switchNetwork,
  }

  if (!initiated) {
    void connectWallet(true)
    setInitiated(true)
  }

  return <Web3Context.Provider value={providerState}>{children}</Web3Context.Provider>
}
