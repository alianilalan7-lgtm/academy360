-- Expand exercises from 35 to 105 (5 categories x 7 exercises x 3 difficulties)
-- Per PDF spec: each category has 7 exercises per difficulty level

-- First, relax the order_number constraint to allow 1-21 (7 per difficulty)
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_order_number_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_order_number_check CHECK (order_number BETWEEN 1 AND 21);

-- ============================================================
-- WARMUP - currently has: easy(1,2), medium(3,4,5), hard(6,7)
-- Need: easy(3,4,5,6,7), medium(8,9,10,11), hard(8,9,10,11,12)
-- ============================================================
INSERT INTO exercises (category, difficulty, order_number, name, description, repetitions, duration_seconds, rest_seconds, sets, is_system) VALUES
-- Warmup Easy (5 more)
('warmup', 'easy', 3, 'Topuk Kıçı Koşusu', 'Yavaş tempoda topukları kalçaya vurarak koşu', NULL, 60, 20, 2, TRUE),
('warmup', 'easy', 4, 'Kol Çevirme', 'İleri ve geri kol dönüşleri ile üst vücut ısınması', 15, NULL, 15, 2, TRUE),
('warmup', 'easy', 5, 'Ayak Bileği Döndürme', 'Yerinde durarak ayak bileği rotasyonları', 10, NULL, 10, 2, TRUE),
('warmup', 'easy', 6, 'Yan Adım Yürüyüşü', 'Yana doğru geniş adımlarla yürüme', NULL, 60, 15, 2, TRUE),
('warmup', 'easy', 7, 'Omuz Germe Yürüyüşü', 'Kolları çapraz çekerek yürüme', NULL, 60, 15, 2, TRUE),
-- Warmup Medium (4 more)
('warmup', 'medium', 8, 'A-Skip', 'Yüksek diz kaldırma ile skip koşu', NULL, 60, 20, 3, TRUE),
('warmup', 'medium', 9, 'B-Skip', 'Bacak uzatmalı skip koşu', NULL, 60, 20, 3, TRUE),
('warmup', 'medium', 10, 'Sumo Squat Yürüyüşü', 'Geniş adım squat pozisyonunda ilerleme', 10, NULL, 20, 2, TRUE),
('warmup', 'medium', 11, 'İnchworm', 'Ayakta durarak elleri yere koyup plank pozisyonuna gitme', 6, NULL, 25, 2, TRUE),
-- Warmup Hard (5 more)
('warmup', 'hard', 8, 'Sprint Hazırlık Drili', 'Kısa mesafe patlayıcı koşular', 5, NULL, 40, 3, TRUE),
('warmup', 'hard', 9, 'Derinlik Sıçraması', 'Engelden atlayıp hemen tekrar sıçrama', 6, NULL, 40, 3, TRUE),
('warmup', 'hard', 10, 'Mountain Climber', 'Plank pozisyonunda hızlı diz çekme', 20, NULL, 30, 3, TRUE),
('warmup', 'hard', 11, 'Tabata Isınma', '20sn yüksek tempo - 10sn dinlenme döngüsü', NULL, 120, 30, 2, TRUE),
('warmup', 'hard', 12, 'Çoklu Yön Koşusu', 'İleri-geri-yan kombinasyonu hızlı koşu', NULL, 90, 30, 3, TRUE),

-- ============================================================
-- COORDINATION - currently has: easy(1,2), medium(3,4,5), hard(6,7)
-- ============================================================
-- Coordination Easy (5 more)
('coordination', 'easy', 3, 'Tek Ayak Denge', 'Sağ ve sol ayak üzerinde 30sn denge', NULL, 30, 15, 2, TRUE),
('coordination', 'easy', 4, 'Huni Dokunma', 'Öne dizili hunilere sırayla dokunma', 8, NULL, 15, 3, TRUE),
('coordination', 'easy', 5, 'Yıldız Adım', 'Sabit noktadan 4 yöne adım atıp dönme', 8, NULL, 20, 2, TRUE),
('coordination', 'easy', 6, 'El Çırpmalı Sıçrama', 'Sıçrayıp havada el çırpma', 10, NULL, 15, 3, TRUE),
('coordination', 'easy', 7, 'Çizgi Koşusu', 'Çizgi üzerinde düz koşu ile denge', NULL, 60, 15, 2, TRUE),
-- Coordination Medium (4 more)
('coordination', 'medium', 8, 'T-Drili', 'T şekli parkurda ileri-yan-geri koşu', 4, NULL, 35, 3, TRUE),
('coordination', 'medium', 9, 'Ali Shuffle', 'Hafif sıçrayarak ayak değiştirme drili', NULL, 45, 20, 3, TRUE),
('coordination', 'medium', 10, 'Huni Toplama', 'Koşarak hunileri toplayıp yerine koyma', 5, NULL, 30, 3, TRUE),
('coordination', 'medium', 11, 'Geri Koşu Drili', 'Arkaya koşarak engelleri geçme', NULL, 60, 25, 3, TRUE),
-- Coordination Hard (5 more)
('coordination', 'hard', 8, 'Merdiven Drili - İleri Geri', 'İleri girip geri çıkarak merdiven geçme', 5, NULL, 35, 3, TRUE),
('coordination', 'hard', 9, 'Çoklu Engel Parkuru', '5+ farklı engelden oluşan kombine parkur', 3, NULL, 60, 3, TRUE),
('coordination', 'hard', 10, 'Reaksiyon Topu', 'Yere atılan reaksiyon topunu yakalama', 10, NULL, 30, 3, TRUE),
('coordination', 'hard', 11, 'Denge Tahta Drili', 'Denge tahtası üzerinde çeşitli hareketler', NULL, 60, 30, 2, TRUE),
('coordination', 'hard', 12, 'Sıçrama Koordinasyonu', 'Farklı yükseklik ve yönlerde ardışık sıçramalar', 6, NULL, 40, 3, TRUE),

-- ============================================================
-- STRENGTH_AGILITY - currently has: easy(1,2), medium(3,4,5), hard(6,7)
-- ============================================================
-- Strength Easy (5 more)
('strength_agility', 'easy', 3, 'Glute Bridge', 'Sırt üstü yatarak kalça kaldırma', 12, NULL, 20, 3, TRUE),
('strength_agility', 'easy', 4, 'Wall Sit', 'Duvara yaslanarak sandalye pozisyonu', NULL, 30, 20, 3, TRUE),
('strength_agility', 'easy', 5, 'Superman', 'Yüzüstü yatarak kol ve bacak kaldırma', 10, NULL, 20, 3, TRUE),
('strength_agility', 'easy', 6, 'Baldır Kaldırma', 'Ayak parmak ucuna kalkma', 15, NULL, 15, 3, TRUE),
('strength_agility', 'easy', 7, 'Dead Bug', 'Sırt üstü karşılıklı kol-bacak uzatma', 10, NULL, 20, 3, TRUE),
-- Strength Medium (4 more)
('strength_agility', 'medium', 8, 'Tek Bacak Squat', 'Pistol squat hazırlığı - destekli', 6, NULL, 30, 3, TRUE),
('strength_agility', 'medium', 9, 'Dip', 'Bank veya basamak kullanarak triseps dip', 8, NULL, 30, 3, TRUE),
('strength_agility', 'medium', 10, 'Side Plank', 'Yan plank pozisyonunda kalça kaldırma', NULL, 30, 15, 3, TRUE),
('strength_agility', 'medium', 11, 'Jump Squat', 'Squat pozisyonundan patlayıcı sıçrama', 8, NULL, 30, 3, TRUE),
-- Strength Hard (5 more)
('strength_agility', 'hard', 8, 'Clap Push-up', 'Havada el çırpmalı şınav', 6, NULL, 40, 3, TRUE),
('strength_agility', 'hard', 9, 'Tuck Jump', 'Yerinde sıçrayarak dizleri göğüse çekme', 8, NULL, 35, 3, TRUE),
('strength_agility', 'hard', 10, 'Bear Crawl', 'Dört ayak pozisyonunda hızlı ilerleme', NULL, 45, 30, 3, TRUE),
('strength_agility', 'hard', 11, 'Pistol Squat', 'Tek bacak derin squat', 4, NULL, 40, 3, TRUE),
('strength_agility', 'hard', 12, 'Spider-Man Plank', 'Plank pozisyonunda dizleri dirseklere çekme', 8, NULL, 35, 3, TRUE),

-- ============================================================
-- BALL_WORK - currently has: easy(1,2), medium(3,4,5), hard(6,7)
-- ============================================================
-- Ball Easy (5 more)
('ball_work', 'easy', 3, 'Top Atışı - Göğüs', 'Çiftler halinde göğüs pası ile top atma', 10, NULL, 15, 3, TRUE),
('ball_work', 'easy', 4, 'Duvar Pası', 'Duvara pas atıp geri alma', 15, NULL, 10, 3, TRUE),
('ball_work', 'easy', 5, 'Yerden Top Sürme', 'Düz çizgide yavaş tempoda top sürme', NULL, 120, 30, 2, TRUE),
('ball_work', 'easy', 6, 'İç Ayak Pas', 'İç ayak ile kısa mesafe pas', 12, NULL, 15, 3, TRUE),
('ball_work', 'easy', 7, 'Top Fırlatma', 'Taç atışı tekniği ile top fırlatma', 8, NULL, 15, 3, TRUE),
-- Ball Medium (4 more)
('ball_work', 'medium', 8, 'Çalım Kombinasyonu', 'Makas + stepover kombinasyonu', 6, NULL, 30, 3, TRUE),
('ball_work', 'medium', 9, 'Baş ile Pas', 'Kafa ile yönlendirme ve pas çalışması', 8, NULL, 20, 3, TRUE),
('ball_work', 'medium', 10, 'Ters Ayak Çalışması', 'Zayıf ayak ile pas ve kontrol', 10, NULL, 20, 3, TRUE),
('ball_work', 'medium', 11, 'Oyun Alanı Kontrolü', 'Dar alanda 1v1 top koruma', NULL, 90, 30, 3, TRUE),
-- Ball Hard (5 more)
('ball_work', 'hard', 8, 'Vole Şut', 'Havadan gelen topa vole şut', 8, NULL, 30, 3, TRUE),
('ball_work', 'hard', 9, 'Uzun Çapraz Pas', '30m+ çapraz uzun pas çalışması', 8, NULL, 25, 3, TRUE),
('ball_work', 'hard', 10, 'Dribbling Yarışı', '2 kişilik top sürme yarışması', 5, NULL, 35, 3, TRUE),
('ball_work', 'hard', 11, 'Rabona ve Özel Teknikler', 'Rabona, trivela gibi özel şut teknikleri', 6, NULL, 35, 3, TRUE),
('ball_work', 'hard', 12, 'Oyun Simülasyonu', 'Gerçek maç senaryolarında karar verme + uygulama', 3, NULL, 60, 2, TRUE),

-- ============================================================
-- COOLDOWN - currently has: easy(1,2), medium(3,4,5), hard(6,7)
-- ============================================================
-- Cooldown Easy (5 more)
('cooldown', 'easy', 3, 'Boyun Germe', 'Sağa-sola-öne boyun esnetme', NULL, 30, 10, 2, TRUE),
('cooldown', 'easy', 4, 'Omuz Germe', 'Kolu karşı tarafa çekerek omuz esnetme', NULL, 30, 10, 2, TRUE),
('cooldown', 'easy', 5, 'Bilek Döndürme', 'El ve ayak bileği rotasyonları', NULL, 30, 10, 2, TRUE),
('cooldown', 'easy', 6, 'Derin Nefes', 'Kontrollü nefes alma ve verme egzersizi', NULL, 60, 0, 1, TRUE),
('cooldown', 'easy', 7, 'Hafif Yürüyüş', 'Sakinleşme amaçlı yavaş yürüyüş', NULL, 120, 0, 1, TRUE),
-- Cooldown Medium (4 more)
('cooldown', 'medium', 8, 'Kelebek Germe', 'Oturarak ayak tabanlarını birleştirip öne eğilme', NULL, 30, 10, 2, TRUE),
('cooldown', 'medium', 9, 'Pigeon Stretch', 'Güvercin pozu ile kalça açma', NULL, 30, 15, 2, TRUE),
('cooldown', 'medium', 10, 'Oturarak Öne Eğilme', 'Bacaklar düz uzatılmış, öne eğilme', NULL, 30, 10, 2, TRUE),
('cooldown', 'medium', 11, 'Triceps Germe', 'Kolu başın arkasına çekerek esnetme', NULL, 30, 10, 2, TRUE),
-- Cooldown Hard (5 more)
('cooldown', 'hard', 8, 'PNF Germe', 'Eşli PNF esnetme teknikleri', NULL, 45, 15, 2, TRUE),
('cooldown', 'hard', 9, 'Derin Hamstring Germe', 'Bacağı yukarı kaldırarak derin hamstring esnetme', NULL, 40, 15, 2, TRUE),
('cooldown', 'hard', 10, 'Bel ve Kalça Mobilizasyonu', 'Yerde yatarak bel ve kalça mobilite çalışması', NULL, 45, 15, 2, TRUE),
('cooldown', 'hard', 11, 'Tam Vücut Esneme Serisi', 'Baş-ayak tüm kas gruplarını kapsayan germe serisi', NULL, 120, 0, 1, TRUE),
('cooldown', 'hard', 12, 'Meditasyon ve Gevşeme', 'Göz kapalı nefes odaklı zihinsel toparlanma', NULL, 180, 0, 1, TRUE);
