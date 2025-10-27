import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// 🔑 Keycloak configuration
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master'
const CLIENT_ID = process.env.CLIENT_ID || 'vite-app'
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'your-client-secret'
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5173/callback'

// 🔒 App JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

app.use(cors())
app.use(express.json())

// Simple in-memory user map
const users = new Map()

// Generate app JWT
const generateToken = (user) => jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })

// Verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// 🔹 Keycloak Login
app.post('/auth/keycloak-login', (req, res) => {
  const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code&scope=openid%20profile%20email`
  res.json({ authUrl })
})

// 🔹 Keycloak Registration
app.post('/auth/keycloak-register', (req, res) => {
  const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code&scope=openid%20profile%20email` +
    `&kc_action=register`
  res.json({ authUrl })
})

// 🔹 Keycloak Callback (exchange code -> access token -> app token)
app.post('/auth/keycloak-callback', async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ message: 'Authorization code required' })

  try {
    const tokenResponse = await axios.post(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )

    const { access_token } = tokenResponse.data
    const decoded = jwt.decode(access_token)

    const keycloakUser = {
      id: decoded.sub,
      email: decoded.email,
      firstName: decoded.given_name,
      lastName: decoded.family_name,
    }

    users.set(keycloakUser.id, keycloakUser)
    const appToken = generateToken(keycloakUser)

    res.json({ token: appToken, user: keycloakUser })
  } catch (error) {
    console.error('Keycloak callback error:', error.message)
    res.status(500).json({ message: 'Authentication failed' })
  }
})

// 🔹 Example protected route
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({ user: req.user })
})

// 🔹 Logout
app.post('/auth/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out successfully' })
})

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})
