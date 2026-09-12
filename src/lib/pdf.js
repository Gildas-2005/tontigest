/* TontiGest — Exports PDF (jsPDF)
   Toutes les fonctions produisent un PDF A4 local (aucune requête réseau),
   avec en-tête club, pied de page, tableaux stylés. */
import { jsPDF } from 'jspdf'

const NAVY = [13, 27, 62]       // bleu nuit
const GOLD = [201, 162, 39]     // or
const INK = [17, 24, 39]
const GREY = [107, 114, 128]
const LIGHT = [241, 243, 248]
const LINE = [221, 225, 235]

const fmtXAF = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/\u202f/g, ' ')} FCFA`
export const fmtMontant = (n) => fmtXAF(n)

function dateFr(s) {
  if (!s) return '—'
  const d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s)
  return Number.isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('fr-FR')
}

/* ---------- Fabrication du document avec charte ---------- */

function makeDoc(titre) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({ title: titre, creator: 'TontiGest' })
  return doc
}

function header(doc, club, titre, sousTitre) {
  const W = doc.internal.pageSize.getWidth()
  // Bandeau bleu nuit
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 34, 'F')
  // Liseré or
  doc.setFillColor(...GOLD)
  doc.rect(0, 34, W, 1.2, 'F')
  // Bloc titres
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(String(club?.nom || 'TontiGest'), 14, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(200, 208, 226)
  const ville = club?.ville ? ` · ${club.ville}` : ''
  doc.text(`TontiGest — Gestion de tontine${ville}`, 14, 20)
  // Titre du document (droite)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text(titre, W - 14, 14, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(200, 208, 226)
  if (sousTitre) doc.text(sousTitre, W - 14, 20, { align: 'right' })
  doc.setTextColor(...INK)
  return 44 // y de départ du contenu
}

function footer(doc, mention) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.line(14, H - 16, W - 14, H - 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GREY)
    doc.text(mention || 'Document généré par TontiGest — logiciel local de gestion de tontine.', 14, H - 10)
    doc.text(`Page ${i}/${n}`, W - 14, H - 10, { align: 'right' })
  }
}

function ensureSpace(doc, y, needed) {
  const H = doc.internal.pageSize.getHeight()
  if (y + needed > H - 22) {
    doc.addPage()
    return 20
  }
  return y
}

/* ---------- Tableau générique ---------- */

export function table(doc, { y, columns, rows, title }) {
  const W = doc.internal.pageSize.getWidth()
  const usable = W - 28
  let cy = y
  if (title) {
    cy = ensureSpace(doc, cy, 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...NAVY)
    doc.text(title, 14, cy)
    cy += 6
  }
  // Largeurs proportionnelles (poids 1 par défaut)
  const weights = columns.map(c => c.width || 1)
  const total = weights.reduce((a, b) => a + b, 0)
  const widths = weights.map(w => (w / total) * usable)
  // En-tête
  cy = ensureSpace(doc, cy, 10)
  doc.setFillColor(...NAVY)
  doc.rect(14, cy - 4.5, usable, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  let x = 14
  columns.forEach((c, i) => {
    doc.text(String(c.label).toUpperCase(), x + 2.5, cy + 0.8, { maxWidth: widths[i] - 4 })
    x += widths[i]
  })
  cy += 8
  // Lignes zébrées
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  rows.forEach((row, ri) => {
    const rowH = 8
    cy = ensureSpace(doc, cy, rowH + 2)
    if (ri % 2 === 1) {
      doc.setFillColor(...LIGHT)
      doc.rect(14, cy - 4.5, usable, rowH, 'F')
    }
    doc.setDrawColor(...LINE)
    doc.line(14, cy + 3.5, W - 14, cy + 3.5)
    doc.setTextColor(...INK)
    x = 14
    columns.forEach((c, i) => {
      const val = c.render ? c.render(row) : row[c.key]
      doc.text(String(val ?? '—'), x + 2.5, cy + 0.5, { maxWidth: widths[i] - 4, align: c.align || 'left' })
      x += widths[i]
    })
    cy += rowH
  })
  return cy + 4
}

function kvBlock(doc, y, entries, perRow = 2) {
  // Petits blocs clé/valeur
  const W = doc.internal.pageSize.getWidth()
  const usable = W - 28
  const colW = usable / perRow
  let cy = y
  for (let i = 0; i < entries.length; i += perRow) {
    const slice = entries.slice(i, i + perRow)
    cy = ensureSpace(doc, cy, 12)
    slice.forEach(([k, v], j) => {
      const x = 14 + j * colW
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...GREY)
      doc.text(k.toUpperCase(), x, cy)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...INK)
      doc.text(String(v ?? '—'), x, cy + 5, { maxWidth: colW - 6 })
    })
    cy += 14
  }
  return cy
}

function save(doc, nomFichier) {
  doc.save(nomFichier)
}

/* ============================ Documents métier ============================ */

/* Reçu de cotisation (membre) */
export function pdfRecu({ club, cotisation, membre }) {
  const doc = makeDoc(`Reçu ${cotisation.ref}`)
  let y = header(doc, club, 'REÇU DE COTISATION', `Réf. ${cotisation.ref || '—'}`)
  y = kvBlock(doc, y, [
    ['Membre', membre?.nom || '—'],
    ['Période', cotisation.periode || '—'],
    ['Montant', fmtMontant(cotisation.montant)],
    ['Méthode de paiement', cotisation.methode || '—'],
    ['Date de paiement', dateFr(cotisation.date)],
    ['Statut', cotisation.statut || '—'],
  ])
  y += 6
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.6)
  doc.line(14, y, 90, y)
  doc.setLineWidth(0.2)
  y += 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('Ce reçu atteste du paiement de la cotisation ci-dessus auprès de la trésorerie du club.', 14, y)
  y += 6
  doc.text(`Signature du trésorier : ______________________`, 14, y + 14)
  footer(doc, `Reçu ${cotisation.ref} — ${club?.nom}`)
  save(doc, `recu-${(cotisation.ref || cotisation.id || '').replace(/[^a-zA-Z0-9-]/g, '')}.pdf`)
}

/* Liste des membres */
export function pdfMembres({ club, membres }) {
  const doc = makeDoc('Liste des membres')
  const y = header(doc, club, 'LISTE DES MEMBRES', `${membres.length} membre(s) — édité le ${new Date().toLocaleDateString('fr-FR')}`)
  table(doc, {
    y, title: null,
    columns: [
      { key: 'nom', label: 'Nom', width: 2.4 },
      { key: 'tel', label: 'Téléphone', width: 1.8 },
      { key: 'profession', label: 'Profession', width: 1.8 },
      { key: 'role', label: 'Rôle', width: 1.2 },
      { key: 'statut', label: 'Statut', width: 1 },
      { key: 'dateAdhesion', label: 'Adhésion', width: 1.1, render: r => dateFr(r.dateAdhesion) },
    ],
    rows: membres,
  })
  footer(doc, `Liste des membres — ${club?.nom}`)
  save(doc, 'liste-membres.pdf')
}

/* Feuille de présence d'une séance */
export function pdfPresences({ club, seance, membres, presences }) {
  const doc = makeDoc('Liste de présence')
  let y = header(doc, club, 'LISTE DE PRÉSENCE', seance?.titre || '')
  y = kvBlock(doc, y, [
    ['Séance', seance?.titre || '—'],
    ['Date', dateFr(seance?.date)],
    ['Lieu', seance?.lieu || '—'],
    ['Statut', seance?.statut || '—'],
  ])
  table(doc, {
    y,
    columns: [
      { key: 'nom', label: 'Membre', width: 3 },
      { key: 'present', label: 'Présence', width: 1.4, render: r => (presences?.[r.id] ? 'Présent' : 'Absent') },
      { key: 'sig', label: 'Signature', width: 2.6, render: () => '' },
    ],
    rows: membres,
  })
  footer(doc, `Liste de présence — ${seance?.titre || ''} — ${club?.nom}`)
  save(doc, `presence-${(seance?.date || '').replace(/[^0-9-]/g, '')}.pdf`)
}

/* Procès-verbal de séance */
export function pdfPV({ club, seance, presencesCount, total }) {
  const doc = makeDoc('Procès-verbal')
  let y = header(doc, club, 'PROCÈS-VERBAL DE SÉANCE', seance?.titre || '')
  y = kvBlock(doc, y, [
    ['Séance', seance?.titre || '—'],
    ['Date', dateFr(seance?.date)],
    ['Lieu', seance?.lieu || '—'],
    ['Présences', `${presencesCount ?? '—'} / ${total ?? '—'}`],
  ])
  y += 4
  // Corps du PV
  const lignes = String(seance?.pv || 'Procès-verbal non rédigé.').split('\n')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  for (const l of lignes) {
    const wrapped = doc.splitTextToSize(l || ' ', 182)
    for (const w of wrapped) {
      y = ensureSpace(doc, y, 8)
      doc.text(w, 14, y)
      y += 6
    }
  }
  y += 8
  y = ensureSpace(doc, y, 24)
  doc.text(`Fait à ${club?.ville || '—'}, le ${dateFr(seance?.date)}`, 14, y)
  doc.text('Le Secrétaire', 14, y + 16)
  doc.text('Le Président', 120, y + 16)
  doc.text('____________________', 14, y + 24)
  doc.text('____________________', 120, y + 24)
  footer(doc, `PV — ${seance?.titre || ''} — ${club?.nom}`)
  save(doc, `pv-${(seance?.date || '').replace(/[^0-9-]/g, '')}.pdf`)
}

/* Rapport financier (trésorier) */
export function pdfRapport({ club, periode, synthese, lignes, totalIn, totalOut }) {
  const doc = makeDoc('Rapport financier')
  let y = header(doc, club, 'RAPPORT FINANCIER', `Période : ${periode}`)
  y = kvBlock(doc, y, [
    ['Période', periode],
    ['Total encaissé', fmtMontant(totalIn)],
    ['Total décaissé', fmtMontant(totalOut)],
    ['Solde de période', fmtMontant(totalIn - totalOut)],
  ])
  if (synthese) {
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK)
    for (const l of doc.splitTextToSize(synthese, 182)) { y = ensureSpace(doc, y, 8); doc.text(l, 14, y); y += 6 }
  }
  y += 2
  table(doc, {
    y, title: 'Mouvements de la période',
    columns: [
      { key: 'date', label: 'Date', width: 1, render: r => dateFr(r.date) },
      { key: 'type', label: 'Type', width: 1.4 },
      { key: 'note', label: 'Libellé', width: 2.8, render: r => (r.note || r.type || '—').slice(0, 60) },
      { key: 'compte', label: 'Compte', width: 1 },
      { key: 'montant', label: 'Montant', width: 1.3, align: 'right', render: r => (r.sens === 'out' ? '−' : '+') + ' ' + fmtMontant(r.montant, r.devise) },
    ],
    rows: lignes,
  })
  footer(doc, `Rapport financier ${periode} — ${club?.nom}`)
  save(doc, `rapport-financier-${String(periode).replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`)
}

/* Rapport d'audit (commissaire) */
export function pdfRapportAudit({ club, audit, verdicts }) {
  const doc = makeDoc("Rapport d'audit")
  let y = header(doc, club, "RAPPORT D'AUDIT", audit?.cible || '')
  y = kvBlock(doc, y, [
    ['Cible auditée', audit?.cible || '—'],
    ['Auditeur', audit?.par || '—'],
    ['Date', dateFr(audit?.date)],
    ['Verdict', audit?.verdict || '—'],
  ])
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  const lignes = doc.splitTextToSize(audit?.note || '', 182)
  for (const l of lignes) { y = ensureSpace(doc, y, 8); doc.text(l, 14, y); y += 6 }
  if (verdicts?.length) {
    table(doc, {
      y, title: 'Détail des contrôles',
      columns: [
        { key: 'libelle', label: 'Contrôle', width: 3 },
        { key: 'resultat', label: 'Résultat', width: 1.4 },
      ],
      rows: verdicts,
    })
  }
  footer(doc, `Rapport d'audit — ${club?.nom}`)
  save(doc, `audit-${(audit?.cible || '').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 40).toLowerCase()}.pdf`)
}

/* Bordereau d'opération bancaire (trésorier) */
export function pdfBordereau({ club, operation }) {
  const doc = makeDoc('Bordereau bancaire')
  let y = header(doc, club, 'BORDEREAU D\'OPÉRATION BANCAIRE', operation?.banque || '')
  y = kvBlock(doc, y, [
    ['Type d\'opération', operation?.type || '—'],
    ['Date', dateFr(operation?.date)],
    ['Compte concerné', operation?.compte || '—'],
    ['Montant', fmtMontant(operation?.montant)],
    ['Banque', operation?.banque || club?.banque || '—'],
    ['Référence', operation?.ref || '—'],
  ])
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('Pièce à conserver et à joindre au rapprochement bancaire mensuel.', 14, y)
  y += 18
  doc.text('Signature du trésorier : ______________________', 14, y)
  footer(doc, `Bordereau ${operation?.ref || ''} — ${club?.nom}`)
  save(doc, `bordereau-${(operation?.ref || operation?.id || '').replace(/[^a-zA-Z0-9-]/g, '')}.pdf`)
}

/* Bordereau de versement d'épargne */
export function pdfVersement({ club, membre, versement, soldeApres }) {
  const doc = makeDoc('Versement épargne')
  let y = header(doc, club, 'BORDEREAU DE VERSEMENT D\'ÉPARGNE', membre?.nom || '')
  y = kvBlock(doc, y, [
    ['Membre', membre?.nom || '—'],
    ['Date', dateFr(versement?.date)],
    ['Montant versé', fmtMontant(versement?.montant)],
    ['Solde après versement', fmtMontant(soldeApres)],
  ])
  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('Document à conserver comme preuve du versement volontaire d\'épargne.', 14, y)
  y += 18
  doc.text('Signature du trésorier : ______________________', 14, y)
  footer(doc, `Versement épargne — ${club?.nom}`)
  save(doc, `versement-epargne-${(membre?.nom || '').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`)
}

/* Archive générique multi-sections (séances, PV, rapports…) */
export function pdfArchive({ club, titre, sections }) {
  // sections : [{ title, columns, rows }]
  const doc = makeDoc(titre)
  let y = header(doc, club, titre.toUpperCase(), `Édité le ${new Date().toLocaleDateString('fr-FR')}`)
  for (const s of sections) {
    y = table(doc, { y, title: s.title, columns: s.columns, rows: s.rows })
  }
  footer(doc, `${titre} — ${club?.nom}`)
  save(doc, `${titre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}

/* Fiche membre complète (audit commissaire : vue par membre) */
export function pdfFicheMembre({ club, membre, sections }) {
  const doc = makeDoc(`Fiche ${membre?.nom}`)
  let y = header(doc, club, 'FICHE MEMBRE — AUDIT', membre?.nom || '')
  y = kvBlock(doc, y, [
    ['Nom', membre?.nom || '—'],
    ['Téléphone', membre?.tel || '—'],
    ['Rôle', membre?.role || '—'],
    ['Statut', membre?.statut || '—'],
    ['Profession', membre?.profession || '—'],
    ['Adhésion', dateFr(membre?.dateAdhesion)],
  ])
  y += 4
  for (const s of sections) {
    y = table(doc, { y, title: s.title, columns: s.columns, rows: s.rows })
  }
  footer(doc, `Fiche membre — ${club?.nom}`)
  save(doc, `fiche-${(membre?.nom || 'membre').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`)
}
