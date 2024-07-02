import { task } from 'hardhat/config';
import { existsSync, promises as fs } from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { parseEther } from 'ethers';


function maketee(filename?:string) {
    return async function tee(line?:string) {
        if( line !== undefined ) {
            console.log(line);
            if( filename ) {
                await fs.appendFile(filename, line + "\n");
            }
        }
    }
}


interface DeployArgs {
    viteenv: string | undefined;
}


async function deploy_xchain(hre:HardhatRuntimeEnvironment, tee:ReturnType<typeof maketee>)
{
    // Deploy HeaderCache contract
    const factory_HeaderCache = await hre.ethers.getContractFactory('HeaderCache');
    const contract_HeaderCache = await factory_HeaderCache.deploy();
    await tee('');
    await tee(`# HeaderCache tx ${contract_HeaderCache.deploymentTransaction()?.hash}`);
    contract_HeaderCache.waitForDeployment();
    await tee(`VITE_CONTRACT_XCHAIN_HEADERCACHE=${await contract_HeaderCache.getAddress()}`);
    const addr_HeaderCache = await contract_HeaderCache.getAddress();

    // Deploy AccountCache contract, which depends on HeaderCache
    const factory_AccountCache = await hre.ethers.getContractFactory('AccountCache');
    const contract_AccountCache = await factory_AccountCache.deploy(addr_HeaderCache);
    await tee('');
    await tee(`# AccountCache tx ${contract_AccountCache.deploymentTransaction()?.hash}`);
    contract_AccountCache.waitForDeployment();
    await tee(`VITE_CONTRACT_XCHAIN_ACCOUNTCACHE=${await contract_AccountCache.getAddress()}`);
    const addr_AccountCache = await contract_AccountCache.getAddress();

    // Deploy StorageProof contract, which depends on AccountCache
    const factory_StorageProof = await hre.ethers.getContractFactory('StorageProof');
    const contract_StorageProof = await factory_StorageProof.deploy(addr_AccountCache);
    await tee('');
    await tee(`# StorageProof tx ${contract_StorageProof.deploymentTransaction()?.hash}`);
    contract_StorageProof.waitForDeployment();
    await tee(`VITE_CONTRACT_XCHAIN_STORAGEPROOF=${await contract_StorageProof.getAddress()}`);
    const addr_StorageProof = await contract_StorageProof.getAddress();

    // Deploy StorageProof ACL contract, which depends on StorageProof
    const factory_StorageProofACL = await hre.ethers.getContractFactory('StorageProofACL');
    const contract_StorageProofACL = await factory_StorageProofACL.deploy(addr_StorageProof);
    await tee('');
    await tee(`# StorageProofACL tx ${contract_StorageProofACL.deploymentTransaction()?.hash}`);
    contract_StorageProofACL.waitForDeployment();
    await tee(`VITE_CONTRACT_ACL_STORAGEPROOF=${await contract_StorageProofACL.getAddress()}`);
    const addr_StorageProofACL = await contract_StorageProofACL.getAddress();

    return { addr_AccountCache, addr_HeaderCache, addr_StorageProof, addr_StorageProofACL };
}


async function deploy_acls(hre:HardhatRuntimeEnvironment, tee:ReturnType<typeof maketee>)
{
  // Deploy AllowAllACL
  const factory_AllowAllACL = await hre.ethers.getContractFactory('AllowAllACL');
  const contract_AllowAllACL = await factory_AllowAllACL.deploy();
  await tee('');
  await tee(`# AllowAllACL tx ${contract_AllowAllACL.deploymentTransaction()?.hash}`);
  await contract_AllowAllACL.waitForDeployment();
  const addr_AllowAllACL = await contract_AllowAllACL.getAddress();
  await tee(`VITE_CONTRACT_ACL_ALLOWALL=${addr_AllowAllACL}`);

  // Deploy VoterAllowListACL
  const factory_VoterAllowListACL = await hre.ethers.getContractFactory('VoterAllowListACL');
  const contract_VoterAllowListACL = await factory_VoterAllowListACL.deploy();
  await tee('');
  await tee(`# VoterAllowListACL tx ${contract_VoterAllowListACL.deploymentTransaction()?.hash}`);
  await contract_VoterAllowListACL.waitForDeployment();
  await tee(`VITE_CONTRACT_ACL_VOTERALLOWLIST=${await contract_VoterAllowListACL.getAddress()}`);

  // Deploy TokenHolderACL
  const factory_TokenHolderACL = await hre.ethers.getContractFactory('TokenHolderACL');
  const contract_TokenHolderACL = await factory_TokenHolderACL.deploy();
  await tee('');
  await tee(`# TokenHolderACL tx ${contract_TokenHolderACL.deploymentTransaction()?.hash}`);
  await contract_TokenHolderACL.waitForDeployment();
  await tee(`VITE_CONTRACT_ACL_TOKENHOLDER=${await contract_TokenHolderACL.getAddress()}`);

  return { addr_AllowAllACL };
}


// Default DAO deployment, no permissions.
task('deploy')
  .addParam('viteenv', 'Output contract addresses to environment file', '')
  .setAction(async (args:DeployArgs, hre) => {
    await hre.run('compile', {quiet:true});

    if( args.viteenv ) {
      console.log(`# Saving environment to ${args.viteenv}`);
      if( existsSync(args.viteenv) )
      {
        await fs.unlink(args.viteenv);
      }
    }

    const tee = maketee(args.viteenv);

    // Export RPC info etc. from current hardhat config
    const currentNetwork = Object.values(hre.config.networks).find((x) => x.chainId === hre.network.config.chainId);
    const currentNetworkUrl = (currentNetwork as any).url;
    tee(`VITE_NETWORK=${hre.network.config.chainId}`);
    if( ! currentNetworkUrl ) {
      tee('VITE_WEB3_GATEWAY=http://localhost:8545');
    }
    else {
      tee(`VITE_WEB3_GATEWAY=${currentNetworkUrl}`);
    }

    await deploy_xchain(hre, tee);
    const { addr_AllowAllACL } = await deploy_acls(hre, tee);

    const factory_TestToken = await hre.ethers.getContractFactory('TestToken');
    const contract_TestToken = await factory_TestToken.deploy();
    await tee('');
    await tee(`# TestToken tx ${contract_TestToken.deploymentTransaction()?.hash}`);
    await contract_TestToken.waitForDeployment();
    await tee(`VITE_CONTRACT_TESTTOKEN=${await contract_TestToken.getAddress()}`);

    const signers = await hre.ethers.getSigners();
    const mint_tx = await contract_TestToken.mint(signers[0].address, parseEther('5'));
    await mint_tx.wait()

    // Deploy GaslessVoting proxy
    const factory_GaslessVoting = await hre.ethers.getContractFactory('GaslessVoting');
    const contract_GaslessVoting = await factory_GaslessVoting.deploy();
    await tee('');
    await tee(`# GaslessVoting tx ${contract_GaslessVoting.deploymentTransaction()?.hash}`);
    await contract_GaslessVoting.waitForDeployment();
    await tee(`VITE_CONTRACT_GASLESSVOTING=${await contract_GaslessVoting.getAddress()}`);

    // Deploy PollManager
    const factory_PollManager = await hre.ethers.getContractFactory('PollManager');
    const contract_PollManager = await factory_PollManager.deploy(
      addr_AllowAllACL,
      await contract_GaslessVoting.getAddress()
    );
    await tee('');
    await tee(`# PollManager tx ${contract_PollManager.deploymentTransaction()?.hash}`);
    await contract_PollManager.waitForDeployment();
    await tee(`VITE_CONTRACT_POLLMANAGER=${await contract_PollManager.getAddress()}`);

    // Set the default PollManager ACL, so frontend doesn't have to query contract
    await tee('');
    await tee('# IPollManagerACL used by PollManager');
    await tee(`VITE_CONTRACT_POLLMANAGER_ACL=${addr_AllowAllACL}`)
});