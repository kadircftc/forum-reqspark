// ===========================================
// POSTMAN PRE-REQUEST SCRIPT
// ===========================================
// Bu script'i Postman'de Pre-request Script tab'ına yapıştır


// AES-256-GCM şifreleme fonksiyonu
function encryptAesGcm(data) {
    const key = CryptoJS.enc.Base64.parse("XiDhMqxYPq3X1lVJEVWqgoH/pUOqfAvm/0+QHM9ntls=");
    const iv = CryptoJS.enc.Base64.parse("kVbqaHuAYaMj4M1x");
    
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
    });
    
    return {
        payload: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        tag: encrypted.tag.toString(CryptoJS.enc.Base64)
    };
}

// Eğer request body varsa ve JSON ise şifrele
if (pm.request.body && pm.request.body.raw) {
    try {
        const bodyData = JSON.parse(pm.request.body.raw);
        const encrypted = encryptAesGcm(bodyData);
        
        // Request body'yi şifrelenmiş haliyle güncelle
        pm.request.body.raw = JSON.stringify(encrypted);
        pm.request.body.options.raw.language = "json";
        
        console.log("✅ Request body şifrelendi");
    } catch (e) {
        console.log("❌ Request body şifreleme hatası:", e.message);
    }
}

// ===========================================
// POSTMAN PRE-RESPONSE SCRIPT (Tests tab'ına)
// ===========================================
// Bu script'i Postman'de Tests tab'ına yapıştır

// Key ve IV'i buraya ekle (base64 formatında)


// AES-256-GCM şifre çözme fonksiyonu
function decryptAesGcm(payload, tag) {
    const key = CryptoJS.enc.Base64.parse("XiDhMqxYPq3X1lVJEVWqgoH/pUOqfAvm/0+QHM9ntls=");
    const iv = CryptoJS.enc.Base64.parse("kVbqaHuAYaMj4M1x");
    
    const ciphertext = CryptoJS.enc.Base64.parse(payload);
    const authTag = CryptoJS.enc.Base64.parse(tag);
    
    const decrypted = CryptoJS.AES.decrypt({
        ciphertext: ciphertext,
        tag: authTag
    }, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
    });
    
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

// Response'u şifre çöz
try {
    const responseData = pm.response.json();
    
    if (responseData.payload && responseData.tag) {
        const decrypted = decryptAesGcm(responseData.payload, responseData.tag);
        
        // Console'a çözülmüş veriyi yazdır
        console.log("🔓 Çözülmüş Response:", JSON.stringify(decrypted, null, 2));
        
        // Test için response'u global değişkene kaydet
        pm.globals.set("decryptedResponse", JSON.stringify(decrypted));
        
        // Response'u çözülmüş haliyle göster
        pm.test("Response şifre çözüldü", function () {
            pm.expect(decrypted).to.be.an('object');
        });
        
    } else {
        console.log("ℹ️ Response zaten şifrelenmemiş");
    }
} catch (e) {
    console.log("❌ Response şifre çözme hatası:", e.message);
}

// ===========================================
// KULLANIM TALİMATLARI
// ===========================================

/*
1. POSTMAN KURULUMU:
   - Postman'de yeni bir request oluştur
   - Method: POST
   - URL: http://localhost:3000/auth/register
   - Headers: Content-Type: application/json

2. PRE-REQUEST SCRIPT:
   - Request'in "Pre-request Script" tab'ına yukarıdaki PRE-REQUEST SCRIPT'i yapıştır
   - CRYPTO_KEY ve CRYPTO_IV değerlerini güncelle

3. TESTS SCRIPT:
   - Request'in "Tests" tab'ına yukarıdaki PRE-RESPONSE SCRIPT'i yapıştır
   - CRYPTO_KEY ve CRYPTO_IV değerlerini güncelle

4. REQUEST BODY:
   - Raw JSON olarak normal veri gönder:
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "123456"
   }

5. ÇALIŞMA MANTIĞI:
   - Pre-request script normal JSON'u {payload, tag} formatına şifreler
   - Server şifrelenmiş veriyi alır, çözer, işler
   - Server cevabı {payload, tag} formatında şifreleyerek döner
   - Tests script server cevabını çözer ve console'a yazdırır

6. TEST ÖRNEKLERİ:
   - POST /auth/register
   - POST /auth/verify  
   - POST /auth/login
   - GET /health
*/
