# sports-pickup-games
# Sports Pickup Games 🏀⚽🏐

**Sports Pickup Games** është një aplikacion mobil që u lejon përdoruesve të krijojnë dhe të bashkohen në ndeshje sportive (pickup games) si futboll, basketboll, volejboll, etj.  
Qëllimi i aplikacionit është të lehtësojë organizimin e lojërave sportive mes njerëzve në një vend dhe kohë të caktuar.

Ky projekt është zhvilluar si pjesë e një detyre akademike dhe fokusohet në ndërtimin e një aplikacioni mobil funksional duke përdorur teknologji moderne.

---

## 📱 Funksionalitetet kryesore

- Krijimi i ndeshjeve sportive (sporti, vendi, data dhe ora)
- Shfaqja e ndeshjeve në listë kronologjike
- Bashkimi i përdoruesve në ndeshje ekzistuese
- Ruajtja e të dhënave në databazë përmes Supabase
- Autentikim bazik i përdoruesve
- Aplikacion funksional në pajisje reale dhe emulator

---

## 🛠 Teknologjitë e përdorura

- **React Native**
- **Expo / Expo Snack**
- **Supabase (Database & Auth)**
- **JavaScript**
- **Visual Studio Code**
- **Git & GitHub**

---

## 🗂 Struktura e projektit

- `/app` – ekranet kryesore të aplikacionit (login, register, create game, game details, etj.)
- `/lib/supabase.js` – konfigurimi dhe lidhja me Supabase
- `/contexts` – menaxhimi i autentikimit dhe state-it
- `/assets` – resurset vizuale
- `AI-log.txt` – dokumentimi i përdorimit të AI
- `README.md` – dokumentimi i projektit

---

## ⚙️ Si të ekzekutohet projekti

### 1. Klonimi i projektit
```bash
git clone https://github.com/USERNAME/sports-pickup-games.git
cd sports-pickup-games

2. Instalimi i varësive
npm install

3. Konfigurimi i Supabase

Krijova një projekt në Supabase

Krijova tabelën games me fushat:

id

sport

place

dt

created_by

Vendosa SUPABASE_URL dhe SUPABASE_ANON_KEY në file-in .env

4. Nisja e aplikacionit
npx expo start


Aplikacioni mund të hapet në emulator ose në pajisje reale duke përdorur Expo Go.

🤖 Përdorimi i Inteligjencës Artificiale

Gjatë zhvillimit të këtij projekti është përdorur inteligjenca artificiale si mjet ndihmës për:

shpjegime hap-pas-hapi

kuptimin e gabimeve

sqarimin e strukturës së projektit

Detajet e plota janë të dokumentuara në file-in AI-log.txt.
I gjithë kodi është shkruar, testuar dhe modifikuar nga unë.

👤 Autori

Qefser Karpuzi
Student në Computer Science / Software Engineering
GitHub: https://github.com/qkarpuzi

📌 Shënim

Ky projekt është zhvilluar për qëllime edukative dhe demonstron aftësitë bazë në zhvillimin e aplikacioneve mobile duke përdorur React Native dhe Supabase.