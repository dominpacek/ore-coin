# Prosta kryptowaluta Ore Coin
Projekt na kurs 1DI2245 - Kryptografia stosowana.

## Etapy i wymagania

### 1. Sieć peer-to-peer i bezpieczny portfel (termin oddania: 25.10.2024)
- [x] Założenie repo
- [x] **Węzły**
    - [x] Uruchomienie sieci  
    - [x] Podłączenie do sieci
    - [x] Aktualizowanie listy peerów
    - [x] Rozgłaszanie wiadomości
- [ ] **Tożsamości cyfrowe**
    - [ ] Generowanie par kluczy
- [ ] **Cyfrowy portfel**
    - [ ] Przechowywanie kluczy
    - [ ] Zabezpieczenie klucza sekretnego
- [x] Funkcje
    - [x] init (utworzenie węzła 0)
    - [x] join (podłączenie do istniejącego węzła)
    - [x] broadcast
    - [ ] create_id
    - [ ] store_id (secure)

Program może działać na 1 komputerze, wystarczy, że węzły będą słuchały na różnych portach.  
Przewidzieć ewentualność wypadnięcia 1 z węzłów z sieci.  

### 2. Prosty łańcuch bloków (termin oddania: 22.11.2024)

- Tworzenie bloków
- Jeden górnik
- Ustalenie protokołu wymiany danych

### 3. Transakcje przekazania środków (termin oddania: 13.12.2024)

- Tworzenie transakcji w formacie json (lista w bloku)
- Walidacja transakcji pod kątem double-spending
- Obliczanie aktualnych sald na kontach

### 4. Kopanie asynchroniczne (termin oddania: 10.01.2025)

- Obsługa forków oraz orphan block
- Tworzenie forków przez złośliwego node

### 5. Sprawozdanie końcowe (termin oddania: 24.01.2025)