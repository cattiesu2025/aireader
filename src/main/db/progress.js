export function getProgress(db, pdfHash) {
  return db.data.progress.find(p => p.pdfHash === pdfHash) || null
}

export async function saveProgress(db, pdfHash, page, scrollY) {
  const idx = db.data.progress.findIndex(p => p.pdfHash === pdfHash)
  const entry = { pdfHash, page, scrollY, updatedAt: Date.now() }
  if (idx === -1) db.data.progress.push(entry)
  else db.data.progress[idx] = entry
  await db.write()
}
