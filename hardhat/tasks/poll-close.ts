import { string } from 'hardhat/internal/core/params/argumentTypes'
import { task } from 'hardhat/config'
import { HttpNetworkUserConfig } from 'hardhat/types'

interface CloseArgs {
  pm: string
  proposalId: string
}

/**
 * Example usage:
 * npx hardhat poll-close --network sapphire-testnet 0xdAB5845136b3102E63023BB2A2405cb71608605d 0x91a86550e12752aac5353d3dae5f59867acb9058055bc9e9331db99f7e7f5627
 */
task('poll-close', 'Close proposal')
  .addPositionalParam<string>('pm', 'Poll manager contract address', undefined, string, false)
  .addPositionalParam<string>('proposalId', 'Id of proposal to close', undefined, string, false)
  .setAction(async (args: CloseArgs, hre) => {
    const ethers = hre.ethers;
    const { pm, proposalId } = args

    const currentNetwork = Object.values(hre.config.networks).find(
      x => x.chainId === hre.network.config.chainId
    ) as HttpNetworkUserConfig

    const pollManager = await ethers.getContractAt('PollManager', pm);

    const tx = await pollManager.close(proposalId);
    console.log('Transaction ID', tx.hash)

    const receipt = (await tx.wait())!
    const proposalClosedFilter = pollManager.filters.ProposalClosed()
    const [
        {
          args: [hash],
        },
      ] = await pollManager.queryFilter(proposalClosedFilter, receipt!.blockNumber)

    console.log(`Closed proposal with ID: "${hash}"`)
  });
