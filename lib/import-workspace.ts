import type { Workspace } from "./workspace";

export function mergeWorkspace(existing: Workspace, incoming: Workspace): Workspace {
  const pageIds = new Map(incoming.pages.map(page => [page.id, crypto.randomUUID()]));
  const taskIds = new Map(incoming.tasks.map(task => [task.id, crypto.randomUUID()]));
  return {
    ...existing,
    pages: [...existing.pages, ...incoming.pages.map(page => ({ ...page, id: pageIds.get(page.id)!, parentId: page.parentId ? pageIds.get(page.parentId) ?? null : null }))],
    tasks: [...existing.tasks, ...incoming.tasks.map(task => ({ ...task, id: taskIds.get(task.id)!, pageId: task.pageId ? pageIds.get(task.pageId) ?? null : null }))],
    people: [...existing.people, ...incoming.people.map(person => ({ ...person, id: crypto.randomUUID(), contacts: person.contacts.map(contact => ({ ...contact, id: crypto.randomUUID() })), presents: person.presents.map(present => ({ ...present, id: crypto.randomUUID() })) }))],
    goals: [...existing.goals, ...incoming.goals.map(goal => ({ ...goal, id: crypto.randomUUID(), taskIds: goal.taskIds.flatMap(id => taskIds.has(id) ? [taskIds.get(id)!] : []) }))],
    focusSessions: [...existing.focusSessions, ...incoming.focusSessions.map(session => ({ ...session, id: crypto.randomUUID(), taskId: session.taskId ? taskIds.get(session.taskId) ?? null : null }))].slice(-5000),
  };
}
