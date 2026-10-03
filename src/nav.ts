/** Moves to a hash route: "#/" (home) or "#/c/<id>" (a contest's brief). */
export function go(hash: string) {
  window.location.hash = hash
}
