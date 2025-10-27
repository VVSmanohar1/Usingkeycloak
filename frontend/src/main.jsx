import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

const API_URL = 'http://localhost:3000'

function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Handle Keycloak callback redirect
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) handleKeycloakCallback(code)
  }, [])

  const handleKeycloakCallback = async (code) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/auth/keycloak-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
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
    } finally {
      setLoading(false)
    }
  }

  const handleKeycloakLogin = async (isRegister = false) => {
    try {
      setLoading(true)
      const endpoint = isRegister ? 'keycloak-register' : 'keycloak-login'
      const response = await fetch(`${API_URL}/auth/${endpoint}`, { method: 'POST' })
      const data = await response.json()
      window.location.href = data.authUrl
    } catch (err) {
      setError('Failed to redirect to Keycloak')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="auth-form">
        <h1>Welcome</h1>
        {error && <div className="error">{error}</div>}

        <button className="keycloak-btn" onClick={() => handleKeycloakLogin(false)} disabled={loading}>
          {loading ? 'Redirecting...' : 'Login with Keycloak'}
        </button>

        <button className="keycloak-btn register-btn" onClick={() => handleKeycloakLogin(true)} disabled={loading}>
          {loading ? 'Redirecting...' : 'Register with Keycloak'}
        </button>
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
        {user?.firstName && <p>Name: {user.firstName} {user.lastName || ''}</p>}
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </div>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
    setLoading(false)
  }, [])

  if (loading) return <div className="container"><p>Loading...</p></div>

  return isLoggedIn ? <Dashboard /> : <LoginPage />
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
