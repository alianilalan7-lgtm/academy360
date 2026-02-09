# 🔗 Paneller Arası Veri Akışı

Academy360 uygulamasındaki 3 panel arasındaki veri bağlantıları.

---

## 📊 Genel Bakış

| Panel | Rol | Temel İşlev |
|-------|-----|-------------|
| 👨‍🏫 **Antrenör** | Veri GİRER | Plan, program, puan, not |
| 🏃 **Sporcu** | Veri GÖRÜR + Aksiyon ALIR | İlerleme görür, egzersiz yapar |
| 👨‍👩‍👧 **Veli** | Sadece GÖRÜR | Çocuk raporu izler |

---

## 🏃 SPORCU PANELİ ALANLARI

| Sporcu Paneli Alanı | Boşsa Sebebi | Dolması İçin | Antrenör Sayfası |
|---------------------|--------------|--------------|------------------|
| **Bugünün Planı** | Plan oluşturulmadı | Antrenör haftalık plan oluşturup gruba atar | `/weekly-plan` |
| **Programlarım** | Program atanmadı | Antrenör program seçip sporcuya atar | `/programs` |
| **Beceri Radar** | Puan verilmedi | Antrenör beceri puanı girer | `/players/[id]` |
| **Seviye/XP** | Aktivite yok | Sporcu egzersiz tamamlar + Antrenör onaylar | `/sessions/[id]` |
| **Son Başarımlar** | XP kazanılmadı | Egzersiz/seans tamamlandıkça otomatik | (Otomatik) |
| **Seri 🔥** | Günlük aktivite yok | Her gün en az 1 aktivite | (Sporcu aksiyonu) |
| **Grup Bilgisi** | Gruba eklenmedi | Antrenör sporcuyu gruba ekler | `/groups` |

---

## 👨‍👩‍👧 VELİ PANELİ ALANLARI

| Veli Paneli Alanı | Kaynak | Dolması İçin |
|-------------------|--------|--------------|
| **Çocuk İlerlemesi** | Sporcu aktiviteleri + Antrenör puanları | Sporcu egzersiz yapar |
| **Haftalık Rapor** | Haftalık plan + Sporcu aktivitesi | Antrenör plan oluşturur |
| **Antrenör Notları** | Seans notları | Antrenör seans sonrası not yazar |

---

## 👨‍🏫 ANTRENÖR PANEL ERİŞİM NOKTALARI

| Sayfa | İşlem | Etkisi |
|-------|-------|--------|
| `/groups` | Grup oluştur, sporcu ekle | Sporcu grubunu görür |
| `/weekly-plan` | Haftalık plan oluştur | Sporcu günlük planı görür |
| `/programs` | Program oluştur ve ata | Sporcu programları görür |
| `/players/[id]` | Beceri puanla | Sporcu radar chart'ı güncellenir |
| `/sessions/[id]` | Seans notu yaz, katılım onayla | Sporcu XP kazanır, veli notu görür |

---

## � VERİ AKIŞ ÖZETİ

| Kaynak | Hedef | Akan Veri |
|--------|-------|-----------|
| Antrenör → Sporcu | Plan, program, beceri puanı |
| Antrenör → Veli | Seans notları, değerlendirmeler |
| Sporcu → Sporcu | Kendi aktiviteleri (XP, streak) |
| Sporcu → Veli | İlerleme durumu, tamamlanan aktiviteler |
| Sistem → Herkese | Başarımlar, seviye, rozetler |

---

## 🔑 TERİMLER

| Terim | Açıklama |
|-------|----------|
| **Endpoint** | API'nin URL adresi (teknik) |
| **Veri Akışı** | Paneller arası bilgi transferi |
| **Panel** | Kullanıcı tipine özel arayüz |
