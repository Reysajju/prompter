export const saveSession = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(key, JSON.stringify(data))
  }
}

export const loadSession = (key: string) => {
  if (typeof window !== 'undefined') {
    const data = sessionStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }
  return null
}