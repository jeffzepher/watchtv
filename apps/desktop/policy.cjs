exports.allowedNavigation = (target, origin) => {
  try { return new URL(target).origin === origin; } catch { return false; }
};
exports.windowOptions = { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true };
