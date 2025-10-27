import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const API_URL = 'http://localhost:3000'

// Initialize Keycloak
let keycloak = null

const initKeycloak = async () => {
  const script = document.createElement('script')
  script.src = 'http://localhost:8080/js/keycloak.js'
  script.onload = () => {
    window.Keycloak({ url: 'http://localhost:8080', realm: 'master', clientId: 'vite-app' }).init({ onLoad: 'check-sso' })
  }
  document.body.appendChild(script)
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const payload = isLogin 
        ? { email, password }
        : { email, password, firstName, lastName }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        window.location.href = '/dashboard'
      } else {
        setError(data.message || 'Authentication failed')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleKeycloakLogin = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/keycloak-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      window.location.href = data.authUrl
    } catch (err) {
      setError('Keycloak login failed')
    }
  }

  return (
    <div className="container">
      <div className="auth-form">
        <h1>{isLogin ? 'Login' : 'Register'}</h1>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </>
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
        </form>

        <button className="keycloak-btn" onClick={handleKeycloakLogin}>
          {isLogin ? 'Login' : 'Register'} with Keycloak
        </button>

        <p>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <a onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Login'}
          </a>
        </p>
      </div>
    </div>
  )
}

function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    } else {
      window.location.href = '/'
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  return (
    <div className="container">
      <div className="dashboard">
        <h1>Welcome, {user?.firstName || user?.email}!</h1>
        <p>Email: {user?.email}</p>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </div>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  return isLoggedIn ? <Dashboard /> : <LoginPage />
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
