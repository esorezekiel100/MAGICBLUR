import type { Operation } from './types'

const DATABASE_NAME = 'magicblur-local'
const STORE_NAME = 'sessions'
const SESSION_KEY = 'active'

export type SavedSession = {
  file: File
  extras: File[]
  steps: Operation[]
  exportFormat: string
  quality: string
  updatedAt: number
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) return Promise.reject(new Error('Local session saving is not available in this browser.'))
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Could not open private local session storage.'))
    request.onblocked = () => reject(new Error('Private local session storage is blocked by another tab.'))
  })
}

export async function saveSession(session: SavedSession): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(session, SESSION_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Your edit could not be saved in local browser storage.'))
      transaction.onabort = () => reject(new Error('Your local edit was not saved.'))
    })
  } finally { database.close() }
}

export async function loadSession(): Promise<SavedSession | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(SESSION_KEY)
      request.onsuccess = () => resolve((request.result as SavedSession | undefined) ?? null)
      request.onerror = () => reject(new Error('Could not read the saved local edit.'))
    })
  } finally { database.close() }
}

export async function clearSession(): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(SESSION_KEY)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(new Error('Could not clear the saved local edit.'))
    })
  } finally { database.close() }
}
