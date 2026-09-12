import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from './config.js'
import { q } from './db.js'

export const hashPassword = (plain) => bcrypt.hash(plain, 10)
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash)

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, super: !!user.is_superadmin }, config.jwtSecret, {
    expiresIn: config.jwtExpires,
  })

export function publicUser(u) {
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    nom: u.nom,
    telephone: u.telephone,
    photo: u.photo || null,
    role: u.role,
    club_id: u.club_id,
    statut: u.statut || 'Actif',
    two_fa: !!u.two_fa,
    onboarding_done: !!u.onboarding_done,
    is_superadmin: !!u.is_superadmin,
  }
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Authentification requise.' })
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    const [rows] = await q('SELECT * FROM users WHERE id = ?', [payload.sub])
    if (!rows.length) return res.status(401).json({ error: 'Compte introuvable.' })
    if (rows[0].statut === 'Suspendu' && !rows[0].is_superadmin) {
      return res.status(403).json({ error: 'Votre compte a été suspendu par l\'administrateur de la plateforme.' })
    }
    req.user = rows[0]
    next()
  } catch {
    return res.status(401).json({ error: 'Session expirée — reconnectez-vous.' })
  }
}

export function requireSuper(req, res, next) {
  if (!req.user?.is_superadmin) return res.status(403).json({ error: 'Accès réservé au superadministrateur.' })
  next()
}

export const genCode = () => String(Math.floor(100000 + Math.random() * 900000))
