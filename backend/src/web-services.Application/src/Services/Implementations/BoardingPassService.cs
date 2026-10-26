using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;
using SmartFlightCompanion.WebServices.Infrastructure.Entities;
using SmartFlightCompanion.WebServices.Infrastructure.Mail;
using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class BoardingPassService : IBoardingPassService
{
    private readonly IBoardingPassRepository _BoardingPassRepository;
    private readonly IUserRepository _userRepository;
    private readonly IFlightRepository _flightRepository;
    private readonly IEmailQueue _emailQueue;

    public BoardingPassService(
        IBoardingPassRepository BoardingPassRepository,
        IUserRepository userRepository,
        IFlightRepository flightRepository,
        IEmailQueue emailQueue)
    {
        _BoardingPassRepository = BoardingPassRepository;
        _userRepository = userRepository;
        _flightRepository = flightRepository;
        _emailQueue = emailQueue;
    }

    public async Task<BoardingPassDto?> Create(Guid flightId, Guid ownerId, Seat seat, CancellationToken cancellationToken = default)
    {
        var flight = await _flightRepository.GetByIdAsync(flightId, cancellationToken);
        var user = await _userRepository.GetByIdAsync(ownerId, cancellationToken);
        if (flight is null || user is null)
        {
            return null;
        }

        int seatsTaken = await _BoardingPassRepository.GetCountByFlightIdAsync(flightId, cancellationToken);
        if (seatsTaken >= flight.SeatCapacity)
        {
            return null;
        }

        decimal? price = flight.FirstClassPrice;

        if(seat == Seat.Economy)
        {
            price = flight.EconomyPrice;
        }
        else if(seat == Seat.PremiumEconomy)
        {
            price = flight.PremiumEconomyPrice;
        }
        else if(seat == Seat.Business)
        {
            price = flight.BusinessPrice;
        }

        if(price is null)
        {
            return null;
        }

        var boardingPass = new BoardingPass
        {
            User = user,
            Flight = flight,
            Seat = seat,
            Price = price ?? 0,
            IsValid = true
        };

        var result = await _BoardingPassRepository.CreateAsync(boardingPass, cancellationToken);

        var qrPayload = BuildQrPayload(result);
        var qrCodePng = GenerateQrCodePng(qrPayload);
        var boardingPassPdf = GenerateBoardingPassPdf(result, qrCodePng);
        var route = $"{result.Flight.DepartureAirport.IATA} -> {result.Flight.ArrivalAirport.IATA}";

        await _emailQueue.EnqueueAsync(
            new EmailQueueItem(
                result.User.Email,
                $"Boarding pass for flight {result.Flight.FlightNumber}",
                "Hello {{FirstName}},\n\nAttached is your boarding pass for flight {{FlightNumber}} ({{Route}}).\n\nHave a safe flight,\nSmartFlightCompanion Team",
                new Dictionary<string, string>
                {
                    ["FirstName"] = result.User.FirstName,
                    ["FlightNumber"] = result.Flight.FlightNumber,
                    ["Route"] = route,
                },
                new List<EmailAttachment>
                {
                    new($"boarding-pass-{result.Id}.pdf", "application/pdf", boardingPassPdf)
                }),
            cancellationToken);

        return BoardingPassDto.FromEntity(result);
    }
    public async Task<IReadOnlyList<BoardingPassDto>> GetByOwnerId(Guid ownerId, CancellationToken cancellationToken = default)
    {
        var boardingPasses = await _BoardingPassRepository.GetByOwnerIdAsync(ownerId, cancellationToken);

        return boardingPasses
            .Select(BoardingPassDto.FromEntity)
            .ToList()
            .AsReadOnly();
    }

    public async Task<int> GetCountByFlightId(Guid flightId, CancellationToken cancellationToken = default)
    {
        return await _BoardingPassRepository.GetCountByFlightIdAsync(flightId, cancellationToken);
    }

    public async Task<byte[]?> GetPdfById(Guid id, CancellationToken cancellationToken = default)
    {
        var boardingPass = await _BoardingPassRepository.GetByIdWithDetailsAsync(id, cancellationToken);
        if (boardingPass is null)
        {
            return null;
        }

        var qrPayload = BuildQrPayload(boardingPass);
        var qrCodePng = GenerateQrCodePng(qrPayload);

        return GenerateBoardingPassPdf(boardingPass, qrCodePng);
    }

    private static string BuildQrPayload(BoardingPass boardingPass)
    {
        var owner = $"{boardingPass.User.FirstName} {boardingPass.User.LastName}";
        var route = $"{boardingPass.Flight.DepartureAirport.IATA}-{boardingPass.Flight.ArrivalAirport.IATA}";

        return string.Join(
            '\n',
            [
                $"id:{boardingPass.Id}",
                $"flightNumber:{boardingPass.Flight.FlightNumber}",
                $"route:{route}",
                $"owner:{owner}"
            ]);
    }

    private static byte[] GenerateQrCodePng(string payload)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new PngByteQRCode(qrCodeData);

        return qrCode.GetGraphic(20);
    }

    private static byte[] GenerateBoardingPassPdf(BoardingPass boardingPass, byte[] qrCodePng)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Margin(32);

                    page.Header()
                        .Text("SmartFlightCompanion Boarding Pass")
                        .FontSize(20)
                        .SemiBold()
                        .FontColor(Colors.Blue.Darken2);

                    page.Content().PaddingTop(16).Column(column =>
                    {
                        var owner = $"{boardingPass.User.FirstName} {boardingPass.User.LastName}";
                        var route = $"{boardingPass.Flight.DepartureAirport.Name} ({boardingPass.Flight.DepartureAirport.IATA}) -> {boardingPass.Flight.ArrivalAirport.Name} ({boardingPass.Flight.ArrivalAirport.IATA})";

                        column.Spacing(6);
                        column.Item().Text($"Flight Number: {boardingPass.Flight.FlightNumber}");
                        column.Item().Text($"Route: {route}");
                        column.Item().Text($"Airline: {boardingPass.Flight.Airline}");
                        column.Item().Text($"Owner: {owner}");
                        column.Item().Text($"Seat Class: {boardingPass.Seat}");
                        column.Item().Text($"Price: {boardingPass.Price:0.00}");
                        column.Item().Text($"Issued At (UTC): {boardingPass.IssuedAt:yyyy-MM-dd HH:mm:ss}");
                        column.Item().Text($"Scheduled Departure (UTC): {boardingPass.Flight.ScheduledDepartureTime:yyyy-MM-dd HH:mm:ss}");
                        column.Item().Text($"Scheduled Arrival (UTC): {boardingPass.Flight.ScheduledArrivalTime:yyyy-MM-dd HH:mm:ss}");

                        column.Item().AlignLeft().Width(180).Image(qrCodePng);
                    });

                    page.Footer()
                        .AlignRight()
                        .Text(text =>
                        {
                            text.Span("Generated on ");
                            text.Span(DateTimeOffset.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'"));
                        });
                });
            })
            .GeneratePdf();
    }
}
