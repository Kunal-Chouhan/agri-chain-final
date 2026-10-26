const { keccak256, toUtf8Bytes } = require("ethers");

// Sort keys so the same record always produces the same string
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((acc, k) => {
      if (value[k] !== undefined) acc[k] = canonicalize(value[k]);
      return acc;
    }, {});
  }
  return value;
}

exports.hashRecord = (record) => keccak256(toUtf8Bytes(JSON.stringify(canonicalize(record))));