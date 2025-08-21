const { customAlphabet } = require("nanoid");
const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8); // no 0/O/1/I

module.exports = function buildUniqueId() {
  const year = new Date().getFullYear();
  return `YUKTI-${year}-${nano()}`; // e.g., YUKTI-2025-7FK3Z2QX
};
