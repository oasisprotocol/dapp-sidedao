import { BytesLike, ethers } from "ethers";

export type RequestType = {
    dao: string;
    voter: string;
    proposalId: BytesLike;
    choiceId: number;
};


export async function signVotingRequest(
    verifyingContract:string,
    provider: ethers.Provider,
    signer: ethers.Signer,
    request: RequestType
) {
    // Sign voting request
    const signature = await signer.signTypedData(
      {
        name: 'GaslessVoting',
        version: '1',
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract,
      },
      {
        VotingRequest: [
          { name: 'voter', type: 'address' },
          { name: 'dao', type: 'address' },
          { name: 'proposalId', type: 'bytes32' },
          { name: 'choiceId', type: 'uint256' },
        ],
      },
      request,
    );
    const rsv = ethers.Signature.from(signature);
    return rsv;
}