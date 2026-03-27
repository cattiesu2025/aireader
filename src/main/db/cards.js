import { nanoid } from 'nanoid'

export function getCards(db, pdfHash) {
  return db.data.cards.filter(c => c.pdfHash === pdfHash)
}

export async function saveCard(db, card) {
  const newCard = { ...card, id: nanoid(), createdAt: Date.now() }
  db.data.cards.push(newCard)
  await db.write()
  return newCard
}

export async function updateCard(db, id, updates) {
  const idx = db.data.cards.findIndex(c => c.id === id)
  if (idx === -1) throw new Error('Card not found')
  db.data.cards[idx] = { ...db.data.cards[idx], ...updates }
  await db.write()
  return db.data.cards[idx]
}

export async function deleteCard(db, id) {
  const before = db.data.cards.length
  db.data.cards = db.data.cards.filter(c => c.id !== id)
  if (db.data.cards.length === before) throw new Error('Card not found')
  await db.write()
}
