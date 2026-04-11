import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import './RegisterForm.css'

function RegisterForm({ onRegisterSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required')
      return false
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters long')
      return false
    }

    if (!phone.trim()) {
      setError('Phone number is required for emergency SOS alerts')
      return false
    }

    if (!password) {
      setError('Password is required')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/register', {
        username: username.trim(),
        password: password,
        phone: phone.trim()
      })

      if (response.data.success) {
        setSuccess('Account created successfully! Redirecting to login...')
        setUsername('')
        setPassword('')
        setPhone('')
        setConfirmPassword('')
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('Username already exists. Please try another one.')
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <h2>Create Account</h2>
      <p className="form-subtitle">Sign up to get started with risk monitoring</p>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>SOS Phone Number (WhatsApp)</label>
        <input
          type="tel"
          placeholder="Emergency contact (e.g. 919876543210)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Confirm Password</label>
        <input
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
      </div>

      <button 
        type="submit" 
        className="register-button"
        disabled={loading}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>

      <div className="login-link">
        Already have an account? <Link to="/login">Sign in here</Link>
      </div>

      <div className="terms">
        By creating an account, you agree to our <a href="#">Terms of Service</a> and 
        <a href="#">Privacy Policy</a>
      </div>
    </form>
  )
}

export default RegisterForm
