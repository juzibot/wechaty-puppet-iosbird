export function isRoomId (id?: string): boolean {
  if (!id) {
    return false
  }
  return /@chatroom$/.test(id)
}

export function isContactId (id?: string): boolean {
  if (!id) {
    return false
  }
  return !isRoomId(id)
}
