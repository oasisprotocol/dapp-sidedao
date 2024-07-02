// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.0;

import { IPollManagerACL } from "./IPollManagerACL.sol";
import { IPollACL } from "./IPollACL.sol";

interface IPollManager {
    function proxy(address voter, bytes32 proposalId, uint8 choiceId, bytes calldata in_data) external;

    function getACL() external view returns (IPollManagerACL);

    function getPollACL(bytes32 proposalId) external view returns (IPollACL);

    function canVoteOnPoll(bytes32 in_proposalId, address in_voter, bytes calldata in_data) external view returns (uint out_weight);
}
