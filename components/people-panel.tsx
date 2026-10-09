"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, BriefcaseBusiness, Cake, CalendarDays, Columns3, Heart, LayoutGrid, MessageCircle, Plus, Search, Trash2, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { personSchema, relationships, type Person, type Workspace } from "@/lib/workspace";
import { Portrait } from "@/components/portrait";
import { ageFromBirthday, displayDate, Field, inputClass, lastContactLabel, navigateTabs, PanelBack, PanelEmpty, primaryClass, quietClass, todayString, type WorkspaceChange } from "@/components/personal-panel-ui";

type Props = { workspace: Workspace; onChange: WorkspaceChange };
type View = "Galeria" | "Vínculos" | "Aniversários";
const reminderLabels = { none: "Desativado", day: "No dia", "three-days": "3 dias antes", week: "1 semana antes" };
const tabIcons = { Galeria: LayoutGrid, Vínculos: Columns3, Aniversários: CalendarDays };

function freshPerson(): Person {
  return { id: crypto.randomUUID(), name: "", relationship: "Amigo", portrait: null, birthday: "", nextMeeting: "", birthdayReminder: "none", interests: [], notes: "", contacts: [], presents: [] };
}

function relationshipClass(value: Person["relationship"]) {
  if (value === "Parceiro" || value === "Parceira") return "bg-[#F5E5ED] text-[#AD5C82]";
  if (value === "Família") return "bg-[#FAEFD9] text-[#B57B2C]";
  if (value === "Trabalho") return "bg-[#E9EDFA] text-[#6572B8]";
  return "bg-[#E7EFE9] text-[#4E826B]";
}

function RelationshipBadge({ value }: { value: Person["relationship"] }) {
  return <span className={`inline-flex rounded-[3px] px-2 py-1 text-xs ${relationshipClass(value)}`}>{value}</span>;
}

function RelationshipIcon({ value }: { value: Person["relationship"] }) {
  const Icon = value === "Família" ? UsersRound : value === "Trabalho" ? BriefcaseBusiness : value === "Estudos" ? BookOpen : value === "Parceiro" || value === "Parceira" ? Heart : UserRound;
  return <Icon size={14} />;
}

function PersonCard({ person, onOpen }: { person: Person; onOpen: () => void }) {
  const age = ageFromBirthday(person.birthday);
  const contact = person.contacts.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return <button type="button" onClick={onOpen} className="min-w-0 overflow-hidden rounded-[4px] border border-[var(--orbit-line,#E9E8E5)] bg-white text-left transition-colors hover:border-[#D3D2CE] focus-visible:outline-2 focus-visible:outline-[var(--orbit-accent,#2383E2)]">
    <Portrait index={person.portrait} />
    <div className="flex min-w-0 flex-col gap-2 border-t border-[var(--orbit-line,#E9E8E5)] px-3 py-4 sm:px-4">
      <div className="flex items-center gap-2 font-semibold"><UserRound size={14} className="hidden shrink-0 text-[var(--orbit-muted,#787774)] sm:block" /><span className="truncate text-sm">{person.name}</span></div>
      {age !== null ? <span className="text-xs text-[var(--orbit-muted,#787774)]">{age} anos</span> : null}
      <div className="flex items-center gap-2 text-[var(--orbit-muted,#787774)]"><span className="hidden sm:inline"><RelationshipIcon value={person.relationship} /></span><RelationshipBadge value={person.relationship} /></div>
      <div className="hidden items-center gap-2 text-xs text-[var(--orbit-muted,#787774)] sm:flex"><Cake size={14} className="shrink-0" /><span>{displayDate(person.birthday)}</span></div>
      <div className="hidden items-center gap-2 text-xs text-[var(--orbit-muted,#787774)] sm:flex"><MessageCircle size={14} className="shrink-0" /><span>{lastContactLabel(contact?.date)}</span></div>
      {person.notes ? <p className="hidden truncate text-xs text-[var(--orbit-muted,#787774)] sm:block">{person.notes}</p> : null}
    </div>
  </button>;
}

function PersonForm({ person, existing, onSave, onCancel, onDelete }: { person: Person; existing: boolean; onSave: (person: Person) => void; onCancel: () => void; onDelete: () => void }) {
  const [draft, setDraft] = useState(person);
  const [interests, setInterests] = useState(person.interests.join(", "));
  const [choosePortrait, setChoosePortrait] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const patch = (change: Partial<Person>) => setDraft(current => ({ ...current, ...change }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = personSchema.safeParse({ ...draft, interests: [...new Set(interests.split(",").map(item => item.trim()).filter(Boolean))] });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira os campos."); return; }
    onSave(parsed.data);
  };
  return <form onSubmit={submit} className="flex flex-col gap-5">
    <div className="flex items-center gap-4 border-t border-[var(--orbit-line,#E9E8E5)] pt-5"><Portrait index={draft.portrait} small /><div className="flex flex-col gap-1"><p className="text-xs text-[var(--orbit-muted,#787774)]">Retrato ilustrado</p><Button type="button" variant="outline" className={quietClass} onClick={() => setChoosePortrait(value => !value)}>Escolher retrato</Button></div></div>
    {choosePortrait ? <div className="grid grid-cols-4 gap-2 rounded-[4px] border border-[var(--orbit-line,#E9E8E5)] p-2"><button type="button" aria-label="Sem retrato" aria-pressed={draft.portrait === null} onClick={() => { patch({ portrait: null }); setChoosePortrait(false); }} className="flex min-h-16 items-center justify-center rounded border border-[var(--orbit-line,#E9E8E5)] text-[var(--orbit-muted,#787774)]"><UserRound size={24} /></button>{Array.from({ length: 12 }, (_, index) => <button type="button" key={index} aria-label={`Selecionar retrato ${index + 1}`} aria-pressed={draft.portrait === index} className={`flex min-h-16 justify-center rounded border ${draft.portrait === index ? "border-[var(--orbit-accent,#2383E2)]" : "border-[var(--orbit-line,#E9E8E5)]"}`} onClick={() => { patch({ portrait: index }); setChoosePortrait(false); }}><Portrait index={index} small /></button>)}</div> : null}
    <Field label="Nome"><input required maxLength={200} autoFocus className={inputClass} value={draft.name} onChange={event => patch({ name: event.target.value })} placeholder="Preencher…" /></Field>
    <Field label="Vínculo"><select className={inputClass} value={draft.relationship} onChange={event => patch({ relationship: event.target.value as Person["relationship"] })}>{relationships.map(value => <option key={value}>{value}</option>)}</select></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Aniversário"><input className={inputClass} type="date" max={todayString()} value={draft.birthday} onChange={event => patch({ birthday: event.target.value })} /></Field><Field label="Próximo encontro"><input className={inputClass} type="date" value={draft.nextMeeting} onChange={event => patch({ nextMeeting: event.target.value })} /></Field></div>
    <Field label="Lembrete de aniversário"><select className={inputClass} value={draft.birthdayReminder} onChange={event => patch({ birthdayReminder: event.target.value as Person["birthdayReminder"] })}>{Object.entries(reminderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
    {draft.birthdayReminder !== "none" ? <p className="-mt-3 text-xs leading-5 text-[var(--orbit-muted,#787774)]">O lembrete aparece na visualização Aniversários enquanto o Orbit está aberto.</p> : null}
    <Field label="Interesses"><input className={inputClass} maxLength={3000} value={interests} onChange={event => setInterests(event.target.value)} placeholder="Livros, cinema, café…" /></Field>
    <Field label="Notas"><textarea className={`${inputClass} min-h-24 resize-y`} maxLength={20000} value={draft.notes} onChange={event => patch({ notes: event.target.value })} placeholder="O que você quer lembrar sobre essa pessoa?" /></Field>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--orbit-line,#E9E8E5)] pt-4">
      {existing ? <Button type="button" variant="ghost" className="mr-auto min-h-11 text-red-700" onClick={() => setDeleting(true)}><Trash2 size={15} />Excluir</Button> : null}<Button type="button" variant="outline" className={quietClass} onClick={onCancel}>Cancelar</Button><Button type="submit" className={primaryClass}>{existing ? "Salvar alterações" : "Criar pessoa"}</Button>
    </div>
    {deleting ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm"><p className="flex-1">Excluir esta pessoa e seu histórico de contatos?</p><Button type="button" variant="outline" className="min-h-11" onClick={() => setDeleting(false)}>Manter</Button><Button type="button" variant="destructive" className="min-h-11" onClick={onDelete}>Excluir pessoa</Button></div> : null}
  </form>;
}

function ContactForm({ onSave, onCancel }: { onSave: (date: string, note: string) => void; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayString());
  return <form className="flex flex-col gap-5" onSubmit={event => { event.preventDefault(); const value = new Date(`${date}T12:00:00`); if (Number.isFinite(value.getTime())) onSave(value.toISOString(), note.trim()); }}><Field label="Data do contato"><input required type="date" max={todayString()} className={inputClass} value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="O que vocês conversaram?"><textarea autoFocus maxLength={5000} className={`${inputClass} min-h-28`} value={note} onChange={event => setNote(event.target.value)} placeholder="Guarde uma lembrança da conversa…" /></Field><div className="flex justify-end gap-2 border-t border-[var(--orbit-line,#E9E8E5)] pt-4"><Button variant="outline" type="button" className={quietClass} onClick={onCancel}>Cancelar</Button><Button type="submit" className={primaryClass}>Registrar contato</Button></div></form>;
}

function PersonDetail({ person, onBack, onEdit, onContact, onPatch }: { person: Person; onBack: () => void; onEdit: () => void; onContact: () => void; onPatch: (change: Partial<Person>) => void }) {
  const [view, setView] = useState<"Notas" | "Histórico de contato" | "Presentes">("Notas");
  const [presentTitle, setPresentTitle] = useState("");
  const age = ageFromBirthday(person.birthday);
  const contacts = person.contacts.slice().sort((a, b) => b.date.localeCompare(a.date));
  return <section className="mx-auto w-full max-w-[1200px] text-[var(--orbit-ink,#37352F)]">
    <PanelBack onClick={onBack}>Amigos e pessoas</PanelBack>
    <div className="mb-7 flex items-center gap-5"><div className="w-28 shrink-0 overflow-hidden sm:w-[180px]"><Portrait index={person.portrait} /></div><div className="flex min-w-0 flex-col items-start gap-2"><h1 className="break-words text-[28px] font-bold tracking-[-0.7px] sm:text-[36px]">{person.name}</h1><RelationshipBadge value={person.relationship} /><p className="text-xs text-[var(--orbit-muted,#787774)]">{age !== null ? `${age} anos · ` : ""}Aniversário {person.birthday ? `em ${displayDate(person.birthday)}` : "não informado"}</p><div className="mt-1 flex flex-wrap gap-2"><Button className={primaryClass} disabled={person.contacts.length >= 200} onClick={onContact}>Registrar contato</Button><Button variant="outline" className={quietClass} onClick={onEdit}>Editar pessoa</Button></div></div></div>
    <dl className="grid gap-5 border-y border-[var(--orbit-line,#E9E8E5)] py-5 sm:grid-cols-3"><div><dt className="mb-1 text-xs text-[var(--orbit-muted,#787774)]">Último contato</dt><dd className="text-sm">{lastContactLabel(contacts[0]?.date)}</dd></div><div><dt className="mb-1 text-xs text-[var(--orbit-muted,#787774)]">Próximo encontro</dt><dd className="text-sm">{displayDate(person.nextMeeting, { weekday: "long", day: "numeric", month: "long" })}</dd></div><div><dt className="mb-1 text-xs text-[var(--orbit-muted,#787774)]">Lembrete de aniversário</dt><dd className="text-sm">{reminderLabels[person.birthdayReminder]}</dd></div></dl>
    <div role="tablist" onKeyDown={navigateTabs} aria-label="Detalhes da pessoa" className="mb-6 flex overflow-x-auto border-b border-[var(--orbit-line,#E9E8E5)]">{(["Notas", "Histórico de contato", "Presentes"] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={view === tab} tabIndex={view === tab ? 0 : -1} className={`min-h-11 shrink-0 border-b-2 px-3 text-xs ${view === tab ? "border-[var(--orbit-ink,#37352F)]" : "border-transparent text-[var(--orbit-muted,#787774)]"}`} onClick={() => setView(tab)}>{tab}</button>)}</div>
    <div className="grid gap-9 lg:grid-cols-[2fr_1fr]">
      <div>{view === "Notas" ? <><h2 className="mb-3 text-lg font-semibold">O que quero lembrar</h2><p className="whitespace-pre-wrap text-sm leading-7 text-[var(--orbit-ink,#37352F)]">{person.notes || "Adicione uma nota para guardar o que importa sobre essa pessoa."}</p><div className="mt-4 flex flex-wrap gap-2">{person.interests.map(interest => <span key={interest} className="rounded-[3px] bg-[#F0EFEB] px-2 py-1 text-xs text-[var(--orbit-muted,#787774)]">{interest}</span>)}</div></> : view === "Histórico de contato" ? <><h2 className="mb-3 text-lg font-semibold">Histórico de contato</h2><ContactHistory contacts={contacts} /></> : <><h2 className="mb-3 text-lg font-semibold">Ideias de presentes</h2><form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); if (!presentTitle.trim() || person.presents.length >= 100) return; onPatch({ presents: [...person.presents, { id: crypto.randomUUID(), title: presentTitle.trim(), done: false }] }); setPresentTitle(""); }}><input className={inputClass} aria-label="Nova ideia de presente" maxLength={300} value={presentTitle} onChange={event => setPresentTitle(event.target.value)} placeholder="Adicionar ideia…" /><Button type="submit" disabled={!presentTitle.trim() || person.presents.length >= 100} variant="outline" className={quietClass}><Plus size={16} /><span className="sr-only">Adicionar presente</span></Button></form>{person.presents.map(present => <div key={present.id} className="flex min-h-11 items-center gap-3 border-b border-[var(--orbit-line,#E9E8E5)]"><label className="flex min-h-11 flex-1 items-center gap-3 text-sm"><input type="checkbox" checked={present.done} onChange={() => onPatch({ presents: person.presents.map(item => item.id === present.id ? { ...item, done: !item.done } : item) })} /><span className={present.done ? "text-[var(--orbit-muted,#787774)] line-through" : ""}>{present.title}</span></label><button type="button" aria-label={`Excluir ideia ${present.title}`} className="flex size-11 items-center justify-center text-[var(--orbit-muted,#787774)]" onClick={() => onPatch({ presents: person.presents.filter(item => item.id !== present.id) })}><Trash2 size={15} /></button></div>)}{person.presents.length === 0 ? <p className="text-sm text-[var(--orbit-muted,#787774)]">As suas ideias de presentes aparecerão aqui.</p> : null}</>}</div>
      {view !== "Histórico de contato" ? <aside><h2 className="mb-3 text-base font-semibold">Últimos contatos</h2><ContactHistory contacts={contacts.slice(0, 3)} />{contacts.length > 3 ? <button className="min-h-11 text-xs text-[var(--orbit-muted,#787774)]" type="button" onClick={() => setView("Histórico de contato")}>Ver histórico completo</button> : null}</aside> : null}
    </div>
  </section>;
}

function ContactHistory({ contacts }: { contacts: Person["contacts"] }) {
  return contacts.length ? <div className="space-y-3">{contacts.map(contact => <article key={contact.id} className="border-b border-[var(--orbit-line,#E9E8E5)] pb-3"><p className="mb-1 text-xs text-[var(--orbit-muted,#787774)]">{displayDate(contact.date, { day: "numeric", month: "short", year: "numeric" })}</p><p className="whitespace-pre-wrap text-sm leading-6">{contact.note || "Contato registrado."}</p></article>)}</div> : <p className="text-sm leading-6 text-[var(--orbit-muted,#787774)]">Nenhum contato registrado ainda.</p>;
}

function birthdayDistance(birthday: string) {
  if (!birthday) return Infinity;
  const now = new Date();
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birth = new Date(`${birthday}T12:00:00`);
  const next = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (next < currentDay) next.setFullYear(next.getFullYear() + 1);
  return Math.round((Date.UTC(next.getFullYear(), next.getMonth(), next.getDate()) - Date.UTC(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate())) / 86400000);
}

export function PeoplePanel({ workspace, onChange }: Props) {
  const [view, setView] = useState<View>("Galeria");
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] = useState("Todos os vínculos");
  const [order, setOrder] = useState("name");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Person | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const selected = workspace.people.find(person => person.id === selectedId);
  const people = useMemo(() => workspace.people.filter(person => (relationship === "Todos os vínculos" || person.relationship === relationship) && `${person.name} ${person.interests.join(" ")} ${person.notes}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).sort((a, b) => order === "birthday" ? birthdayDistance(a.birthday) - birthdayDistance(b.birthday) : order === "contact" ? (b.contacts.map(item => item.date).sort().at(-1) ?? "").localeCompare(a.contacts.map(item => item.date).sort().at(-1) ?? "") : a.name.localeCompare(b.name, "pt-BR")), [workspace.people, relationship, query, order]);
  const canCreate = workspace.people.length < 500;
  const openNew = () => { if (canCreate) setDraft(freshPerson()); };
  const save = (person: Person) => { onChange(current => ({ ...current, people: current.people.some(item => item.id === person.id) ? current.people.map(item => item.id === person.id ? person : item) : [...current.people, person] })); setDraft(null); };
  const patchSelected = (change: Partial<Person>) => { if (selectedId) onChange(current => ({ ...current, people: current.people.map(item => item.id === selectedId ? { ...item, ...change } : item) })); };
  const newButton = <Button className={primaryClass} disabled={!canCreate} onClick={openNew}><Plus size={15} />Nova pessoa</Button>;
  return <>
    {selected ? <PersonDetail key={selected.id} person={selected} onBack={() => setSelectedId(null)} onEdit={() => setDraft(selected)} onContact={() => setContactOpen(true)} onPatch={patchSelected} /> : <section className="mx-auto w-full max-w-[1200px] text-[var(--orbit-ink,#37352F)]">
      <header className="mb-6"><UsersRound size={36} strokeWidth={1.5} className="mb-3 hidden sm:block" /><h1 className="text-[28px] font-bold tracking-[-0.7px] sm:text-[36px]">Amigos e pessoas</h1><p className="mt-2 text-sm text-[var(--orbit-muted,#787774)]">Um lugar para lembrar de quem faz parte da sua vida.</p></header>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--orbit-line,#E9E8E5)]"><div role="tablist" onKeyDown={navigateTabs} aria-label="Visualização de pessoas" className="flex gap-3">{(["Galeria", "Vínculos", "Aniversários"] as const).map(tab => { const Icon = tabIcons[tab]; return <button type="button" role="tab" aria-selected={view === tab} tabIndex={view === tab ? 0 : -1} key={tab} onClick={() => setView(tab)} className={`flex min-h-11 items-center gap-1.5 border-b-2 text-xs sm:px-2 ${view === tab ? "border-[var(--orbit-ink,#37352F)]" : "border-transparent text-[var(--orbit-muted,#787774)]"}`}><Icon size={14} className="hidden sm:block" />{tab}</button>; })}</div><div className="mb-2 hidden sm:block">{newButton}</div></div>
      {workspace.people.length ? <div className="mb-5 flex flex-wrap gap-3"><label className="relative min-w-[160px] flex-1"><Search size={15} className="absolute left-3 top-3.5 text-[var(--orbit-muted,#787774)]" /><input aria-label="Buscar pessoas" className={`${inputClass} pl-9`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar pessoas…" /></label><select aria-label="Filtrar vínculo" className={`${inputClass.replace("w-full ", "")} w-full sm:w-auto max-w-full`} value={relationship} onChange={event => setRelationship(event.target.value)}><option>Todos os vínculos</option>{relationships.map(value => <option key={value}>{value}</option>)}</select><select aria-label="Ordenar pessoas" className={`${inputClass.replace("w-full ", "")} w-full sm:w-auto max-w-full`} value={order} onChange={event => setOrder(event.target.value)}><option value="name">Nome</option><option value="contact">Último contato</option><option value="birthday">Próximo aniversário</option></select></div> : null}
      {!workspace.people.length ? <PanelEmpty title="Quem faz parte da sua vida?" action={newButton}>Adicione uma pessoa para guardar interesses, datas importantes e lembrar dos seus encontros.</PanelEmpty> : !people.length ? <PanelEmpty title="Nenhuma pessoa encontrada" action={<Button variant="outline" className={quietClass} onClick={() => { setQuery(""); setRelationship("Todos os vínculos"); }}>Limpar filtros</Button>}>Tente outro nome ou vínculo.</PanelEmpty> : view === "Galeria" ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] sm:gap-4">{people.map(person => <PersonCard key={person.id} person={person} onOpen={() => setSelectedId(person.id)} />)}</div> : view === "Vínculos" ? <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">{relationships.filter(value => people.some(person => person.relationship === value)).map(value => <section key={value}><h2 className="mb-3 flex items-center gap-2 text-sm font-medium"><RelationshipIcon value={value} />{value}<span className="text-xs text-[var(--orbit-muted,#787774)]">{people.filter(person => person.relationship === value).length}</span></h2><div className="space-y-2">{people.filter(person => person.relationship === value).map(person => <button type="button" key={person.id} onClick={() => setSelectedId(person.id)} className="flex min-h-11 w-full items-center gap-3 rounded-[4px] border border-[var(--orbit-line,#E9E8E5)] px-3 py-2 text-left hover:bg-[#F7F7F5]"><Portrait index={person.portrait} small /><span className="min-w-0 truncate text-sm">{person.name}</span></button>)}</div></section>)}</div> : <div>{people.filter(person => person.birthday).sort((a, b) => birthdayDistance(a.birthday) - birthdayDistance(b.birthday)).map(person => { const days = birthdayDistance(person.birthday); const warning = person.birthdayReminder !== "none" && days <= ({ day: 0, "three-days": 3, week: 7, none: -1 })[person.birthdayReminder]; return <button type="button" key={person.id} onClick={() => setSelectedId(person.id)} className="flex min-h-20 w-full flex-wrap items-center gap-4 border-b border-[var(--orbit-line,#E9E8E5)] py-3 text-left"><Portrait index={person.portrait} small /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name}</p><p className="mt-1 text-xs text-[var(--orbit-muted,#787774)]">{displayDate(person.birthday)}</p></div><span className={`text-xs ${warning ? "font-medium text-[#AD5C82]" : "text-[var(--orbit-muted,#787774)]"}`}>{days === 0 ? "Hoje" : `Em ${days} dias`}{warning ? " · Lembrete" : ""}</span></button>; })}{people.every(person => !person.birthday) ? <p className="py-12 text-center text-sm text-[var(--orbit-muted,#787774)]">Adicione aniversários ao editar as pessoas.</p> : null}</div>}
      <footer className="mt-6 flex items-center justify-between gap-4 text-xs text-[var(--orbit-muted,#787774)]"><span>{people.length} {people.length === 1 ? "pessoa" : "pessoas"}</span>{workspace.people.length ? <button type="button" className="min-h-11" disabled={!canCreate} onClick={openNew}>+ Adicionar pessoa</button> : null}</footer><div className="mt-3 sm:hidden">{workspace.people.length ? newButton : null}</div>
    </section>}
    <Dialog open={draft !== null} onOpenChange={open => { if (!open) setDraft(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[6px] border-[var(--orbit-line,#E9E8E5)] sm:max-w-[480px]"><DialogHeader><DialogTitle className="text-xl font-medium">{draft && workspace.people.some(person => person.id === draft.id) ? "Editar pessoa" : "Nova pessoa"}</DialogTitle><DialogDescription>Guarde o que importa sobre essa pessoa.</DialogDescription></DialogHeader>{draft ? <PersonForm key={draft.id} person={draft} existing={workspace.people.some(person => person.id === draft.id)} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onChange(current => ({ ...current, people: current.people.filter(person => person.id !== draft.id) })); setDraft(null); setSelectedId(null); }} /> : null}</DialogContent></Dialog>
    <Dialog open={contactOpen && !!selected} onOpenChange={setContactOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[6px] border-[var(--orbit-line,#E9E8E5)]"><DialogHeader><DialogTitle>Registrar contato</DialogTitle><DialogDescription>{selected ? `Guarde uma lembrança do encontro com ${selected.name}.` : ""}</DialogDescription></DialogHeader>{selected ? <ContactForm onCancel={() => setContactOpen(false)} onSave={(date, note) => { onChange(current => ({ ...current, people: current.people.map(person => person.id === selected.id ? { ...person, contacts: [...person.contacts, { id: crypto.randomUUID(), date, note }].slice(-200) } : person) })); setContactOpen(false); }} /> : null}</DialogContent></Dialog>
  </>;
}
