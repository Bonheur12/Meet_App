export const generateMeetingCode = () => {
  // Simple human-readable meeting code.
  const alphaNum = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => alphaNum[Math.floor(Math.random() * alphaNum.length)]).join("");

  return `${block()}-${block()}-${block()}`;
};
