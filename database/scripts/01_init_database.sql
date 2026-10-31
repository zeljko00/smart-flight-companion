-- This file is executed by Postgres only on first container startup when the data directory is empty.

\getenv app_database APP_DB
\getenv app_username APP_ACC_USERNAME
\getenv app_password APP_ACC_PASSWORD

\if :{?app_username}
\else
\echo 'APP_ACC_USERNAME is required for init script.'
\quit 1
\endif

\if :{?app_password}
\else
\echo 'APP_ACC_PASSWORD is required for init script.'
\quit 1
\endif

\if :{?app_database}
\else
\echo 'APP_DB is required for init script.'
\quit 1
\endif

CREATE EXTENSION IF NOT EXISTS pgcrypto;

SELECT format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'app_username', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_username')
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'app_database', :'app_username')
\gexec

SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', :'app_username')
\gexec

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_username')
\gexec

SELECT format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'app_username')
\gexec

WITH airport_seed (iata, name, city, country, address, latitude, longitude, description) AS (
    VALUES
        ('JFK', 'John F. Kennedy International Airport', 'New York', 'USA', 'Queens, NY 11430', 40.6413, -73.7781, 'Major international hub serving New York City.'),
        ('LAX', 'Los Angeles International Airport', 'Los Angeles', 'USA', '1 World Way, Los Angeles, CA 90045', 33.9416, -118.4085, 'Primary international gateway for Southern California.'),
        ('ORD', 'O''Hare International Airport', 'Chicago', 'USA', '10000 W O''Hare Ave, Chicago, IL 60666', 41.9742, -87.9073, 'One of the busiest airports in North America.'),
        ('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'USA', '6000 N Terminal Pkwy, Atlanta, GA 30320', 33.6407, -84.4277, 'Global connection hub in the southeastern United States.'),
        ('DFW', 'Dallas Fort Worth International Airport', 'Dallas', 'USA', '2400 Aviation Dr, DFW Airport, TX 75261', 32.8998, -97.0403, 'Large central US transfer hub.'),
        ('DEN', 'Denver International Airport', 'Denver', 'USA', '8500 Pena Blvd, Denver, CO 80249', 39.8561, -104.6737, 'Rocky Mountain region international gateway.'),
        ('SFO', 'San Francisco International Airport', 'San Francisco', 'USA', 'San Francisco, CA 94128', 37.6213, -122.3790, 'Major Pacific and transcontinental gateway.'),
        ('SEA', 'Seattle-Tacoma International Airport', 'Seattle', 'USA', '17801 International Blvd, Seattle, WA 98158', 47.4502, -122.3088, 'Primary airport for the Pacific Northwest.'),
        ('MIA', 'Miami International Airport', 'Miami', 'USA', '2100 NW 42nd Ave, Miami, FL 33126', 25.7959, -80.2870, 'Key gateway between North and Latin America.'),
        ('BOS', 'Logan International Airport', 'Boston', 'USA', 'East Boston, MA 02128', 42.3656, -71.0096, 'Major New England international airport.'),
        ('YYZ', 'Toronto Pearson International Airport', 'Toronto', 'Canada', '6301 Silver Dart Dr, Mississauga, ON L5P 1B2', 43.6777, -79.6248, 'Canada''s busiest airport.'),
        ('YVR', 'Vancouver International Airport', 'Vancouver', 'Canada', '3211 Grant McConachie Way, Richmond, BC V7B 0A4', 49.1967, -123.1815, 'Main west coast airport in Canada.'),
        ('YUL', 'Montreal-Trudeau International Airport', 'Montreal', 'Canada', '975 Romeo-Vachon Blvd N, Dorval, QC H4Y 1H1', 45.4706, -73.7408, 'International gateway for Quebec.'),
        ('MEX', 'Mexico City International Airport', 'Mexico City', 'Mexico', 'Av. Capitan Carlos Leon S/N, CDMX', 19.4361, -99.0719, 'Primary international airport in Mexico City.'),
        ('GRU', 'Sao Paulo-Guarulhos International Airport', 'Sao Paulo', 'Brazil', 'Rod. Helio Smidt, Guarulhos - SP', -23.4356, -46.4731, 'Largest airport in Brazil by passenger traffic.'),
        ('EZE', 'Ministro Pistarini International Airport', 'Buenos Aires', 'Argentina', 'Au Ezeiza - Canuelas Km 33.5, Ezeiza', -34.8222, -58.5358, 'Major international airport serving Buenos Aires.'),
        ('LHR', 'Heathrow Airport', 'London', 'UK', 'Longford TW6, United Kingdom', 51.4700, -0.4543, 'The United Kingdom''s primary international hub.'),
        ('LGW', 'Gatwick Airport', 'London', 'UK', 'Horley, Gatwick RH6 0NP, United Kingdom', 51.1537, -0.1821, 'Second-largest international airport in the UK.'),
        ('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', '95700 Roissy-en-France, France', 49.0097, 2.5479, 'France''s largest airport and Paris international hub.'),
        ('AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 'Evert van de Beekstraat 202, 1118 CP Schiphol', 52.3105, 4.7683, 'Major European intercontinental connection point.'),
        ('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', '60547 Frankfurt, Germany', 50.0379, 8.5622, 'Germany''s largest aviation hub.'),
        ('MUC', 'Munich Airport', 'Munich', 'Germany', 'Nordallee 25, 85356 Munchen-Flughafen', 48.3538, 11.7861, 'Modern international airport in Bavaria.'),
        ('MAD', 'Adolfo Suarez Madrid-Barajas Airport', 'Madrid', 'Spain', 'Av de la Hispanidad, s/n, 28042 Madrid', 40.4983, -3.5676, 'Main airport serving Spain''s capital.'),
        ('BCN', 'Barcelona-El Prat Airport', 'Barcelona', 'Spain', '08820 El Prat de Llobregat, Barcelona', 41.2974, 2.0833, 'Primary airport for Catalonia.'),
        ('FCO', 'Leonardo da Vinci-Fiumicino Airport', 'Rome', 'Italy', 'Via dell''Aeroporto di Fiumicino 320, Rome', 41.8003, 12.2389, 'Italy''s busiest airport by passenger traffic.'),
        ('ZRH', 'Zurich Airport', 'Zurich', 'Switzerland', '8058 Zurich Airport, Switzerland', 47.4581, 8.5555, 'Main international airport in Switzerland.'),
        ('VIE', 'Vienna International Airport', 'Vienna', 'Austria', '1300 Schwechat, Austria', 48.1103, 16.5697, 'International gateway to Austria and Central Europe.'),
        ('CPH', 'Copenhagen Airport', 'Copenhagen', 'Denmark', 'Lufthavnsboulevarden 6, 2770 Kastrup', 55.6180, 12.6560, 'Largest airport in the Nordic region.'),
        ('ARN', 'Stockholm Arlanda Airport', 'Stockholm', 'Sweden', '190 45 Stockholm-Arlanda, Sweden', 59.6519, 17.9186, 'Main international airport serving Sweden.'),
        ('OSL', 'Oslo Airport', 'Oslo', 'Norway', 'Edvard Munchs veg, 2061 Gardermoen', 60.1939, 11.1004, 'Norway''s principal international airport.'),
        ('HEL', 'Helsinki Airport', 'Helsinki', 'Finland', 'Lentoasemantie 1, 01530 Vantaa', 60.3172, 24.9633, 'Key northern Europe transfer airport.'),
        ('DUB', 'Dublin Airport', 'Dublin', 'Ireland', 'Dublin Airport, Co. Dublin, Ireland', 53.4213, -6.2701, 'Ireland''s busiest airport.'),
        ('IST', 'Istanbul Airport', 'Istanbul', 'Turkey', 'Arnavutkoy, Istanbul, Turkiye', 41.2753, 28.7519, 'Major transcontinental hub linking Europe and Asia.'),
        ('DXB', 'Dubai International Airport', 'Dubai', 'UAE', 'Al Garhoud, Dubai, UAE', 25.2532, 55.3657, 'One of the world''s busiest long-haul hubs.'),
        ('DOH', 'Hamad International Airport', 'Doha', 'Qatar', 'Doha, Qatar', 25.2731, 51.6080, 'Flagship global hub in the Gulf region.'),
        ('AUH', 'Zayed International Airport', 'Abu Dhabi', 'UAE', 'Abu Dhabi, UAE', 24.4330, 54.6511, 'International airport serving Abu Dhabi.'),
        ('DEL', 'Indira Gandhi International Airport', 'Delhi', 'India', 'New Delhi, Delhi 110037, India', 28.5562, 77.1000, 'India''s busiest airport by passenger volume.'),
        ('BOM', 'Chhatrapati Shivaji Maharaj International Airport', 'Mumbai', 'India', 'Santacruz, Mumbai, Maharashtra', 19.0896, 72.8656, 'Main international airport in Mumbai.'),
        ('SIN', 'Singapore Changi Airport', 'Singapore', 'Singapore', 'Airport Blvd, Singapore 819642', 1.3644, 103.9915, 'Award-winning global aviation hub.'),
        ('KUL', 'Kuala Lumpur International Airport', 'Kuala Lumpur', 'Malaysia', '64000 Sepang, Selangor, Malaysia', 2.7456, 101.7072, 'Primary airport in Malaysia.'),
        ('BKK', 'Suvarnabhumi Airport', 'Bangkok', 'Thailand', '999 Bang Na-Trat Rd, Samut Prakan', 13.6900, 100.7501, 'Thailand''s main international airport.'),
        ('CGK', 'Soekarno-Hatta International Airport', 'Jakarta', 'Indonesia', 'Benda, Tangerang City, Banten', -6.1256, 106.6559, 'Main international gateway to Indonesia.'),
        ('HND', 'Haneda Airport', 'Tokyo', 'Japan', 'Hanedakuko, Ota City, Tokyo', 35.5494, 139.7798, 'Primary domestic and growing international airport in Tokyo.'),
        ('NRT', 'Narita International Airport', 'Tokyo', 'Japan', '1-1 Furugome, Narita, Chiba', 35.7719, 140.3929, 'Major long-haul international airport near Tokyo.'),
        ('ICN', 'Incheon International Airport', 'Seoul', 'South Korea', '272 Gonghang-ro, Jung-gu, Incheon', 37.4602, 126.4407, 'Korea''s primary international airport.'),
        ('PEK', 'Beijing Capital International Airport', 'Beijing', 'China', 'Shunyi District, Beijing, China', 40.0799, 116.6031, 'Major airport serving China''s capital region.'),
        ('PVG', 'Shanghai Pudong International Airport', 'Shanghai', 'China', 'Pudong, Shanghai, China', 31.1443, 121.8083, 'Primary international airport in Shanghai.'),
        ('SYD', 'Sydney Kingsford Smith Airport', 'Sydney', 'Australia', 'Mascot NSW 2020, Australia', -33.9399, 151.1753, 'Australia''s busiest international gateway.'),
        ('MEL', 'Melbourne Airport', 'Melbourne', 'Australia', 'Arrival Dr, Melbourne Airport VIC 3045', -37.6690, 144.8410, 'Main airport for Melbourne and Victoria.'),
        ('AKL', 'Auckland Airport', 'Auckland', 'New Zealand', 'Ray Emery Dr, Mangere, Auckland', -37.0082, 174.7850, 'Largest airport in New Zealand.'),
)
INSERT INTO "Airports" ("Id", "Name", "IATA", "City", "Country", "Address", "Latitude", "Longitude", "Description")
SELECT
    gen_random_uuid(),
    seed.name,
    seed.iata,
    seed.city,
    seed.country,
    seed.address,
    seed.latitude,
    seed.longitude,
    seed.description
FROM airport_seed AS seed
ON CONFLICT ("IATA") DO NOTHING;

WITH ordered_airports AS (
    SELECT "Id", ROW_NUMBER() OVER (ORDER BY "IATA") AS rn
    FROM "Airports"
),
series AS (
    SELECT generate_series(1, 50) AS n
),
flight_pairs AS (
    SELECT
        s.n,
        dep."Id" AS departure_airport_id,
        arr."Id" AS arrival_airport_id,
        NOW() + make_interval(days => (1 + s.n / 2), hours => ((s.n * 3) % 24)) AS scheduled_departure,
        2 + (s.n % 11) AS duration_hours
    FROM series s
    JOIN ordered_airports dep ON dep.rn = ((s.n - 1) % 50) + 1
    JOIN ordered_airports arr ON arr.rn = ((s.n + 16) % 50) + 1
)
INSERT INTO "Flights" (
    "Id",
    "FlightNumber",
    "DepartureAirportId",
    "ArrivalAirportId",
    "Status",
    "Terminal",
    "Gate",
    "Airline",
    "Aircraft",
    "SeatCapacity",
    "ScheduledDepartureTime",
    "ScheduledArrivalTime",
    "DepartureTime",
    "ArrivalTime",
    "EconomyPrice",
    "PremiumEconomyPrice",
    "BusinessPrice",
    "FirstClassPrice"
)
SELECT
    gen_random_uuid(),
    'SF' || TO_CHAR(fp.n, 'FM0000') AS flight_number,
    fp.departure_airport_id,
    fp.arrival_airport_id,
    CASE WHEN fp.n % 13 = 0 THEN 'Delayed' ELSE 'Scheduled' END AS status,
    ((fp.n - 1) % 6) + 1 AS terminal,
    SUBSTRING('ABCDEFGHJK' FROM ((fp.n - 1) % 10) + 1 FOR 1) || (((fp.n * 3) % 32) + 1)::text AS gate,
    (ARRAY['Lufthansa', 'Delta Air Lines', 'Qatar Airways', 'Singapore Airlines', 'Emirates', 'Air France', 'British Airways', 'ANA', 'United Airlines', 'Turkish Airlines'])[((fp.n - 1) % 10) + 1] AS airline,
    (ARRAY['Airbus A320neo', 'Boeing 737 MAX 8', 'Airbus A321neo', 'Boeing 787-9', 'Airbus A350-900', 'Boeing 777-300ER', 'Embraer E195-E2', 'Airbus A330-900neo'])[((fp.n - 1) % 8) + 1] AS aircraft,
    (ARRAY[180, 189, 220, 248, 260, 300, 330, 350])[((fp.n - 1) % 8) + 1] AS seat_capacity,
    fp.scheduled_departure,
    fp.scheduled_departure + make_interval(hours => fp.duration_hours),
    fp.scheduled_departure,
    fp.scheduled_departure + make_interval(hours => fp.duration_hours),
    ROUND((80 + fp.duration_hours * 35 + (fp.n % 7) * 12)::numeric, 2) AS economy_price,
    ROUND((80 + fp.duration_hours * 35 + (fp.n % 7) * 12)::numeric * 1.45, 2) AS premium_economy_price,
    ROUND((80 + fp.duration_hours * 35 + (fp.n % 7) * 12)::numeric * 2.40, 2) AS business_price,
    ROUND((80 + fp.duration_hours * 35 + (fp.n % 7) * 12)::numeric * 3.60, 2) AS first_class_price
FROM flight_pairs fp
ON CONFLICT ("FlightNumber") DO NOTHING;
