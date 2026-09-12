/* Messagerie interne — conversations et messages entre membres du club.
   Données serveur (tables conversations / conversation_participants / messages),
   relayées par email si Mailjet est configuré. */

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal } from '../components/ui'
import { MessageSquare, Send, UsersRound, ArrowLeft, Search } from 'lucide-react'
import { cls } from '../lib/utils'

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function MessageriePage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [contacts, setContacts] = useState([])
  const [active, setActive] = useState(null) // { conversation, messages }
  const [newOpen, setNewOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: cs } = await api.conversations()
      setConversations(cs)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  /* Chargement initial différé : setState dans un effect synchrone interdit
     par la règle react-hooks — on passe par un microtask. */
  useEffect(() => {
    const t = setTimeout(loadConversations, 0)
    return () => clearTimeout(t)
  }, [loadConversations])

  /* Rafraîchir la liste + conversation ouverte périodiquement (messages entrants). */
  useEffect(() => {
    const t = setInterval(async () => {
      await loadConversations()
      if (active) {
        try {
          const r = await api.conversationMessages(active.conversation.id)
          setActive(r)
        } catch { /* conversation supprimée */ }
      }
    }, 10000)
    return () => clearInterval(t)
  }, [active, loadConversations])
  const openConversation = async (conv) => {
    try {
      const r = await api.conversationMessages(conv.id)
      setActive(r)
      setConversations((cs) => cs.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)))
    } catch (e) {
      setError(e.message)
    }
  }

  const send = async () => {
    const body = draft.trim()
    if (!body || !active) return
    setSending(true)
    try {
      await api.sendMessage(active.conversation.id, body)
      const r = await api.conversationMessages(active.conversation.id)
      setActive(r)
      setDraft('')
      loadConversations()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages?.length])

  /* ---- Vue conversation ouverte ---- */
  if (active) {
    const other = active.conversation
    return (
      <div className="mx-auto max-w-3xl">
        <Card pad={false}>
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
            <button onClick={() => setActive(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-black/5 text-ink/60 transition hover:bg-black/10 cursor-pointer" aria-label="Retour"><ArrowLeft size={17} /></button>
            <Avatar name={other.sujet || other.created_by || '?'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-ink">{other.sujet || 'Conversation'}</p>
              <p className="text-[11px] text-ink/45">{active.messages.length} message(s)</p>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto bg-cream/40 px-4 py-4">
            {active.messages.length === 0 && (
              <p className="py-10 text-center text-sm text-ink/40">Aucun message — engagez la conversation !</p>
            )}
            {active.messages.map((m) => {
              const mine = m.sender_id === user.id
              return (
                <div key={m.id} className={cls('mb-3 flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cls('max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm', mine ? 'bg-brand-600 text-white' : 'bg-white text-ink border border-black/5')}>
                    {!mine && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-600">{m.sender_name || 'Membre'}</p>}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                    <p className={cls('mt-1 text-right text-[10px]', mine ? 'text-white/70' : 'text-ink/40')}>{fmtDate(m.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-end gap-2 border-t border-black/5 p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              placeholder="Écrivez votre message… (Entrée pour envoyer)"
              className="max-h-32 min-h-[44px] flex-1 resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 focus:ring-brand-100"
            />
            <Button onClick={send} disabled={!draft.trim() || sending} icon={<Send size={16} />}>{sending ? '…' : 'Envoyer'}</Button>
          </div>
        </Card>
      </div>
    )
  }

  /* ---- Vue liste des conversations ---- */
  const filtered = conversations.filter((c) => {
    if (!search) return true
    return String(c.sujet || '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Messagerie</h1>
          <p className="mt-0.5 text-sm text-ink/55">Discutez avec les membres de votre association — les messages sont relayés par email si l'expédition est activée.</p>
        </div>
        <Button variant="gold" icon={<MessageSquare size={16} />} onClick={async () => {
          try {
            const { contacts: cs } = await api.contacts()
            setContacts(cs)
          } catch (e) { setError(e.message) }
          setNewOpen(true)
        }}>Nouvelle conversation</Button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <Card pad={false}>
        <div className="border-b border-black/5 px-4 py-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une conversation…" className="pl-9" />
          </div>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-ink/40">Chargement…</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<MessageSquare size={28} />} title="Aucune conversation"
            sub="Démarrez une discussion avec un membre de votre association." />
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((c) => (
              <li key={c.id}>
                <button onClick={() => openConversation(c)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-brand-50/50 cursor-pointer">
                  <Avatar name={c.sujet || 'Discussion'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{c.sujet || 'Conversation directe'}</p>
                    <p className="mt-0.5 truncate text-xs text-ink/45">
                      {c.message_count} message(s) — dernière activité {fmtDate(c.updated_at)}
                    </p>
                  </div>
                  {Number(c.unread) > 0 && (
                    <Badge tone="red" dot>{c.unread} non lu(s)</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} contacts={contacts} onOpen={async (contactId) => {
        try {
          const { conversationId } = await api.openConversation(contactId)
          const r = await api.conversationMessages(conversationId)
          setActive(r)
          setNewOpen(false)
          loadConversations()
        } catch (e) { setError(e.message) }
      }} />
    </div>
  )
}

/* Modal de sélection d'un membre du club pour ouvrir une conversation directe. */
function NewConversationModal({ open, onClose, contacts, onOpen }) {
  const [search, setSearch] = useState('')
  const filtered = contacts.filter((c) =>
    !search || `${c.nom} ${c.email}`.toLowerCase().includes(search.toLowerCase()))
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle conversation" subtitle="Choisissez un membre de votre association">
      <div className="space-y-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un membre…" icon={<Search size={15} />} />
        {contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/45">Aucun autre membre actif dans votre association pour le moment.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.id}>
                <button onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-brand-50 cursor-pointer">
                  <Avatar name={c.nom} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{c.nom || c.email}</p>
                    <p className="text-[11px] text-ink/45">{c.role}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="flex items-center gap-1.5 text-[11px] text-ink/40"><UsersRound size={13} /> {contacts.length} membre(s) joignable(s)</p>
      </div>
    </Modal>
  )
}
