export const getRoomId = (user1, user2) => {
  // Sort them so "A chatting with B" is the same Room ID as "B chatting with A"
  const sortedIds = [user1, user2].sort();
  return sortedIds.join("_");
};
