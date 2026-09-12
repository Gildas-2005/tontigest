import { useState } from 'react'
import { useStore, useAuth, BUREAU_LABELS } from '../lib/store'
import { PageHeader, Card, Button, Input, Field, Avatar, Badge, Modal } from '../components/ui'
import { Camera, KeyRound, LockOpen, Smartphone } from '../components/icons'
import { fmtDate, runValidators, vRequired, vEmail, vTel, vMinLen } from '../lib/utils'

export function ProfilPage() {
  const { db, toast } = useStore()
  const { user, updateMe, changePassword } = useAuth()
  const me = db.membres.find(m => m.id === user.id) || { nom: user.nom || '', role: user.role || 'Membre', tel: '', email: user.email || '', statut: 'Actif', dateAdhesion: '', twoFA: !!user.twoFA, photo: null }
  const [form, setForm] = useState({ nom: me.nom, tel: me.tel, email: me.email, profession: me.profession })
  const [errors, setErrors] = useState({})
  const [pw, setPw] = useState({ old: '', n1: '', n2: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwOpen, setPwOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [code, setCode] = useState('')
  const [smsCode, setSmsCode] = useState('')

  const saveProfile = async () => {
    const errs = runValidators(form, {
      nom: [vRequired('Le nom complet est obligatoire.'), vMinLen(4, 'Le nom doit faire au moins 4 caractères.')],
      tel: [vTel()],
      email: [vEmail()],
    })
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés avant d\'enregistrer', 'error')
    await updateMe(form)
    toast('Profil mis à jour avec succès')
  }
  const changePwd = async () => {
    const errs = runValidators(pw, {
      old: [vRequired('Saisissez votre mot de passe actuel.')],
      n1: [vRequired('Le nouveau mot de passe est obligatoire.'), vMinLen(8, '8 caractères minimum pour le nouveau mot de passe.')],
      n2: [v => (v !== pw.n1) ? 'Les mots de passe ne correspondent pas.' : ''],
    })
    setPwErrors(errs)
    if (Object.values(errs).some(Boolean)) return toast('Corrigez les champs signalés', 'error')
    const { error } = await changePassword(pw.old, pw.n1)
    if (error) return toast(error, 'error')
    setPwOpen(false); setPw({ old: '', n1: '', n2: '' }); setPwErrors({})
    toast('Mot de passe modifié avec succès')
  }
  const toggle2FA = async () => {
    if (me.twoFA) { await updateMe({ twoFA: false }); toast('2FA désactivée', 'info') }
    else {
      const c = String(Math.floor(100000 + Math.random() * 900000))
      setSmsCode(c); setCode(''); setCodeOpen(true)
    }
  }
  const confirm2FA = async () => {
    if (code !== smsCode) return toast('Code invalide — vérifiez le code affiché', 'error')
    await updateMe({ twoFA: true }); setCodeOpen(false); toast('Double authentification activée')
  }

  return (
    <div>
      <PageHeader title="Mon profil" sub="Gérez vos informations personnelles, votre mot de passe et la sécurité de votre compte." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr] stagger">
        {/* Identity card */}
        <Card className="h-fit">
          <div className="flex flex-col items-center py-4 text-center">
            <div className="relative">
              <Avatar name={me.nom} size="xl" ring={me.role === 'President'} />
              <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-brand-600 text-white shadow-lg transition hover:scale-110" title="Changer la photo">
                <Camera size={15} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return
                  const r = new FileReader()
                  r.onload = () => { updateMe({ photo: r.result }); toast('Photo de profil mise à jour') }
                  r.readAsDataURL(f)
                }} />
              </label>
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold">{me.nom}</h3>
            <Badge tone="gold" className="mt-2">{BUREAU_LABELS[me.role]}</Badge>
            <div className="mt-4 w-full space-y-1.5 text-left text-xs text-ink/55">
              <p className="flex justify-between border-b border-black/5 py-1.5"><span>Membre depuis</span><b className="text-ink">{fmtDate(me.dateAdhesion)}</b></p>
              <p className="flex justify-between border-b border-black/5 py-1.5"><span>Statut</span><Badge tone={me.statut === 'Actif' ? 'green' : 'amber'}>{me.statut}</Badge></p>
              <p className="flex justify-between py-1.5"><span>2FA</span><Badge tone={me.twoFA ? 'green' : 'gray'}>{me.twoFA ? 'Activée (SMS)' : 'Désactivée'}</Badge></p>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Informations personnelles" subtitle="Nom, contacts et profession" actions={<Button size="sm" onClick={saveProfile}>Enregistrer</Button>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nom complet" required error={errors.nom}><Input value={form.nom} error={errors.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></Field>
              <Field label="Profession"><Input value={form.profession || ''} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} /></Field>
              <Field label="Téléphone (OM / MoMo)" required error={errors.tel}><Input value={form.tel} error={errors.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} placeholder="+237 6 55 00 11 22" /></Field>
              <Field label="E-mail" error={errors.email}><Input type="email" value={form.email} error={errors.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vous@exemple.cm" /></Field>
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card title="Mot de passe" subtitle="Dernière bonne pratique : 8 caractères min.">
              <p className="mb-4 text-xs text-ink/50">Modifiez régulièrement votre mot de passe pour sécuriser l'accès à {db.tontine.nom}.</p>
              <Button variant="outline" onClick={() => setPwOpen(true)} icon={<KeyRound size={16} />}>Modifier le mot de passe</Button>
            </Card>
            <Card title="Double authentification" subtitle="2FA par SMS à chaque connexion">
              <p className="mb-4 text-xs text-ink/50">{me.twoFA ? 'Votre compte est protégé par un code SMS.' : 'Renforcez la sécurité de votre compte en activant le code SMS.'}</p>
              <Button variant={me.twoFA ? 'danger' : 'gold'} onClick={toggle2FA} icon={me.twoFA ? <LockOpen size={16} /> : <Smartphone size={16} />}>
                {me.twoFA ? 'Désactiver la 2FA' : 'Activer la 2FA'}
              </Button>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Modifier le mot de passe" footer={<><Button variant="ghost" onClick={() => setPwOpen(false)}>Annuler</Button><Button onClick={changePwd}>Valider</Button></>}>
        <div className="space-y-4">
          <Field label="Mot de passe actuel" required error={pwErrors.old}><Input type="password" error={pwErrors.old} value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} /></Field>
          <Field label="Nouveau mot de passe" required error={pwErrors.n1} hint="8 caractères minimum"><Input type="password" error={pwErrors.n1} value={pw.n1} onChange={e => setPw(p => ({ ...p, n1: e.target.value }))} /></Field>
          <Field label="Confirmer le nouveau mot de passe" required error={pwErrors.n2}><Input type="password" error={pwErrors.n2} value={pw.n2} onChange={e => setPw(p => ({ ...p, n2: e.target.value }))} /></Field>
        </div>
      </Modal>

      <Modal open={codeOpen} onClose={() => setCodeOpen(false)} title="Activation 2FA — vérification SMS"
        subtitle={`Un code à 6 chiffres a été envoyé au ${me.tel || 'numéro du compte'}${me.tel ? '' : ' (passerelle SMS non connectée — code de test ci-dessous)'}`}
        footer={<><Button variant="ghost" onClick={() => setCodeOpen(false)}>Annuler</Button><Button onClick={confirm2FA}>Confirmer</Button></>}>
        <Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="—— —— ——" className="text-center text-2xl font-bold tracking-[.5em]" autoFocus />
        {smsCode && <p className="mt-3 rounded-xl bg-gold-50 px-4 py-2.5 text-center text-xs font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">Passerelle SMS non connectée — code de vérification : <b className="tracking-widest">{smsCode}</b></p>}
      </Modal>
    </div>
  )
}
