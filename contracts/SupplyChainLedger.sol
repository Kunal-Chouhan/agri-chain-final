// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SupplyChainLedger
/// @notice Stores tamper-evident anchors (hashes) of supply-chain events.
///         Full records stay in MongoDB; only the hash chain goes on-chain.
contract SupplyChainLedger {
    address public owner;

    struct Anchor {
        bytes32 dataHash;
        bytes32 prevHash;
        uint256 timestamp;
    }

    mapping(string => Anchor[]) private anchors;

    event EventAnchored(string indexed batchIdIndexed, string batchId, uint256 index, bytes32 dataHash, bytes32 prevHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchor(string calldata batchId, bytes32 dataHash, bytes32 prevHash) external onlyOwner {
        uint256 n = anchors[batchId].length;
        if (n > 0) {
            require(anchors[batchId][n - 1].dataHash == prevHash, "Broken chain");
        } else {
            require(prevHash == bytes32(0), "First anchor must have empty prevHash");
        }
        anchors[batchId].push(Anchor(dataHash, prevHash, block.timestamp));
        emit EventAnchored(batchId, batchId, n, dataHash, prevHash);
    }

    function anchorCount(string calldata batchId) external view returns (uint256) {
        return anchors[batchId].length;
    }

    function getAnchor(string calldata batchId, uint256 index) external view returns (bytes32, bytes32, uint256) {
        Anchor storage a = anchors[batchId][index];
        return (a.dataHash, a.prevHash, a.timestamp);
    }
}
