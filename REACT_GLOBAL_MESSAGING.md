# React Frontend - Global Mesajlaşma Entegrasyonu

## Gerekli Paketler
```bash
npm install socket.io-client
```

## 1. Socket Service (src/services/socketService.js)

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io('http://localhost:3000', {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket bağlantısı kuruldu:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket bağlantısı kesildi');
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Artık gerekli değil - token'dan otomatik alınıyor
  // setUser fonksiyonu kaldırıldı

  // Yeni mesaj dinleyicisi
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  offNewMessage(callback) {
    if (this.socket) {
      this.socket.off('new_message', callback);
    }
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected;
  }
}

export default new SocketService();
```

## 2. Global Message Component (src/components/GlobalMessageComponent.jsx)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import socketService from '../services/socketService';

const GlobalMessageComponent = ({ currentUser, authToken }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [threadId, setThreadId] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentUser && authToken) {
      // Socket bağlantısını kur
      socketService.connect(authToken);
      
      // Token'dan otomatik olarak kullanıcı ID'si alınıyor
      console.log('Socket bağlantısı kuruldu, token ile kullanıcı ID otomatik alınıyor');

      // Yeni mesaj dinleyicisi
      const handleNewMessage = (message) => {
        setMessages(prev => [...prev, message]);
      };

      socketService.onNewMessage(handleNewMessage);

      return () => {
        socketService.offNewMessage(handleNewMessage);
        socketService.disconnect();
      };
    }
  }, [currentUser, authToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !threadId || !authToken) {
      alert('Mesaj ve Thread ID gerekli');
      return;
    }

    try {
      const response = await fetch('/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          thread_id: threadId,
          content: newMessage.trim()
        })
      });

      const data = await response.json();
      if (response.ok) {
        // Kendi mesajımızı hemen ekle (socket'ten gelmeyecek)
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      } else {
        alert('Mesaj gönderilemedi: ' + (data.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      alert('Mesaj gönderilemedi');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="global-message-container">
      <div className="message-header">
        <h2>🌍 Global Mesajlaşma</h2>
        <div className="connection-status">
          {socketService.isSocketConnected() ? (
            <span className="connected">🟢 Bağlı</span>
          ) : (
            <span className="disconnected">🔴 Bağlantı kesildi</span>
          )}
        </div>
      </div>

      <div className="thread-input">
        <input
          type="number"
          value={threadId}
          onChange={(e) => setThreadId(e.target.value)}
          placeholder="Thread ID girin"
        />
      </div>

      <div className="messages-list">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.is_mine ? 'own-message' : 'other-message'}`}
          >
            <div className="message-header">
              <span className="username">{message.username}</span>
              <span className="timestamp">
                {new Date(message.created_at).toLocaleTimeString('tr-TR')}
              </span>
            </div>
            <div className="message-content">{message.content}</div>
            <div className="message-meta">
              <div className="thread-info">
                <strong>Thread:</strong> {message.thread_title}
              </div>
              <div className="category-info">
                <strong>Kategori:</strong> {message.category_name} (ID: {message.category_id})
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Mesajınızı yazın..."
          disabled={!socketService.isSocketConnected() || !threadId}
        />
        <button 
          onClick={sendMessage}
          disabled={!newMessage.trim() || !socketService.isSocketConnected() || !threadId}
        >
          Gönder
        </button>
      </div>
    </div>
  );
};

export default GlobalMessageComponent;
```

## 3. CSS Stilleri (src/components/GlobalMessageComponent.css)

```css
.global-message-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1000px;
  margin: 0 auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f8f9fa;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #007bff;
  color: white;
}

.message-header h2 {
  margin: 0;
  font-size: 1.5em;
}

.connection-status {
  font-size: 0.9em;
}

.connected {
  color: #28a745;
}

.disconnected {
  color: #dc3545;
}

.thread-input {
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #ddd;
}

.thread-input input {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.thread-input input:focus {
  border-color: #007bff;
}

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f8f9fa;
}

.message {
  margin-bottom: 20px;
  padding: 15px;
  border-radius: 12px;
  max-width: 80%;
  word-wrap: break-word;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.own-message {
  background-color: #007bff;
  color: white;
  margin-left: auto;
  text-align: right;
}

.other-message {
  background-color: white;
  color: #333;
  border: 1px solid #e9ecef;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.85em;
  opacity: 0.9;
}

.username {
  font-weight: bold;
}

.timestamp {
  font-size: 0.8em;
}

.message-content {
  margin-bottom: 10px;
  line-height: 1.4;
  font-size: 1em;
}

.message-meta {
  font-size: 0.75em;
  opacity: 0.8;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.2);
}

.other-message .message-meta {
  border-top: 1px solid #e9ecef;
}

.thread-info, .category-info {
  margin-bottom: 3px;
}

.message-input {
  display: flex;
  padding: 15px 20px;
  background-color: white;
  border-top: 1px solid #ddd;
}

.message-input input {
  flex: 1;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 25px;
  outline: none;
  margin-right: 10px;
  font-size: 1em;
}

.message-input input:focus {
  border-color: #007bff;
}

.message-input input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.message-input button {
  padding: 12px 25px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 25px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 1em;
}

.message-input button:hover:not(:disabled) {
  background-color: #0056b3;
}

.message-input button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .global-message-container {
    height: 100vh;
    border-radius: 0;
  }
  
  .message {
    max-width: 90%;
  }
  
  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
```

## 4. Kullanım Örneği (src/pages/GlobalChatPage.jsx)

```jsx
import React, { useState, useEffect } from 'react';
import GlobalMessageComponent from '../components/GlobalMessageComponent';

const GlobalChatPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Local storage'dan kullanıcı bilgilerini al
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (token && user) {
      setAuthToken(token);
      setCurrentUser(user);
    }
  }, []);

  if (!currentUser || !authToken) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Lütfen giriş yapın</h2>
        <p>Global mesajlaşma özelliğini kullanmak için giriş yapmalısınız.</p>
      </div>
    );
  }

  return (
    <div className="global-chat-page">
      <GlobalMessageComponent
        currentUser={currentUser}
        authToken={authToken}
      />
    </div>
  );
};

export default GlobalChatPage;
```

## 5. API Response Formatı

Mesaj gönderildiğinde dönen response formatı:

```json
{
  "message": {
    "id": 123,
    "thread_id": 45,
    "user_id": 67,
    "content": "Merhaba dünya!",
    "created_at": "2024-01-15T10:30:00.000Z",
    "thread_title": "Genel Sohbet",
    "category_id": 3,
    "category_name": "Genel",
    "username": "kullanici123",
    "is_mine": true,
    "align": "right"
  }
}
```

## 6. Socket Event'leri

- **new_message**: Mesaj objesi - Yeni mesaj geldiğinde (mesaj gönderen hariç)
- **Token Authentication**: Bağlantı sırasında token ile kullanıcı ID'si otomatik alınır

## Önemli Özellikler

1. **Global Mesajlaşma**: Thread bazlı değil, tüm mesajlar herkese gönderilir
2. **Mesaj Gönderen Hariç**: Kendi mesajınız size tekrar gönderilmez
3. **Detaylı Bilgiler**: Thread başlığı, kategori bilgileri, kullanıcı adı
4. **Otomatik Scroll**: Yeni mesajlar geldiğinde otomatik scroll
5. **Bağlantı Durumu**: Socket bağlantı durumu gösterilir
6. **Thread ID Gerekli**: Mesaj göndermek için thread ID gerekli
7. **Responsive Tasarım**: Mobil uyumlu

Bu yapı ile React frontend'inizde global mesajlaşma özelliği tam olarak çalışacak!
