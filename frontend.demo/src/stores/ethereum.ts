import detectEthereumProvider from '@metamask/detect-provider';
import {
  wrap as sapphireWrap,
  NETWORKS as SAPPHIRE_NETWORKS,
} from '@oasisprotocol/sapphire-paratime';
import {
  toQuantity,
  JsonRpcProvider,
  JsonRpcApiProvider,
  JsonRpcSigner,
  BrowserProvider,
} from 'ethers';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef, toValue } from 'vue';
import type { EIP1193Provider } from './eip1193';

export enum Network {
  Unknown = 0,
  Ethereum = 1,
  Goerli = 10,
  BscMainnet = 56,
  BscTestnet = 97,
  EmeraldTestnet = 0xa515,
  EmeraldMainnet = 0xa516,
  SapphireTestnet = 0x5aff,
  SapphireMainnet = 0x5afe,
  SapphireLocalnet = 0x5afd,
  PolygonMumbai = 0x13381,
  Local = 1337,

  FromConfig = parseInt(import.meta.env.VITE_NETWORK),
}

export enum ConnectionStatus {
  Unknown,
  Disconnected,
  Connected,
}

const networkNameMap: Record<Network, string> = {
  [Network.Unknown]: 'Unknown Network',
  [Network.Ethereum]: 'Ethereum',
  [Network.Local]: 'Local Network',
  [Network.Goerli]: 'Goerli',
  [Network.EmeraldTestnet]: 'Emerald Testnet',
  [Network.EmeraldMainnet]: 'Emerald Mainnet',
  [Network.SapphireTestnet]: 'Sapphire Testnet',
  [Network.SapphireMainnet]: 'Sapphire Mainnet',
  [Network.SapphireLocalnet]: 'Sapphire Localnet',
  [Network.PolygonMumbai]: 'Polygon Mumbai',
  [Network.BscMainnet]: 'BSC',
  [Network.BscTestnet]: 'BSC Testnet',
} as const;

function networkFromChainId(chainId: number | string): Network {
  const id = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  if (Network[id]) return id as Network;
  return Network.Unknown;
}

export function networkName(network?: Network): string {
  if (network && networkNameMap[network]) {
    return networkNameMap[network];
  }
  return networkNameMap[Network.Unknown];
}

declare global {
  interface Window {
    ethereum: EIP1193Provider;
  }
}

export const useEthereumStore = defineStore('ethereum', () => {
  const signer = shallowRef<JsonRpcSigner | undefined>(undefined);
  const provider = sapphireWrap(
    new JsonRpcProvider(import.meta.env.VITE_WEB3_GATEWAY, 'any'),
  ) as JsonRpcProvider;
  const network = ref(Network.FromConfig);
  const address = ref<string | undefined>();
  const status = ref(ConnectionStatus.Unknown);
  const isSapphire = ref<boolean>(false);
  const isHomeChain = computed<boolean>(() => toValue(network) == Network.FromConfig);

  async function _changeAccounts(accounts: string[]) {
    if (accounts.length) {
      status.value = ConnectionStatus.Connected;
    } else {
      status.value = ConnectionStatus.Disconnected;
      signer.value = undefined;
      network.value = Network.Unknown;
      address.value = undefined;
    }
  }

  detectEthereumProvider<EIP1193Provider>().then(async (ethProvider) => {
    if (!ethProvider) {
      console.log('No EIP-1193 provider discovered using detectEthereumProvider');
      return;
    }

    await getSigner(false, false);

    ethProvider.on('accountsChanged', async (accounts) => {
      console.log('Accounts changed!', accounts);
      await _changeAccounts(accounts);
    });
    ethProvider.on('chainChanged', async (chainId) => {
      console.log('Chain Changed!', chainId);
      await getSigner();
      console.log('chainChanged', chainId);
    });
    ethProvider.on('connect', (info) => {
      network.value = networkFromChainId(info.chainId);
      status.value = ConnectionStatus.Connected;
      console.log('connect');
      // TODO: request accounts?
    });
    ethProvider.on('disconnect', () => {
      console.log('disconnect');
      _changeAccounts([]);
    });
    _changeAccounts(await ethProvider.request({ method: 'eth_accounts' }));
  });

  async function getSigner(in_doConnect?: boolean, in_doSwitch?: boolean, in_account?: string) {
    let l_signer: JsonRpcSigner | undefined;
    let l_provider: JsonRpcApiProvider | undefined;
    if (!signer.value || (in_account && (await signer.value.getAddress()) != in_account)) {
      const ethProvider = await detectEthereumProvider<EIP1193Provider>();
      if (!ethProvider) {
        console.log('getSigner, detectEthereumProvider empty!!');
        return undefined;
      }
      l_provider = new BrowserProvider(ethProvider);
    } else {
      l_signer = signer.value;
      if (l_signer) {
        l_provider = signer.value.provider;
      }
    }

    // With no provider, do nothing
    if (!l_provider) {
      console.log('getSigner, no provider!');
      return;
    }

    let l_accounts = await l_provider.send('eth_accounts', []);

    // Check if we are already connecting before requesting accounts again
    if (in_doConnect) {
      if (!l_accounts.length) {
        l_accounts = await l_provider.send('eth_requestAccounts', []);
        await _changeAccounts(l_accounts);
      }
    }

    if (l_accounts.length) {
      l_signer = await l_provider.getSigner(in_account);
    }

    // Check if we're requested to switch networks
    let l_network = networkFromChainId(await l_provider.send('eth_chainId', []));
    if (in_doSwitch && (l_network != network.value || l_network != Network.FromConfig)) {
      try {
        await l_provider.send('wallet_switchEthereumChain', [
          { chainId: toQuantity(Network.FromConfig) },
        ]);
        l_network = Network.FromConfig;
      } catch (e: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if ((e as any).code !== 4902) throw e;
        addNetwork(l_network);
        throw e;
      }
    }

    // Sapphire signers are always wrapped
    const l_isSapphire = l_network in SAPPHIRE_NETWORKS;
    if (l_isSapphire && l_signer) {
      l_signer = sapphireWrap(l_signer);
    }

    signer.value = l_signer;
    network.value = l_network;
    isSapphire.value = l_isSapphire;
    if (l_accounts.length) {
      address.value = l_accounts[0];
      status.value = ConnectionStatus.Connected;
    }

    return l_signer;
  }

  // Request that window.ethereum be connected to an account
  // Only sets `signer` value upon successful connection
  async function connect() {
    await getSigner(true, true);
  }

  async function addNetwork(network: Network = Network.FromConfig) {
    const eth = await detectEthereumProvider<EIP1193Provider>();
    if (!eth) {
      throw new Error('addNetwork detectEthereumProvider = null');
    }

    if (network == Network.SapphireTestnet) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x5aff',
            chainName: 'Sapphire Testnet',
            nativeCurrency: { name: 'TEST', symbol: 'TEST', decimals: 18 },
            rpcUrls: ['https://testnet.sapphire.oasis.dev/', 'wss://testnet.sapphire.oasis.dev/ws'],
            blockExplorerUrls: ['https://explorer.stg.oasis.io/testnet/sapphire'],
          },
        ],
      });
    } else if (network === Network.SapphireMainnet) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x5afe',
            chainName: 'Sapphire Mainnet',
            nativeCurrency: {
              name: 'ROSE',
              symbol: 'ROSE',
              decimals: 18,
            },
            rpcUrls: ['https://sapphire.oasis.io/', 'wss://sapphire.oasis.io/ws'],
            blockExplorerUrls: ['https://explorer.oasis.io/mainnet/sapphire'],
          },
        ],
      });
    } else if (network === Network.SapphireLocalnet) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x5afd',
            chainName: 'Sapphire Localnet',
            rpcUrls: ['http://localhost:8545'],
          },
        ],
      });
    }
  }

  async function switchNetwork(network: Network = Network.FromConfig) {
    console.log(`Switching network: ${network}`);
    await getSigner(true, true);
  }

  return {
    signer,
    provider,
    address,
    network,
    connect,
    addNetwork,
    switchNetwork,
    isSapphire,
    isHomeChain,
  };
});
