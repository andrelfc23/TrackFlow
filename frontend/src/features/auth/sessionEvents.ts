// Shared notification: music state must be cleared after logout.
export const LOGOUT_EVENT = 'trackflow-logout'
export function notifyLogout() { window.dispatchEvent(new Event(LOGOUT_EVENT)) }
