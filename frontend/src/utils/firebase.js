// Legacy re-export — Firebase removed; all storage is local SQLite.
export {
  saveMessage,
  saveSessionMeta,
  listSessions,
  loadSession,
  saveProfile,
  loadProfile,
  refreshSearchIndex,
  searchSessions,
  ensureDbReady,
  getDbEnabled,
  localDbEnabled as firebaseEnabled,
} from './chatStorage'
