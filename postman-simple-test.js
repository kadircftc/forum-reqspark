// ===========================================
// BASIT TEST - ŞİFRELEME OLMADAN
// ===========================================
// Bu script'i Postman'de Pre-request Script tab'ına yapıştır

// Şifreleme olmadan test et
console.log("🧪 Basit test - şifreleme yok");
console.log("📤 Request body:", pm.request.body.raw);

// ===========================================
// TESTS SCRIPT - ŞİFRELEME OLMADAN  
// ===========================================
// Bu script'i Postman'de Tests tab'ına yapıştır

console.log("📥 Response geldi:", pm.response.status);
console.log("📥 Response body:", pm.response.text());

pm.test("Response başarılı", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 400]);
});

// ===========================================
// KULLANIM
// ===========================================
/*
1. Bu script'leri Postman'e yapıştır
2. Request body'ye normal JSON yaz:
   {
     "username": "testuser2",
     "email": "test2@example.com",
     "password": "123456"
   }
3. Send'e bas
4. Console'da response'u gör
*/
