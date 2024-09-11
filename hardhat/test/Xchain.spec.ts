import { expect } from "chai";
import { ethers } from "hardhat";
import { Block, getBigInt, getNumber, keccak256, toQuantity, ZeroAddress } from "ethers";

import { HeaderCache } from "../src/contracts";
import {
    chain_info,
    fetchAccountProof,
    getBlockHeaderRLP,
    xchainRPC
 } from "@oasisprotocol/side-dao-contracts";

describe("Cross-chain", function () {
    let headerCache: HeaderCache;

    before(async () => {
        const factory = await ethers.getContractFactory('HeaderCache');
        headerCache = await factory.deploy();
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
    it('Historic Proofs', async () => {
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
            let testAccount:string;
            while( true ) {
                const b = await rpc.getBlock(blockNumber, true);
                if( b === null || ! b ) {
                    throw new Error(`Failed to retrieve latest block for ${chainId}: ${chain.name}`);
                }

                // Find a block with transactions
                if( b.transactions.length == 0 ) {
                    blockNumber -= 1;
                    console.log(`  - skipping (chainId:${chainId} chain:${chain.name} height:${blockNumber})`)
                    continue
                }

                // Find an account which has a balance at this specific block
                let x:string|undefined = undefined;
                for( const t of b.prefetchedTransactions ) {
                    if( t.from != ZeroAddress ) {
                        const fromBalance = await rpc.getBalance(t.from, blockNumber);
                        if( fromBalance > 0n ) {
                            x = t.from;
                            break;
                        }
                    }

                    if( t.to && t.to != ZeroAddress ) {
                        const toBalance = await rpc.getBalance(t.to, blockNumber);
                        if( toBalance > 0n ) {
                            x = t.to;
                            break;
                        }
                    }
                }
                if( ! x ) {
                    console.log(`  - cannot find test account (chainId:${chainId} chain:${chain.name} height:${blockNumber})`)
                    blockNumber -= 1;
                    continue;
                }

                block = b;
                testAccount = x;
                break;
            }

            // Fetch proofs for the chosen account, ensuring eth_getProof works
            console.log(`  - fetching proof (blockhash:${block.hash} block:${blockNumber} account:${testAccount})`);
            const proof = await fetchAccountProof(rpc, block.hash!, testAccount);
            //console.log('Proof is', proof);

            // Then, to verify archive node status...
            // Figure out number of seconds in between blocks (on average)
            const nBlockGap = 5;
            const prevBlockNumber = blockNumber - nBlockGap;
            const prevBlock = await rpc.getBlock(prevBlockNumber, false);
            if( ! prevBlock ) {
                throw new Error(`Unable to retrieve previous block: ${prevBlockNumber}`);
            }

            // Then go back more than 512 blocks, or 1 day, whichever is greater
            // This ensures the data being retrieved is archived
            const nBlocksConsideredArchived = 512;
            const secondsPerBlockAvg = (block.timestamp - prevBlock.timestamp) / nBlockGap;
            const yesterdayTimestamp = block.timestamp - (60 * 60 * 24);
            const yesterdayBlockNumber = Math.min(blockNumber - Math.round((yesterdayTimestamp - block.timestamp) / secondsPerBlockAvg), blockNumber - nBlocksConsideredArchived);
            const yesterdayBlock = await rpc.getBlock(yesterdayBlockNumber);
            if( ! yesterdayBlock ) {
                throw new Error(`Failed to retrieve yesterdays block: ${yesterdayBlockNumber}`);
            }

            console.log(`  - fetching proof (blockhash:${yesterdayBlock.hash} block:${yesterdayBlockNumber} account:${testAccount})`);
            const yesterdayProof = await fetchAccountProof(rpc, yesterdayBlock?.hash!, testAccount);
            //console.log('Yesterday proof', yesterdayProof);

            // Then fetch proofs for the same block, ensuring eth_getProof works for historic data
        }
    });
});
