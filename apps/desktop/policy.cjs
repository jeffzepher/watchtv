exports.allowedNavigation = (target, origin) => {
  try { return new URL(target).origin === origin; } catch { return false; }
};
exports.windowOptions = { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true };
exports.prepareDesktopSession = async (session) => {
  // Desktop assets are bundled locally; an old service worker must not intercept startup.
  // Keep IndexedDB, localStorage and cookies (watch history, favorites and sources).
  await session.clearStorageData({storages:['serviceworkers','cachestorage']});
  await session.clearCache();
};
