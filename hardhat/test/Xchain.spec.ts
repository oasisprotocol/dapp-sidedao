import { expect } from "chai";
import { ethers } from "hardhat";
import { Block, BlockParams, decodeRlp, encodeRlp, getBytes, getNumber,
         JsonRpcProvider, keccak256, toBigInt, toQuantity, ZeroAddress
       } from "ethers";
import { Trie } from '@ethereumjs/trie'
import { AccountCache, HeaderCache } from "../src/contracts";
import {
    chain_info,
    fetchAccountProof,
    getBlockHeaderRLP,
    xchainRPC
} from "@oasisprotocol/side-dao-contracts";

type BlockParamsExtra = BlockParams & {stateRoot:string};

// rather than using `rpc.getBlock`, retrieve the raw result then wrap
// ethers.Block hides a bunch of useful values... ;_;
async function fetchBlock(rpc:JsonRpcProvider, blockNumber:number) : Promise<[Block, BlockParamsExtra]> {
    const rawBlockData = await rpc.send('eth_getBlockByNumber', [toQuantity(blockNumber), true]);
    const b = new Block(rawBlockData, rpc);
    return [b, rawBlockData as BlockParamsExtra];
}

async function verifyProof(
    rpc:JsonRpcProvider,
    accountCache:AccountCache,
    block:BlockParamsExtra,
    testAccount:string
) {
    console.log(`  - fetching proof (blockhash:${block.hash} block:${block.number} account:${testAccount})`);
    const proof = await fetchAccountProof(rpc, block.hash!, testAccount);

    // Can @ethereumjs code verify the returned merkle proof?
    const rawProof = (decodeRlp(proof) as string[]).map(encodeRlp).map((_) => getBytes(_));
    const proofTree = await Trie.createFromProof(rawProof, {useKeyHashing: true});
    expect(await proofTree.checkRoot(getBytes(block.stateRoot))).eq(true);
    const accountData = decodeRlp( (await proofTree.get(getBytes(testAccount)))! ) as string[];

    // And that the on-chain contracts can verify the merkle proof
    const onChainAccountData = await accountCache.verifyAccount(block.stateRoot, testAccount, proof);

    // Verify our local decoding & on-chain decoding matches
    expect(toBigInt(accountData[0])).eq(onChainAccountData[0]);
    expect(toBigInt(accountData[1])).eq(onChainAccountData[1]);
    expect(accountData[2]).eq(onChainAccountData[2]);
    expect(accountData[3]).eq(onChainAccountData[3]);

    return onChainAccountData;
}

describe("Cross-chain", function () {
    let headerCache: HeaderCache;
    let accountCache: AccountCache;

    before(async () => {
        const headerCacheFactory = await ethers.getContractFactory('HeaderCache');
        headerCache = await headerCacheFactory.deploy();

        const accountCacheFactory = await ethers.getContractFactory('AccountCache');
        accountCache = await accountCacheFactory.deploy(await headerCache.getAddress());
    });

    it('Header Serialization', async () => {
        for( const k of Object.keys(chain_info) )
        {
            const chainId = Number(k);
            const chain = chain_info[chainId];

            if( chain.cannotMakeStorageProofs ) {
                continue;
            }

            const rpc = xchainRPC(chainId);

            const block = await rpc.getBlock('latest', false);
            expect(block).to.not.be.null;

            // Verify the RLP encoded block header matches
            const headerRlp = await getBlockHeaderRLP(rpc, block!.hash!);
            const headerHash = keccak256(headerRlp)
            expect(headerHash).eq(block!.hash);

            // Verify header can be decoded by contract
            const header = await headerCache.extractHeader(headerRlp);
            expect(Number(header.blockTimestamp)).eq(block!.timestamp);

            // Add header to on-chain header cache
            const tx = await headerCache.add(headerRlp);
            await tx.wait();

            // Retrieve header from on-chain header cache
            const info = await headerCache.get(headerHash);
            expect(Number(info.blockTimestamp)).eq(Number(header.blockTimestamp));
        }
    });

    // Verifies that the RPC endpoints are archive nodes and can retrieve historic proofs
    it('Historic Proofs', async function () {
        // Allow roughly 3 seconds per supported chain
        this.timeout(Object.keys(chain_info).length * 1000 * 3);

        for( const k of Object.keys(chain_info) )
        {
            const chainId = Number(k);
            const chain = chain_info[chainId];
            if( chain.cannotMakeStorageProofs ) {
                continue;
            }

            const rpc = xchainRPC(chainId);

            // Walk backwards from most recent block, until we find one useful for testing
            // This includes finding an account which has a non-zero balance
            let blockNumber = getNumber(await rpc.send('eth_blockNumber', []));
            let block:Block;
            let blockRawData:BlockParamsExtra;
            let testAccount:string;
            let testAccountBalance:bigint;
            while( true ) {
                // NOTE: Ethers `Block` object doesn't give us any way to retrieve additional fields
                //       such as `stateRoot`... and we need `stateRoot` to verify account proofs!
                //       So, must fetch the raw block data too
                const [b, rawBlockData] = await fetchBlock(rpc, blockNumber);

                // Find a block with transactions
                if( b.transactions.length == 0 ) {
                    blockNumber -= 1;
                    console.log(`  - skipping, no transactions (chainId:${chainId} chain:${chain.name} height:${blockNumber})`)
                    continue
                }

                // Find an account which has a balance at this specific block
                let x:string|undefined = undefined;
                let balance:bigint = 0n;
                for( const t of b.prefetchedTransactions ) {
                    if( t.from != ZeroAddress ) {
                        const fromBalance = await rpc.getBalance(t.from, blockNumber);
                        if( fromBalance > 0n ) {
                            x = t.from;
                            balance = fromBalance;
                            break;
                        }
                    }

                    if( t.to && t.to != ZeroAddress ) {
                        const toBalance = await rpc.getBalance(t.to, blockNumber);
                        if( toBalance > 0n ) {
                            x = t.to;
                            balance = toBalance;
                            break;
                        }
                    }
                }
                if( ! x || balance === 0n ) {
                    console.log(`  - cannot find test account (chainId:${chainId} chain:${chain.name} height:${blockNumber})`)
                    blockNumber -= 1;
                    continue;
                }

                block = b;
                testAccount = x;
                blockRawData = rawBlockData;
                testAccountBalance = balance;
                break;
            }

            // Fetch proofs for the chosen account, ensuring eth_getProof works
            // Ensure that on-chain contract can verify the account proof
            const proofInfo = await verifyProof(rpc, accountCache, blockRawData, testAccount);
            expect(proofInfo.balance).eq(testAccountBalance);

            // Then, to verify archive node status...
            // Figure out number of seconds in between blocks (on average)
            const nBlockGap = 5;
            const prevBlockNumber = blockNumber - nBlockGap;
            const [prevBlock,] = await fetchBlock(rpc, prevBlockNumber);

            // Then go back more than 512 blocks, or 1 day, whichever is greater
            // This ensures the data being retrieved is archived
            const nBlocksConsideredArchived = 512;
            const secondsPerBlockAvg = (block.timestamp - prevBlock.timestamp) / nBlockGap;
            const yesterdayTimestamp = block.timestamp - (60 * 60 * 24);
            const yesterdayBlockNumber = Math.min(blockNumber - Math.round((yesterdayTimestamp - block.timestamp) / secondsPerBlockAvg), blockNumber - nBlocksConsideredArchived);
            const [yesterdayBlock, rawYesterdayBlockData] = await fetchBlock(rpc, yesterdayBlockNumber);
            if( ! yesterdayBlock ) {
                throw new Error(`Failed to retrieve yesterdays block: ${yesterdayBlockNumber}`);
            }

            // Then verify we can retrieve proofs for historic data, and verify on-chain
            await verifyProof(rpc, accountCache, rawYesterdayBlockData, testAccount);
        }
    });
});
