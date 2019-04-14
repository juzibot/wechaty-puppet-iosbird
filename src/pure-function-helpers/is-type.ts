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

export function isPayload (payload: object): boolean {
  if (   payload
      && Object.keys(payload).length > 0
  ) {
    return true
  }
  return false
}
