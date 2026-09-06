/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { uid, today } from './utils'

/* ----------------------------- Seed data ----------------------------- */

const MEMBRES = [
  ['Émile Ndongo', 'President', '+237 6 99 12 34 56', 'emile.ndongo@mail.cm'],
  ['Marie-Claire Abena', 'Tresorier', '+237 6 77 45 89 10', 'mc.abena@mail.cm'],
  ['Jean-Bosco Etoundi', 'Secretaire', '+237 6 55 23 78 44', 'jb.etoundi@mail.cm'],
  ['Solange Mballa', 'Commissaire', '+237 6 91 08 65 22', 's.mballa@mail.cm'],
  ['Paulin Nkoulou', 'Membre', '+237 6 78 34 12 90', 'p.nkoulou@mail.cm'],
  ['Aurélie Ngo Bassa', 'Membre', '+237 6 70 56 43 21', 'a.ngobassa@mail.cm'],
  ['Serge Ewane', 'Membre', '+237 6 99 87 65 43', 's.ewane@mail.cm'],
  ['Chantal Mogho', 'Membre', '+237 6 55 11 22 33', 'c.mogho@mail.cm'],
  ['Désiré Kamdem', 'Membre', '+237 6 77 88 99 00', 'd.kamdem@mail.cm'],
  ['Nadia Fotso', 'Membre', '+237 6 90 12 45 78', 'n.fotso@mail.cm'],
  ['Blaise Tchoumi', 'Membre', '+237 6 62 33 44 55', 'b.tchoumi@mail.cm'],
  ['Rosine Ekani', 'Membre', '+237 6 61 77 88 99', 'r.ekani@mail.cm'],
]

const STATUTS = ['Actif', 'Actif', 'Actif', 'Actif', 'Actif', 'Actif', 'Actif', 'Suspendu', 'Actif', 'Actif', 'Actif', 'Actif']

function seed() {
  const membres = MEMBRES.map(([nom, role, tel, email], i) => ({
    id: `m${i + 1}`, nom, role, tel, email,
    motDePasse: 'demo1234',
    twoFA: role === 'President',
    statut: STATUTS[i],
    profession: ['Commerçant', 'Infirmière', 'Enseignant', 'Comptable', 'Chauffeur', 'Couturière', 'Informaticien', 'Coiffeuse', 'Agriculteur', 'Boutiquière', 'Maçon', 'Restauratrice'][i],
    dateAdhesion: `2025-0${(i % 6) + 1}-1${i % 9}`,
    photo: null,
  }))
  const ids = membres.map(m => m.id)
  const cot = 25000

  // Ordre de passage (le président en dernier, rotatif)
  const ordrePassage = [...ids.slice(4), ...ids.slice(0, 4)]

  const cotisations = []
  const methodes = ['Espèces', 'Orange Money', 'MTN MoMo', 'Carte']
  ids.forEach((mid, i) => {
    const nPaiements = 4 + (i % 4)
    for (let k = 0; k < nPaiements; k++) {
      const d = new Date(2026, k + 1, 3 + i)
      cotisations.push({
        id: uid('cot'), membreId: mid, montant: cot, devise: 'XAF',
        date: d.toISOString().slice(0, 10), periode: `2026-0${k + 1}`,
        methode: methodes[(i + k) % 4], ref: `TG${2600 + i * 10 + k}`,
        statut: k === nPaiements - 1 && i % 4 === 0 ? 'En attente' : 'Validée',
      })
    }
  })

  const decaisses = ordrePassage.slice(0, 3).map((mid, i) => ({
    id: uid('mv'), type: 'Decaissement', sens: 'out', compte: 'Caisse',
    montant: 300000, devise: 'XAF', date: `2026-0${i + 1}-05`,
    note: `Tour de ${membres.find(m => m.id === mid).nom}`, membreId: mid,
  }))

  const mouvements = [
    ...cotisations.filter(c => c.statut === 'Validée').map(c => ({
      id: uid('mv'), type: 'Cotisation', sens: 'in',
      compte: c.methode === 'Espèces' ? 'Caisse' : c.methode === 'Orange Money' ? 'OM' : c.methode === 'MTN MoMo' ? 'MoMo' : 'Banque',
      montant: c.montant, devise: 'XAF', date: c.date, note: `Cotisation ${c.periode}`, membreId: c.membreId,
    })),
    ...decaisses,
    { id: uid('mv'), type: 'Versement banque', sens: 'out', compte: 'Caisse', montant: 1500000, devise: 'XAF', date: '2026-02-20', note: 'Dépôt BICEC — sécurité de la caisse' },
    { id: uid('mv'), type: 'Pret', sens: 'out', compte: 'Caisse', montant: 200000, devise: 'XAF', date: '2026-03-12', note: 'Prêt interne accordé', membreId: 'm9' },
  ]

  const penalites = [
    { id: uid('pen'), membreId: 'm8', montant: 2500, motif: 'Retard de cotisation (Juillet)', date: '2026-07-11', payee: false },
    { id: uid('pen'), membreId: 'm5', montant: 2500, motif: 'Absence non justifiée à la séance', date: '2026-06-14', payee: true },
    { id: uid('pen'), membreId: 'm11', montant: 2500, motif: 'Retard de cotisation (Août)', date: '2026-08-12', payee: false },
  ]

  const epargneIndividuelle = ids.map((mid, i) => ({
    membreId: mid, solde: [180000, 240000, 95000, 120000, 60000, 145000, 30000, 0, 110000, 88000, 42000, 130000][i],
    bloquee: [120000, 180000, 60000, 90000, 40000, 100000, 20000, 0, 80000, 60000, 30000, 90000][i],
    type: i % 3 === 0 ? 'Bloquée' : 'Volontaire',
    versements: [{ id: uid('v'), montant: 25000, date: '2026-07-02' }, { id: uid('v'), montant: 25000, date: '2026-08-03' }],
  }))

  const groupesEpargne = [
    { id: uid('gr'), nom: 'Groupe Femmes Debout', membres: ['m2', 'm6', 'm8', 'm10', 'm12'], solde: 620000, objectif: 1000000 },
    { id: uid('gr'), nom: 'Groupe Jeunes Bâtisseurs', membres: ['m5', 'm7', 'm9', 'm11'], solde: 380000, objectif: 800000 },
  ]

  const prets = [
    { id: uid('pr'), membreId: 'm9', montant: 200000, taux: 10, garants: ['m5', 'm7'], statut: 'En cours', dateDemande: '2026-03-01', motif: 'Réapprovisionnement boutique', reste: 140000, interet: 20000 },
    { id: uid('pr'), membreId: 'm6', montant: 150000, taux: 10, garants: ['m2', 'm10'], statut: 'Remboursé', dateDemande: '2025-11-15', motif: 'Frais de scolarité', reste: 0, interet: 15000 },
    { id: uid('pr'), membreId: 'm11', montant: 100000, taux: 10, garants: ['m7', 'm12'], statut: 'En attente', dateDemande: today(), motif: 'Soins familiaux', reste: 100000, interet: 10000 },
  ]

  const interetsRedistribues = [
    { id: uid('ir'), total: 15000, date: '2026-01-31', parts: ids.map(mid => ({ membreId: mid, montant: 1250 })) },
    { id: uid('ir'), total: 15000, date: '2026-02-28', parts: ids.map(mid => ({ membreId: mid, montant: 1250 })) },
  ]

  const aides = [
    { id: uid('ai'), membreId: 'm8', type: 'Naissance', montant: 100000, statut: 'Payée', date: '2026-05-20', motif: 'Naissance de jumeaux' },
    { id: uid('ai'), membreId: 'm12', type: 'Mariage', montant: 150000, statut: 'Validée', date: today(), motif: 'Mariage prévu le 26/09' },
    { id: uid('ai'), membreId: 'm5', type: 'Maladie', montant: 75000, statut: 'En attente', date: today(), motif: 'Hospitalisation urgent' },
  ]

  const encheres = [
    { id: uid('en'), membreId: ordrePassage[3], date: today(), statut: 'Ouverte', offres: [{ membreId: 'm9', montant: 315000 }, { membreId: 'm10', montant: 308000 }], gagnantId: null },
    { id: uid('en'), membreId: ordrePassage[1], date: '2026-04-02', statut: 'Clôturée', offres: [{ membreId: 'm6', montant: 312000 }], gagnantId: 'm6' },
  ]

  const seances = [
    { id: uid('se'), titre: 'Séance mensuelle d\'Août', date: '2026-08-30', lieu: 'Chez la Présidente — Odza', statut: 'Terminée', pv: 'Ordre du jour : lecture du rapport du trésorier, tour de M. Kamdem, divers. Le PV est adopté à l\'unanimité.', presences: Object.fromEntries(ids.map((id, i) => [id, i !== 7])) },
    { id: uid('se'), titre: 'Séance mensuelle de Septembre', date: '2026-09-27', lieu: 'Salle paroissielle St-Paul', statut: 'Planifiée', pv: null, presences: {} },
  ]

  const parrainages = ids.slice(4, 8).map((mid, i) => ({ id: uid('pa'), membreId: mid, parrainId: ids[i], date: `2025-0${i + 2}-10` }))

  const reclamations = [
    { id: uid('re'), membreId: 'm8', sujet: 'Erreur sur mon solde d\'épargne', detail: 'Le solde affiché ne correspond pas à mes versements d\'août.', statut: 'En cours', reponse: '', date: '2026-08-21' },
    { id: uid('re'), membreId: 'm11', sujet: 'Retard de décaissement du tour', detail: 'Mon tour était prévu le 2 et je n\'ai rien reçu.', statut: 'Ouverte', reponse: '', date: today() },
  ]

  const sanctions = [
    { id: uid('sa'), membreId: 'm8', type: 'Avertissement', motif: '3 retards consécutifs', date: '2026-07-30' },
    { id: uid('sa'), membreId: 'm7', type: 'Amende', motif: 'Perturbation de la séance', date: '2026-06-30' },
  ]

  const rapports = [
    { id: uid('ra'), periode: 'Août 2026', type: 'Financier', statut: 'Soumis', auteur: 'Marie-Claire Abena', date: '2026-08-31', resume: 'Encaissements 300 000 XAF, décaissements 300 000 XAF (tour), caisse saine. Aucun écart de rapprochement.' },
  ]

  const alertes = [
    { id: uid('al'), de: 'Solange Mballa', type: 'Anomalie', message: 'Le bordereau de dépôt du 20/02 n\'a pas de scan de reçu joint.', statut: 'Nouvelle', date: '2026-08-28' },
  ]

  const notifsMasse = [
    { id: uid('nm'), message: 'Rappel : la séance de septembre aura lieu le 27/09 à la salle paroissielle St-Paul.', canal: 'WhatsApp', date: '2026-09-01', cible: 'Tous les membres' },
  ]

  const audits = [
    { id: uid('au'), cible: 'Mouvement TG-2600 (Cotisation Août)', verdict: 'Conforme', note: 'Reçu joint et validé.', date: '2026-08-30', par: 'Solange Mballa' },
    { id: uid('au'), cible: 'Décaissement tour Février', verdict: 'Anomalie', note: 'Signature du bénéficiaire manquante sur le procès-verbal.', date: '2026-08-30', par: 'Solange Mballa' },
  ]

  const caisse = { XAF: { Caisse: 1250000, Banque: 4380000, OM: 340000, MoMo: 515000 }, EUR: { Caisse: 50000, Banque: 0 } }

  const notifications = ids.slice(0, 8).flatMap((mid, i) => ([
    { id: uid('nt'), pour: mid, titre: 'Cotisation reçue', message: 'Votre cotisation d\'août a été validée par le trésorier.', lu: i > 3, date: '2026-08-04T10:12:00' },
    { id: uid('nt'), pour: mid, titre: 'Rappel de séance', message: 'Prochaine séance le 27/09 — salle paroissielle St-Paul.', lu: false, date: '2026-09-01T08:00:00' },
  ]))

  return {
    version: 7,
    tontine: {
      nom: 'Club Solidarité', ville: 'Yaoundé — Cameroun',
      type: 'Rotative', montantCotisation: cot, frequence: 'Mensuelle',
      penaliteRetard: 2500, tauxPret: 10, tauxEnchereMin: 300000,
      statut: 'Active', dateDebut: '2026-01-05', banque: 'BICEC — RIB : 10005 00012 3405678901 — 76',
    },
    membres, ordrePassage, cotisations, mouvements, caisse, penalites,
    epargneIndividuelle, groupesEpargne, prets, interetsRedistribues,
    aides, encheres, seances, parrainages, reclamations, sanctions,
    rapports, alertes, notifsMasse, audits, notifications,
  }
}

/* ----------------------------- Contexts ----------------------------- */

const StoreCtx = createContext(null)
const AuthCtx = createContext(null)
const ToastCtx = createContext(null)

const DB_KEY = 'tg_db'
const SESSION_KEY = 'tg_session'

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => {
    try {
      const raw = localStorage.getItem(DB_KEY)
      if (raw) { const d = JSON.parse(raw); if (d.version === 7) return d }
    } catch { /* ignore */ }
    return seed()
  })
  useEffect(() => { try { localStorage.setItem(DB_KEY, JSON.stringify(db)) } catch { /* quota */ } }, [db])

  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem(SESSION_KEY); if (s) return JSON.parse(s) } catch { /* ignore */ }
    return null
  })
  useEffect(() => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    else localStorage.removeItem(SESSION_KEY)
  }, [user])

  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, tone = 'success') => {
    const id = uid('t')
    setToasts(t => [...t, { id, message, tone }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800)
  }, [])

  const login = useCallback((membreId) => {
    const m = db.membres.find(x => x.id === membreId)
    if (m) setUser({ id: m.id, nom: m.nom, role: m.role, twoFA: m.twoFA })
  }, [db.membres])

  const logout = useCallback(() => setUser(null), [])

  const updateMe = useCallback((patch) => {
    setDb(d => ({ ...d, membres: d.membres.map(m => m.id === user?.id ? { ...m, ...patch } : m) }))
    if (user) setUser(u => ({ ...u, ...patch }))
  }, [user])

  const store = useMemo(() => ({ db, setDb, toast, toasts }), [db, toast, toasts])
  const auth = useMemo(() => ({ user, login, logout, updateMe }), [user, login, logout, updateMe])

  return (
    <StoreCtx.Provider value={store}>
      <AuthCtx.Provider value={auth}>
        <ToastCtx.Provider value={toast}>
          {children}
          <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 no-print">
            {toasts.map(t => (
              <div key={t.id} className={`animate-scale-in rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl border max-w-xs flex items-start gap-2 ${
                t.tone === 'error' ? 'bg-red-600 text-white border-red-500'
                : t.tone === 'info' ? 'bg-brand-800 text-white border-brand-700'
                : 'bg-brand-600 text-white border-brand-500'}`}>
                <span className="mt-0.5">{t.tone === 'error' ? '⚠' : t.tone === 'info' ? 'ℹ' : '✓'}</span>
                <span>{t.message}</span>
              </div>
            ))}
          </div>
        </ToastCtx.Provider>
      </AuthCtx.Provider>
    </StoreCtx.Provider>
  )
}

export const useStore = () => useContext(StoreCtx)
export const useAuth = () => useContext(AuthCtx)
export const useToast = () => useContext(ToastCtx)

export const BUREAU_LABELS = {
  President: 'Président(e)', Tresorier: 'Trésorier(ère)', Secretaire: 'Secrétaire', Commissaire: 'Commissaire aux comptes', Membre: 'Membre',
}
