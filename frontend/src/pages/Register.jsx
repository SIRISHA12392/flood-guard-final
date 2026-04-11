import React from 'react'
import RegisterForm from '../components/RegisterForm'
import './Register.css'

function Register({ onRegisterSuccess }) {
  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-left">
          <div className="welcome-section">
            <h1>Join Us Today</h1>
            <p>Create an account to get started with flood and landslide risk prediction. Sign up now to access all features.</p>
            
            <div className="social-icons">
              <a href="#" className="social-icon facebook" title="Facebook">f</a>
              <a href="#" className="social-icon twitter" title="Twitter">𝕏</a>
              <a href="#" className="social-icon instagram" title="Instagram">📷</a>
              <a href="#" className="social-icon youtube" title="YouTube">▶</a>
            </div>
          </div>
        </div>

        <div className="register-right">
          <RegisterForm onRegisterSuccess={onRegisterSuccess} />
        </div>
      </div>
    </div>
  )
}

export default Register
