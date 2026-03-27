import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import fs from 'fs'

export async function initDB(dataDir) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const cardsDB = new Low(new JSONFile(path.join(dataDir, 'cards.json')), { cards: [] })
  const progressDB = new Low(new JSONFile(path.join(dataDir, 'progress.json')), { progress: [] })

  await cardsDB.read()
  await progressDB.read()

  await cardsDB.write()
  await progressDB.write()

  return { cardsDB, progressDB }
}
