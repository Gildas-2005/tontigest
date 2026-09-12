/* Notifications in-app : ajoute une notification à un membre (ou à tout le bureau). */
import { uid, now } from './utils'

/* Notifier un membre précis. */
export function notifyMember(d, membreId, titre, message) {
  return [...d.notifications, { id: uid('nt'), pour: membreId, titre, message, lu: false, date: now() }]
}

/* Notifier plusieurs membres (ex : tout le bureau, tous les membres actifs). */
export function notifyMembers(d, membreIds, titre, message) {
  const existing = d.notifications || []
  return [...existing, ...membreIds.map(id => ({ id: uid('nt'), pour: id, titre, message, lu: false, date: now() }))]
}
