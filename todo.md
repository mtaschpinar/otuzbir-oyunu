# 31 Oyunu - Proje TODO

## Mobil Veri / SSL
- [x] LTE/mobil veri SSL sorununu teşhis et (DNS propagation / platform SSL)
- [x] Kullanıcıya durumu bildir veya alternatif çöz

## Yeni Oyun Mantığı (v2)
- [x] Söylenen (sayısı bilinen) kişi KAZANIR ve izleyiciye geçer
- [x] En son kalan tek kişi KAYBEDER (ceza alır)
- [x] Diğer herkes kazanmış sayılır
- [x] Sayı geçmişi: kim hangi sayıları söyledi (oyun sonunda görünür)

## Sesli Anonslar (v2)
- [x] Sayısı söylenen kişi: "[İsim] götü kurtardı!"
- [x] Sıra anonsu: "[İsim] sıra sende kardeş!"
- [x] Kaybeden anonsu: "[İsim] battı! Herkes rahat, ceza bu arkadaşta!"
- [x] "Bu sayı kimsede yok" anonsu korunur

## Yeni Etkileşim Özellikleri
- [x] Emoji reaksiyonlar (😂😭🔥💀) - oyun sırasında gönderme
- [x] Emoji yağmuru (biri kurtulduğunda/elendiğinde)
- [x] Sohbet baloncukları (kısa mesajlar / trash talk)
- [x] Süre baskısı: 15-20 sn geri sayım, süre dolunca otomatik rastgele sayı
- [x] Titreşim/Haptic (sıra geldiğinde, biri kurtulduğunda)
- [x] Arka plan gerilim müziği (son 2 kişide tempo artar)
- [x] Konfeti efekti (kurtulanlar için)

## Kaybeden Ekranı
- [x] Büyük "CEZA SENİN!" yazısı
- [x] Yanıp sönen kırmızı arka plan / dikkat çekici animasyon

## Test & Deploy
- [x] Vitest birim testleri güncelle (22 test geçti)
- [x] Canlı test (2 oyuncu, uçtan uca doğrulandı)
- [x] Deploy (public, always-on)
