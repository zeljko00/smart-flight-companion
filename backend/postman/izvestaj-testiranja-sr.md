# Izvestaj testiranja REST API-a

## 01 - Registration, Login & Authorization
- "Register Test User": Testiramo kreiranje novog korisnika. Vazno je postaviti userUsername na vrijednost koja ne postoji u bazi podataka.
- "Login User": Testiramo prijavu postojeceg korisnika. Ukoliko admin nije prethodno autorizovao korisnika, zahtjev ce biti odbijen. Moze se iskoristiti userUsername koristen prilikom kreiranja novog korisnika.
- "Login Admin": Testiramo prijavu administratora. Preduslov je postojanje administratorskog naloga.
- "Refresh Access Token": Testiramo izdavanje novog access tokena preko refresh tokena. Potrebno je da refreshToken postoji u cookie vrijednosti sfc_refresh_token. Refresh token se dobija u odgovoru na uspjesan login zahtjev.
- "Authorize User (Admin)": Testiramo autorizaciju registrovanog korisnika. Potrebni su adminAccessToken (iz "Login Admin") i regularUserId (iz odgovora "Register Test User").
- "Create API Key (Admin)": Testiramo kreiranje API kljuca od strane administratora. Potreban je adminAccessToken iz "Login Admin". Dobijeni kljuc sacuvati u apiKey.

## 02 - Authorization Scenarios
- "No auth on protected endpoint (Api key or JWT)": Testiramo da pristup zasticenom endpoint-u bez autentifikacije bude odbijen.
- "API key on JWT protected endpoint": Testiramo pristup endpoint-u preko API kljuca. Potreban je apiKey iz "Create API Key (Admin)" ili unaprijed postavljena vrijednost.
- "Wrong API key on API key protected endpoint": Testiramo da neispravan API kljuc bude odbijen.
- "User JWT on admin endpoint": Testiramo da korisnicki token ne moze pristupiti admin endpoint-u. Potreban je userAccessToken iz "Login User".
- "Wrong JWT on admin endpoint": Testiramo da neispravan JWT bude odbijen.

## 03 - Airports
- "Get all airports": Testiramo listanje svih aerodroma preko API kljuca. Potreban je apiKey iz "Create API Key (Admin)".
- "Search airports": Testiramo pretragu aerodroma po upitu. Potreban je apiKey iz "Create API Key (Admin)".
- "Get airport by id (admin)": Testiramo dohvatanje konkretnog aerodroma po ID-u za admina. Potrebni su adminAccessToken (iz "Login Admin") i airportId (iz odgovora "Create airport (admin)").
- "Create airport (admin)": Testiramo kreiranje novog aerodroma. Potrebno je da newAirportIata ima jedinstvenu vrijednost.

## 04 - Flights
- "Get all flights": Testiramo listanje letova preko API kljuca. Potreban je apiKey iz "Create API Key (Admin)".
- "Search flights": Testiramo pretragu letova po broju leta. Potreban je apiKey iz "Create API Key (Admin)".
- "Get flight by id": Testiramo dohvatanje leta po ID-u. Potrebni su apiKey i flightId (iz odgovora "Create flight (admin)").
- "Create flight (admin)": Testiramo kreiranje novog leta od strane administratora. Potrebni su adminAccessToken iz "Login Admin". Neophodno je da newFlightNumber ima jedinstvenu vrijednost.
- "Update flight (admin)": Testiramo izmjenu postojeceg leta. Potrebni su adminAccessToken ("Login Admin"), flightId ("Create flight (admin)") i newFlightNumber.
- "Get comments by flight": Testiramo listanje komentara za let. Potrebni su userAccessToken iz "Login User" i flightId iz "Create flight (admin)".
- "Create boarding pass payment session": Testiramo kreiranje payment sesije za kupovinu boarding passa. Potrebni su userAccessToken iz "Login User" i flightId iz "Create flight (admin)". Seat mora biti enum broj (0=Economy, 1=PremiumEconomy, 2=Business, 3=FirstClass).
- "Get boarding guides by flight": Testiramo dohvatanje boarding guide podataka za let. Potrebni su userAccessToken i flightId.
- "Create boarding guide (admin)": Testiramo kreiranje boarding guide zapisa od strane administratora. Potrebni su adminAccessToken i flightId.

## 05 - Comments
- "Get all comments (admin)": Testiramo admin pregled svih komentara. Potreban je adminAccessToken iz "Login Admin".
- "Create comment": Testiramo kreiranje komentara za let. Potrebni su userAccessToken iz "Login User" i flightId iz "Create flight (admin)".
- "Delete comment (admin)": Testiramo brisanje komentara od strane administratora. Potrebni su adminAccessToken iz "Login Admin" i commentId iz odgovora "Create comment".

## 06 - Users
- "Get my boarding passes": Testiramo pregled boarding pass-ova prijavljenog korisnika. Potreban je userAccessToken iz "Login User".
- "Get my boarding pass PDF": Testiramo preuzimanje PDF boarding passa. Potrebni su userAccessToken i boardingPassId (iz "Get my boarding passes").
- "Logout current user": Testiramo odjavu trenutnog korisnika. Potreban je userAccessToken iz "Login User".
- "Get active users count (admin)": Testiramo admin uvid u broj aktivnih korisnika. Potreban je adminAccessToken iz "Login Admin".
- "Get users activity (admin)": Testiramo admin pregled aktivnosti korisnika u periodu. Potreban je adminAccessToken iz "Login Admin".
- "Reset user password (admin)": Testiramo reset lozinke korisnika od strane administratora. Potrebni su adminAccessToken i regularUserId (iz "Register Test User" ili iz liste korisnika).
- "Block user (admin)": Testiramo blokiranje korisnika od strane administratora. Potrebni su adminAccessToken i regularUserId (iz "Register Test User" ili iz liste korisnika).

## 07 - News & Weather
- "Get latest news": Testiramo dohvatanje najnovijih vijesti za prijavljenog korisnika. Potreban je userAccessToken iz "Login User".
- "Get weather destination forecast": Testiramo dohvatanje vremenske prognoze za destinaciju. Potreban je userAccessToken iz "Login User".

## 08 - Request Logs
- "Get paged logs (admin)": Testiramo pregled request logova. Potreban je adminAccessToken iz "Login Admin".
- "Get logs PDF (admin)": Testiramo izvoz logova u PDF formatu. Potreban je adminAccessToken iz "Login Admin".
