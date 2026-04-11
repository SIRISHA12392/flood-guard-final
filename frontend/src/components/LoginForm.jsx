import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import './LoginForm.css'

function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password')
      setLoading(false)
      return
    }

    try {
      const response = await axios.post('/api/auth/login', {
        username: username.trim(),
        password: password
      })

      if (response.data.success) {
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('rememberedUsername', username)
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('rememberedUsername')
        }

        onLogin(response.data.token, response.data.user)
        navigate('/home')
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username or password')
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2>Sign in</h2>
      <p className="form-subtitle">Enter your credentials to continue</p>
      
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Email Address</label>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="checkbox-group">
        <input
          type="checkbox"
          id="remember"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          disabled={loading}
        />
        <label htmlFor="remember">Remember Me</label>
      </div>

      <button 
        type="submit" 
        className="login-button"
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign in now'}
      </button>

      <div className="forgot-password">
        <a href="#">Lost your password?</a>
      </div>

      <div className="create-account">
        Don't have an account? <Link to="/register">Create new account</Link>
      </div>

      <div className="terms">
        By clicking on "Sign in Now" you agree to <a href="#">Terms of Service</a> | 
        <a href="#">Privacy Policy</a>
      </div>
    </form>
  )
}

export default LoginForm
