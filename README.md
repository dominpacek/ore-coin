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
- [x] **Tożsamości cyfrowe**
    - [x] Generowanie par kluczy
- [x] **Cyfrowy portfel**
    - [x] Przechowywanie kluczy
    - [x] Zabezpieczenie klucza sekretnego
- [x] Funkcjonalności
    - [x] init (utworzenie węzła 0)
    - [x] join (podłączenie do istniejącego węzła)
    - [x] broadcast (rozsyłanie wiadomości)
    - [x] create_id (generacja pary kluczy)
    - [x] save_id_secure (zapisanie kluczy w portfelu zabezpieczonym hasłem)

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


## Blockchain
Klasa przedstawiająca Blockchain.
### Konstruktor
`constructor(genesisBlock: Block | undefined, difficulty: number = 4, reward: number = 10)`
- genesisBlock - pierwszy blok
- difficulty - poziom trudności kopania bloku (ile musi być zer w haszu)
- reward - ile OreConiów otrzymuje kopacz za wykopanie bloku

### Właściwości
`blocks: Block[]`
Wszystkie bloki blockchain'u

### Metoda **mineBlock**
`mineBlock()`
Rozpoczęcie operacji kopania kolejnego bloku w blockchainie.

### Metoda **saveBlockChain**
`saveBlockChain(path:string)`
Zapis blockchain'u w postaci JSON do pliku.
- path - ścieżka do pliku

### Metoda **fromJson**
`static fromJson(json: string): Blockchain`
Odczyt blockchain'u z pliku.
- path - ścieżka do odczytywanego pliku
Zwraca:
- Blockchain

## Block
### Konstruktor
`constructor(timestamp: number, transactions: Transaction[], previousHash = '', index = 0)`
- timestamp
- transactions
- index - numer kolejnego bloku (w blockchainie)

### Właściwości
`index: number` - numer kolejnego bloku (w blockchainie)

`previousHash: string` - hash poprzedniego bloku

`timestamp: number`

`transactions: Transaction[]`

`nonce: number`

`hash: string`

### Metoda toHash
`toHash()`
Zwraca hasz SHA256 wartości: index, previousHash, transactions, nonce, hash

### Metoda mine
`mine(difficulty: number)`
Kopanie bloku. Szukanie takiej wartości nonce, by hasz (`toHash()`) bloku rozpoczynał się określoną ilością zer.
- difficulty - liczba, ile zer szukamy