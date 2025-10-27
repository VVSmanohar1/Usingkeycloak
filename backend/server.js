// Backend: server.js
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080'
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'master'
const CLIENT_ID = process.env.CLIENT_ID || 'vite-app'
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'your-client-secret'
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:5173/callback'
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'

app.use(cors())
app.use(express.json())

// In-memory user storage (replace with database in production)
const users = new Map()

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
}

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'No token provided' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }

  const user = Array.from(users.values()).find((u) => u.email === email)

  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = generateToken({ id: user.id, email: user.email })
  res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
  })
})

// Register endpoint
app.post('/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }

  if (Array.from(users.values()).some((u) => u.email === email)) {
    return res.status(409).json({ message: 'Email already exists' })
  }

  const userId = Date.now().toString()
  const newUser = { id: userId, email, password, firstName, lastName }
  users.set(userId, newUser)

  const token = generateToken({ id: userId, email })
  res.status(201).json({
    token,
    user: { id: userId, email, firstName, lastName },
  })
})

// Keycloak login initiation
app.post('/auth/keycloak-login', (req, res) => {
  const authUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid%20profile%20email`
  res.json({ authUrl })
})

// Keycloak callback endpoint
app.post('/auth/keycloak-callback', async (req, res) => {
  const { code } = req.body

  if (!code) {
    return res.status(400).json({ message: 'Authorization code required' })
  }

  try {
    const tokenResponse = await axios.post(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }
    )

    const { access_token } = tokenResponse.data

    // Decode the access token to get user info
    const decoded = jwt.decode(access_token)
    const keycloakUser = {
      id: decoded.sub,
      email: decoded.email,
      firstName: decoded.given_name,
      lastName: decoded.family_name,
    }

    // Store or update user in local storage
    users.set(keycloakUser.id, keycloakUser)

    // Generate your own JWT
    const token = generateToken(keycloakUser)

    res.json({
      token,
      user: keycloakUser,
    })
  } catch (error) {
    console.error('Keycloak callback error:', error.message)
    res.status(500).json({ message: 'Authentication failed' })
  }
})

// Protected endpoint example
app.get('/api/profile', verifyToken, (req, res) => {
  res.json({ user: req.user })
})

// Logout endpoint
app.post('/auth/logout', verifyToken, (req, res) => {
  // In a production app, you would invalidate the token here
  res.json({ message: 'Logged out successfully' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})