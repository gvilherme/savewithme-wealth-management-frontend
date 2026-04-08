export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setCookie(name: string, value: string, options: { expires?: Date; path?: string } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`
  if (options.expires) cookie += `; expires=${options.expires.toUTCString()}`
  cookie += `; path=${options.path ?? '/'}`
  cookie += '; SameSite=Lax'
  document.cookie = cookie
}

export function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
}
