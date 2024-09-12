import { Contract, JsonRpcProvider, toBeHex, ZeroHash, solidityPackedKeccak256,
         zeroPadValue, formatUnits, encodeRlp, decodeRlp, BytesLike, hexlify
} from "ethers"

import { GetProofResponse, TokenInfo } from "./types.js";
import { chain_info } from './chains.js';
import { Block, BlockOptions, JsonRpcBlock } from "@ethereumjs/block";
import { Common, CustomChain } from "@ethereumjs/common";

export function randomchoice<T>(array:T[]):T {
  return array[Math.floor(Math.random() * array.length)];
}

function _getNameAndChainidMap() {
  const res: Record<string,number> = {};
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
    const rpc_url = randomchoice(info.rpcUrls as string[]);
    console.log('Using RPC URL', rpc_url);
    return new JsonRpcProvider(rpc_url);
}

const ERC20Abi = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function decimals() public view returns (uint8)",
  "function totalSupply() public view returns (uint256)",
];

export async function erc20TokenDetailsFromProvider(addr:string, provider:JsonRpcProvider) : Promise<TokenInfo>
{
  const c = new Contract(addr, ERC20Abi, provider);
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

const ERC165Abi = [
  "function supportsInterface(bytes4) public view returns (bool)",
];
const ERC721InterfaceId: string = "0x80ac58cd";
const ERC1155InterfaceId: string = "0xd9b67a26";

export async function getNftContractType(addr:string, provider:JsonRpcProvider): Promise<string | undefined> {
  try {
    const c = new Contract(addr, ERC165Abi, provider);
    const isERC721 = await c.supportsInterface(ERC721InterfaceId)
    if (isERC721) return "ERC-721"
    const isERC1155 = await c.supportsInterface(ERC1155InterfaceId)
    if (isERC1155) return "ERC-1155"
  } catch {
    // Doesn't support ERC-165, so definitely not am ERC-721 or an ERC-1155 NFT.
  }
}

export async function isNFTTokenContract(addr:string, provider:JsonRpcProvider): Promise<boolean> {
  return !!await getNftContractType(addr, provider)
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

export async function isERC20TokenContract(provider: JsonRpcProvider, address: string): Promise<boolean> {
  try {
    await erc20TokenDetailsFromProvider(address, provider);
  } catch (e) {
    return false
  }

  return true;
}

export async function guessStorageSlot(
  provider: JsonRpcProvider, account: string, holder: string, blockHash = 'latest',
  progressCallback?: (progress: string) => void | undefined
): Promise<{index:number,balance:bigint,balanceDecimal:string} | null> {
  const tokenDetails = await erc20TokenDetailsFromProvider(account, provider);
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

  const allSlots = shortlist.concat(restOfList)
  // Query most likely range of slots
  for( const i of allSlots ) {
    if (progressCallback) progressCallback(`Checking slot #${i} (${allSlots.indexOf(i)+1} of ${allSlots.length})`)
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

/// Retrieve RLP encoded block header
export async function getBlockHeaderRLP(
  provider: JsonRpcProvider,
  blockHash: string
) {
  // Detect which chain RPC provider is, construct custom chain config with hardfork
  const net = await provider.getNetwork();
  const chainId = Number(net.chainId);
  if( ! chainId ) {
    throw new Error("Unable to determine chain ID!");
  }
  if( ! (chainId in chain_info) ) {
    throw new Error("Unsupported chain ID");
  }
  const chain = chain_info[chainId];
  if( ! chain.hardfork ) {
    throw new Error("Unknown hardfork for chain!");
  }

  const opts = {
    common: Common.custom(CustomChain.PolygonMainnet, {
      hardfork: chain.hardfork,
    }),
    skipConsensusFormatValidation: true
  } as BlockOptions;

  // Some chains need specific EIPs enabled
  if( chain.customEIPs ) {
    const customEIPs: number[] = chain.customEIPs;
    opts.common!.setEIPs(customEIPs);
  }

  const result = await provider.send('eth_getBlockByHash', [blockHash, false]) as JsonRpcBlock;

  const b = Block.fromRPC(result, [], opts);
  return hexlify(b.header.serialize());
}
