# Şifremi Unuttum Frontend Entegrasyonu

## 1. Forgot Password Component (src/components/ForgotPasswordModal.jsx)

```jsx
import React, { useState } from 'react';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email adresi gerekli');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setEmail('');
      } else {
        setError(data.error || 'Bir hata oluştu');
      }
    } catch (error) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Şifremi Unuttum</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>Email adresinizi girin, size şifre sıfırlama linki gönderelim.</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Adresi</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                disabled={loading}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !email}
            >
              {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
            </button>
          </form>
          
          {message && (
            <div className="success-message">
              {message}
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
```

## 2. Reset Password Component (src/components/ResetPasswordForm.jsx)

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPasswordForm = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('Geçersiz token');
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`http://localhost:3000/auth/verify-reset-token/${token}`);
      const data = await response.json();

      if (response.ok) {
        setTokenValid(true);
        setEmail(data.email);
      } else {
        setError(data.error || 'Geçersiz token');
      }
    } catch (error) {
      setError('Token doğrulanamadı');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Tüm alanları doldurun');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('http://localhost:3000/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Şifre sıfırlanamadı');
      }
    } catch (error) {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid && !error) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Token doğrulanıyor...</p>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-form">
        <h2>Şifre Sıfırlama</h2>
        <p>Merhaba! Yeni şifrenizi belirleyin.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              disabled={loading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Şifre Tekrar</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              disabled={loading}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? 'Sıfırlanıyor...' : 'Şifremi Sıfırla'}
          </button>
        </form>
        
        {message && (
          <div className="success-message">
            {message}
            <p>3 saniye sonra giriş sayfasına yönlendirileceksiniz...</p>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordForm;
```

## 3. Login Sayfasında Entegrasyon (src/pages/LoginPage.jsx)

```jsx
import React, { useState } from 'react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

const LoginPage = () => {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    // Normal login işlemi
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Giriş Yap</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={loginData.email}
              onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              type="password"
              id="password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              required
            />
          </div>
          
          <button type="submit" className="login-button">
            Giriş Yap
          </button>
        </form>
        
        <div className="login-footer">
          <button 
            type="button" 
            className="forgot-password-link"
            onClick={() => setShowForgotPassword(true)}
          >
            Şifremi Unuttum
          </button>
        </div>
      </div>
      
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
};

export default LoginPage;
```

## 4. CSS Stilleri (src/components/ForgotPassword.css)

```css
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 12px;
  border-radius: 4px;
  margin-top: 15px;
  border: 1px solid #c3e6cb;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-top: 15px;
  border: 1px solid #f5c6cb;
}

.forgot-password-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
}

.forgot-password-link:hover {
  color: #0056b3;
}

/* Reset Password Page */
.reset-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.reset-password-form {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.reset-password-form h2 {
  text-align: center;
  margin-bottom: 10px;
  color: #333;
}

.reset-password-form p {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## 5. Route Yapılandırması (src/App.jsx)

```jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResetPasswordForm from './components/ResetPasswordForm';

function App() {
  return (
    <Router>
      <Routes>
        {/* Diğer route'lar */}
        <Route path="/reset-password" element={<ResetPasswordForm />} />
      </Routes>
    </Router>
  );
}

export default App;
```

## 6. API Endpoints

### Şifremi Unuttum:
```
POST /auth/forgot-password
Body: { "email": "user@example.com" }
```

### Token Doğrulama:
```
GET /auth/verify-reset-token/:token
```

### Şifre Sıfırlama:
```
POST /auth/reset-password
Body: { "token": "token", "newPassword": "newpassword" }
```

## Özellikler:

- ✅ **Güvenli Token**: 15 dakika geçerlilik süresi
- ✅ **Email Doğrulama**: Kullanıcı kontrolü
- ✅ **Tek Kullanım**: Token sadece bir kez kullanılabilir
- ✅ **Güvenlik**: Şifre sıfırlandıktan sonra tüm refresh token'lar silinir
- ✅ **Responsive**: Mobil uyumlu tasarım
- ✅ **Kullanıcı Dostu**: Açık hata mesajları ve yönlendirmeler

Bu yapı ile şifremi unuttum özelliği tam olarak çalışacak!
