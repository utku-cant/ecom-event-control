# Meta E-Commerce Event Control Alert

Bu script, Google Apps Script kullanılarak Google Sheets üzerinden Meta reklam hesaplarında gerçekleşen e-ticaret eventlerini kontrol eder ve günlük karşılaştırmalı bir e-posta raporu gönderir.

## Özellikler

- Belirli Meta eventlerinin (`Purchase`, `BeginCheckout`, `AddToCart`) günlük adetlerini toplar.
- Dünkü veriler ile bir önceki günün verilerini karşılaştırır.
- Her hesap için % değişim oranlarını renklendirerek görselleştirir.
- Eksik eventleri vurgular.
- Sonuçları e-posta ile belirtilen alıcıya HTML formatında gönderir.

## Dosya/Kod Yapısı

Script, aşağıdaki adımları izleyerek çalışır:

### 1. `AdAccounts` Sheet'inden hesapları alır
- Sheet’te `Account Name` ve `Ad Account ID` başlıkları bulunmalıdır.
- Bu bilgiler, API çağrılarında kullanılır.

### 2. Dünkü ve bir önceki günün tarihlerini hesaplar

```javascript
const sinceYesterday = Utilities.formatDate(yesterday, "GMT", "yyyy-MM-dd");
const sinceDayBefore = Utilities.formatDate(dayBefore, "GMT", "yyyy-MM-dd");
```

### 3. API Üzerinden Event Sayılarını Çeker

```javascript
getActionCounts(adAccountId, since, until)
```

- Facebook Graph API kullanılarak `actions` metrikleri alınır.
- Takip edilen event’ler:
  - `Purchase`
  - `BeginCheckout`
  - `AddToCart`

### 4. Verileri Karşılaştırır ve Rapor Oluşturur
- % değişimler hesaplanır.
- Pozitif/negatif değişimlere göre renklendirme yapılır.
- Eksik eventler özel olarak gösterilir.

### 5. HTML Formatında Mail Gönderir

```javascript
MailApp.sendEmail({ ... })
```

- Alıcı e-posta adresi `EMAIL_RECEIVER` sabitinde tanımlanmalıdır.
- Konu ve içerik otomatik oluşturulur.

## Kurulum

1. Google Sheet oluşturun ve `AdAccounts` adında bir sayfa ekleyin.
2. İlk satıra `Account Name` ve `Ad Account ID` başlıklarını yazın.
3. Meta reklam hesap bilgilerini girin (örneğin `act_123456789`).
4. Script Editor'a kodu yapıştırın.
5. Aşağıdaki sabitleri güncelleyin:

```javascript
const ACCESS_TOKEN = 'BURAYA_TOKEN';
const EMAIL_RECEIVER = 'mail_adresinizi_buraya_girin@gmail.com';
```

## Gereksinimler

- Meta for Developers üzerinden uzun süreli `access_token` alınmış olmalı.
- Google Apps Script’te `UrlFetchApp` ve `MailApp` servislerine erişim izni verilmelidir.

## Ekstra Bilgiler

- Raporlar her gün çalışacak şekilde zamanlanabilir (`Triggers > Time-driven`).
- Renk kodlaması sayesinde kullanıcı, kampanya performansındaki değişimleri hızlıca görebilir.

## Örnek Mail Çıktısı

- Her hesap için ayrı kutucuk
- Event bazında adet ve % değişim
- Eksik event uyarıları ⚠️
- Tüm eventlerin gerçekleşmesi durumunda ✅ uyarısı

---

Bu script, Meta API ile tam entegre çalışır ve reklam yöneticilerinin günlük performans takibini kolaylaştırmayı hedefler.
