export function getContextUserEntryIds(sessionManager) {
  const entries = typeof sessionManager?.getBranch === "function"
    ? sessionManager.getBranch()
    : typeof sessionManager?.buildContextEntries === "function"
      ? sessionManager.buildContextEntries()
      : [];

  return entries
    .filter((entry) => entry?.type === "message" && entry.message?.role === "user")
    .map((entry) => entry.id);
}
