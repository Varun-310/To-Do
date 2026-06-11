import crypto from 'crypto'
const SECRET = process.env.JWT_SECRET

export function createToken(userId) {
  const header = Buffer
    .from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .toString('base64url')

  const payload = Buffer
    .from(JSON.stringify({
      userId,
      exp: Date.now() + (24 * 60 * 60 * 1000)
    }))
    .toString('base64url')
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${signature}`
}

export function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.')
    const expectedSig = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url')

    if (signature !== expectedSig) return null
    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    )

    if (data.exp < Date.now()) return null
    return data
  } catch (error) {
    return null
  }
}