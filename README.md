# Smart Flight Companion - Uputstvo za pokretanje na lokalnoj masini

## 1. Preduslovi

- Docker i Docker Compose alati su instalirani.
- Portovi `80`, `443`, `9001` su slobodni na masini.
- Pozicionirani smo u root direktorijumu projekta.

## 2. Pokretanje aplikacije

### 2.1. (Opciono) Kreiranje image-e:

```bash
docker compose -f deploy/docker-compose.yml build
```

### 2.2. Podizanje okruzenja

#### 2.2.1. Prvo podizanje okruzenja

Potrebno je ispostovati proceduru prilikom prvog pokretanja kako bi svi servisi/baze bili ispravno inicijalizovani.

```bash
docker compose -f deploy/docker-compose.yml --profile init up --remove-orphans
```
#### 2.2.2. Drugo i svako naredno podizanje okruzenja

```bash
docker compose -f deploy/docker-compose.yml up --remove-orphans
```
#### 2.2.3 Podizanje razvojnog okruzenja

Razvojno okruzenje sadrzi dodatne alate/servise koji olaksavaju razvoj sistema.

```bash
docker compose -f deploy/docker-compose.yml --profile dev up --remove-orphans
```

### 2.3. Pristup aplikaciji:

- Web aplikacija: `https://localhost`
- Web servisi `https://localhost/api`

### 2.4. Zaustavljanje okruzenja:

```bash
docker compose -f deploy/docker-compose.yml down
```

## 3. Inicijalizacija baza podataka

Baze podataka su inicijalizovane prilikom prvog pokretanja okruzenja.
Inicijalno podizanje okruzenja pokrece dodatne kontejnere koji izvrsavaju migracije i dodaju inicijalne podatke u bazu.

## 4. Mail server (SMTP) konfiguracija

SMTP podesavanja su u `backend/config/.env` fajlu:

Smtp__Username=zeljkotripic13@gmail.com
Smtp__Password=ntnbkwkmvyytxssi

Podrazumijevane vrijednosti host/port/SSL podesavanja su u
`backend/src/web-services.Api/appsettings.Development.json` fajlu.

## 5. API kljucevi

### 5.1. Interni API kljuc za komunikaciju izmedju web servisa i servisa za placanje

U fajlovima `backend/config/.env` i `payment-gateway/config/.env` podesena je vrijednost kljuca koji omogucava medju-servisnu komunikaciju:
- `PaymentGateway__ApiKey=dev-backend-api-key`

Dodatno, u istim fajlovima podesena je vrijednost tajnog kljuca kojim je enkriptovana potvrda koju salje servis za placanje:
- `PaymentGateway__CallbackSecret=secret`

### 5.2. Korisnicki API kljucevi za pristup "javnim" servisima sistema

Za pristup "javnim" servisima sistema potrebno je imati API kljuc. API kljuc se generise kroz administratorsku konzolu web aplikacije.

### 5.3. Eksterni API kljucevi

Za konzumaciju eksternih web servisa od strane web servisa aplikacije nisu potrebni dodatni API kljucevi.

## 6. Pristup MinIO konzoli

- MinIO konzola: `http://localhost:9001`
- korisnicko ime: admin
- lozinka: password

## 7. Pristup klijentskoj PostgreSQL GUI konzoli

- pgAdmin konzola: `http://localhost:81`
- email: zeljkotripic13@gmail.com
- lozinka: secret

Konfiguracija konekcije ka serveru:
- server host: database
- server port: 5432
- korisnicko ime: postgres
- lozinka: secret
