import { Contract, JsonRpcProvider, toBeHex, ZeroHash, solidityPackedKeccak256,
         zeroPadValue, formatUnits, encodeRlp, decodeRlp, BytesLike, hexlify
} from "ethers"

import { GetProofResponse, TokenInfo } from "./types.js";
import { Block, BlockOptions, JsonRpcBlock } from "@ethereumjs/block";
import { Common, CustomChain } from "@ethereumjs/common";

export function randomchoice<T>(array:T[]):T {
  return array[Math.floor(Math.random() * array.length)];
}

export const chain_info: Record<number,any> = {
    1: {
        "name": "Ethereum Mainnet",
        "chain": "ETH",
        "icon": "ethereum",
        "rpc": [
          "https://eth-mainnet.g.alchemy.com/v2/asYK8chMrnekMUTAvVwaNG2OHyp4fLCe"
          //"https://mainnet.infura.io/v3/${INFURA_API_KEY}",
          //"wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}",
          //"https://api.mycryptoapi.com/eth",
          //"https://cloudflare-eth.com",
          //"https://ethereum.publicnode.com",
          //"wss://ethereum.publicnode.com",
          //"https://mainnet.gateway.tenderly.co",
          //"wss://mainnet.gateway.tenderly.co",
          //"https://rpc.blocknative.com/boost",
          //"https://rpc.flashbots.net",
          //"https://rpc.flashbots.net/fast",
          //"https://rpc.mevblocker.io",
          //"https://rpc.mevblocker.io/fast",
          //"https://rpc.mevblocker.io/noreverts",
          //"https://rpc.mevblocker.io/fullprivacy"
        ],
        "features": [{ "name": "EIP155" }, { "name": "EIP1559" }],
        "faucets": [],
        "nativeCurrency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        },
        "infoURL": "https://ethereum.org",
        "shortName": "eth",
        "chainId": 1,
        "networkId": 1,
        "slip44": 60,
        "ens": {
          "registry": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
        },
        "explorers": [
          {
            "name": "etherscan",
            "url": "https://etherscan.io",
            "standard": "EIP3091"
          },
          {
            "name": "blockscout",
            "url": "https://eth.blockscout.com",
            "icon": "blockscout",
            "standard": "EIP3091"
          },
          {
            "name": "dexguru",
            "url": "https://ethereum.dex.guru",
            "icon": "dexguru",
            "standard": "EIP3091"
          }
        ]
    },
    56: {
        "name": "BNB Smart Chain Mainnet",
        "chain": "BSC",
        "rpc": [
          "https://bsc-dataseed1.bnbchain.org",
          "https://bsc-dataseed2.bnbchain.org",
          "https://bsc-dataseed3.bnbchain.org",
          "https://bsc-dataseed4.bnbchain.org",
          "https://bsc-dataseed1.defibit.io",
          "https://bsc-dataseed2.defibit.io",
          "https://bsc-dataseed3.defibit.io",
          "https://bsc-dataseed4.defibit.io",
          "https://bsc-dataseed1.ninicoin.io",
          "https://bsc-dataseed2.ninicoin.io",
          "https://bsc-dataseed3.ninicoin.io",
          "https://bsc-dataseed4.ninicoin.io",
          "https://bsc.publicnode.com",
          //"wss://bsc.publicnode.com",
          //"wss://bsc-ws-node.nariox.org"
        ],
        "faucets": [],
        "nativeCurrency": {
          "name": "BNB Chain Native Token",
          "symbol": "BNB",
          "decimals": 18
        },
        "infoURL": "https://www.bnbchain.org/en",
        "shortName": "bnb",
        "chainId": 56,
        "networkId": 56,
        "slip44": 714,
        "explorers": [
          {
            "name": "bscscan",
            "url": "https://bscscan.com",
            "standard": "EIP3091"
          },
          {
            "name": "dexguru",
            "url": "https://bnb.dex.guru",
            "icon": "dexguru",
            "standard": "EIP3091"
          }
        ]
    },
    42161: {
        "name": "Arbitrum One",
        "chainId": 42161,
        "shortName": "arb1",
        "chain": "ETH",
        "networkId": 42161,
        "nativeCurrency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        },
        "rpc": [
          //"https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}",
          //"https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}",
          "https://arb1.arbitrum.io/rpc",
          "https://arbitrum-one.publicnode.com",
          //"wss://arbitrum-one.publicnode.com"
        ],
        "faucets": [],
        "explorers": [
          {
            "name": "Arbiscan",
            "url": "https://arbiscan.io",
            "standard": "EIP3091"
          },
          {
            "name": "Arbitrum Explorer",
            "url": "https://explorer.arbitrum.io",
            "standard": "EIP3091"
          },
          {
            "name": "dexguru",
            "url": "https://arbitrum.dex.guru",
            "icon": "dexguru",
            "standard": "EIP3091"
          }
        ],
        "infoURL": "https://arbitrum.io",
        "parent": {
          "type": "L2",
          "chain": "eip155-1",
          "bridges": [{ "url": "https://bridge.arbitrum.io" }]
        }
    },
    10: {
        "name": "OP Mainnet",
        "chain": "ETH",
        "rpc": [
          "https://opt-mainnet.g.alchemy.com/v2/LTUd8wMSlbXxWBHpYyFE-WyOh2wud4Hb",
          //"https://mainnet.optimism.io",
          //"https://optimism.publicnode.com",
          //"wss://optimism.publicnode.com",
          //"https://optimism.gateway.tenderly.co",
          //"wss://optimism.gateway.tenderly.co"
        ],
        "faucets": [],
        "nativeCurrency": {
          "name": "Ether",
          "symbol": "ETH",
          "decimals": 18
        },
        "infoURL": "https://optimism.io",
        "shortName": "oeth",
        "chainId": 10,
        "networkId": 10,

        "explorers": [
          {
            "name": "etherscan",
            "url": "https://optimistic.etherscan.io",
            "standard": "EIP3091"
          },
          {
            "name": "blockscout",
            "url": "https://optimism.blockscout.com",
            "icon": "blockscout",
            "standard": "EIP3091"
          },
          {
            "name": "dexguru",
            "url": "https://optimism.dex.guru",
            "icon": "dexguru",
            "standard": "EIP3091"
          }
        ]
    },
    137: {
        "name": "Polygon Mainnet",
        "chain": "Polygon",
        "icon": "polygon",
        "rpc": [
          "https://polygon-mainnet.g.alchemy.com/v2/cwgNHMG7HVg1gg_PiN2tZdr27wbW8h9d"
          //"https://polygon-rpc.com/",
          //"https://rpc-mainnet.matic.network",
          //"https://matic-mainnet.chainstacklabs.com",
          //"https://rpc-mainnet.maticvigil.com",
          //"https://rpc-mainnet.matic.quiknode.pro",
          //"https://matic-mainnet-full-rpc.bwarelabs.com",
          //"https://polygon-bor.publicnode.com",
          //"wss://polygon-bor.publicnode.com",
          //"https://polygon.gateway.tenderly.co",
          //"wss://polygon.gateway.tenderly.co"
        ],
        "faucets": [],
        "nativeCurrency": {
          "name": "MATIC",
          "symbol": "MATIC",
          "decimals": 18
        },
        "infoURL": "https://polygon.technology/",
        "shortName": "matic",
        "chainId": 137,
        "networkId": 137,
        "slip44": 966,
        "explorers": [
          {
            "name": "polygonscan",
            "url": "https://polygonscan.com",
            "standard": "EIP3091"
          },
          {
            "name": "dexguru",
            "url": "https://polygon.dex.guru",
            "icon": "dexguru",
            "standard": "EIP3091"
          }
        ]
    },
    80001: {
      "name": "Polygon Testnet Mumbai",
      "chain": "Polygon",
      "icon": "polygon",
      "rpc": [
        //"https://rpc.ankr.com/polygon_mumbai",
        //"https://rpc.ankr.com/polygon_mumbai",
        //"https://gateway.tenderly.co/public/polygon-mumbai",
        "https://polygon-mumbai.g.alchemy.com/v2/g4qVlKDewH8F19bv47GB1Iq3Ca_XxWhN"
      ],
      "faucets": [],
      "nativeCurrency": {
        "name": "MATIC",
        "symbol": "MATIC",
        "decimals": 18
      },
      "infoURL": "https://polygon.technology/",
      "shortName": "matic",
      "chainId": 80001,
      "networkId": 80001,
      "explorers": [
      ]
  },

} as const;

function _getNameAndChainidMap() {
  const res: Record<number,string> = {};
  for( const x in chain_info ) {
    const y = chain_info[x];
    res[y.name] = y.chainId;
  }
  return res;
}

export const xchain_ChainNamesToChainId = _getNameAndChainidMap();

export function xchainRPC(chainId:number)
{
    if( ! (chainId in chain_info) ) {
        throw new Error(`Unknown chain: ${chainId}`);
    }

    const info = chain_info[chainId];
    const rpc_url = randomchoice(info.rpc as string[]);
    console.log('Using RPC URL', rpc_url);
    return new JsonRpcProvider(rpc_url);
}

export async function tokenDetailsFromProvider(addr:string, provider:JsonRpcProvider) : Promise<TokenInfo>
{
  const abi = [
    "function name() public view returns (string)",
    "function symbol() public view returns (string)",
    "function decimals() public view returns (uint8)",
    "function totalSupply() public view returns (uint256)",
  ];
  const c = new Contract(addr, abi, provider);
  const network = await provider.getNetwork();
  return {
    addr: addr,
    chainId: network.chainId,
    name: await c.name(),
    symbol: await c.symbol(),
    decimals: await c.decimals(),
    totalSupply: await c.totalSupply(),
  }
}


export async function getHolderBalance(token:string, holder:string, provider:JsonRpcProvider) : Promise<bigint>
{
  return await new Contract(token, [
    "function balanceOf(address) public view returns (uint256)",
  ], provider).balanceOf(holder);
}

export function getMapSlot(holderAddress: string, mappingPosition: number): string {
  return solidityPackedKeccak256(
    ["bytes", "uint256"],
    [zeroPadValue(holderAddress, 32), mappingPosition]
  );
}

export async function isERCTokenContract(provider: JsonRpcProvider, address: string): Promise<boolean> {
  try {
    await tokenDetailsFromProvider(address, provider);
  } catch (e) {
    return false
  }

  return true;
}

export async function guessStorageSlot(provider: JsonRpcProvider, account: string, holder: string, blockHash = 'latest'): Promise<{index:number,balance:bigint,balanceDecimal:string} | null> {
  const tokenDetails = await tokenDetailsFromProvider(account, provider);
  const abi = ["function balanceOf(address account) view returns (uint256)"];
  const c = new Contract(account, abi, provider);
  const balance = await c.balanceOf(holder) as bigint;
  console.log('Balance is', typeof balance, balance);
  const balanceInHex = toBeHex(balance, 32);

  // shortlist most frequently used slots, then do brute force
  let shortlist = [
    0x65, // Aragon Test Xi (Mumbai) 0xb707dfe506ce7e10374c14de6891da3059d989b2
    0x1,  // Tally Compound (Ethereum) 0xc00e94Cb662C3520282E6f5717214004A7f26888
    0x33  // DAO Haus Test Xi (Polygon) 0x4d0a8159B88139341c1d1078C8A97ff6001dda91
  ];

  let restOfList = [...Array(256).keys()].filter(i => !shortlist.includes(i));

  // Query most likely range of slots
  for( const i of shortlist.concat(restOfList) ) {
    const result = await provider.send('eth_getStorageAt', [
      account,
      getMapSlot(holder, i),
      blockHash,
    ]);

    if (result == balanceInHex && result != ZeroHash) {
      return {
        index: i,
        balance,
        balanceDecimal: formatUnits(balance, tokenDetails.decimals)
      };
    }
  }

  return null;
}

export async function fetchStorageProof(provider: JsonRpcProvider, blockHash: string, address: string, slot: number, holder: string): Promise<BytesLike> {
  // TODO Probably unpack and verify
  const response = await provider.send('eth_getProof', [
    address,
    [getMapSlot(holder, slot)],
    blockHash,
  ]) as GetProofResponse;
  return encodeRlp(response.storageProof[0].proof.map(decodeRlp));
}

export async function fetchAccountProof(provider: JsonRpcProvider, blockHash: string, address: string): Promise<BytesLike> {
  const response = await provider.send('eth_getProof', [
    address,
    [],
    blockHash,
  ]) as GetProofResponse;
  return encodeRlp(response.accountProof.map(decodeRlp));
}

export const ETHEREUMJS_POLYGON_BLOCK_OPTIONS = {
  common: Common.custom(CustomChain.PolygonMainnet, {hardfork: 'london'}),
  skipConsensusFormatValidation: true
} as BlockOptions;


export async function getBlockHeaderRLP(
  provider: JsonRpcProvider,
  blockHash: string,
  opts?: BlockOptions)
{
  opts = opts ?? ETHEREUMJS_POLYGON_BLOCK_OPTIONS;

  const result = await provider.send('eth_getBlockByHash', [blockHash, false]) as JsonRpcBlock;

  //return hexlify(blockHeaderFromRpc(result, opts).serialize());

  //const h = BlockHeader.fromHeaderData(x, opts);

  const b = Block.fromRPC(result, [], opts);
  return hexlify(b.header.serialize());
}