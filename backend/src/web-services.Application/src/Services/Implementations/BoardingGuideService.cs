using SmartFlightCompanion.WebServices.Application.Dto;
using SmartFlightCompanion.WebServices.Infrastructure.Persistence.Abstractions;

using SmartFlightCompanion.WebServices.Infrastructure.Entities;

namespace SmartFlightCompanion.WebServices.Application.Services;

public sealed class BoardingGuideService : IBoardingGuideService
{
    private readonly IBoardingGuideRepository _boardingGuideRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IFlightRepository _flightRepository;
    private readonly string _mediaBaseUrl;
    private readonly string _bucket;
    private readonly string _bucketAccessKey;

    public BoardingGuideService(IBoardingGuideRepository boardingGuideRepository, IMediaRepository mediaRepository, IFlightRepository flightRepository)
    {
        _boardingGuideRepository = boardingGuideRepository;
        _mediaRepository = mediaRepository;
        _flightRepository = flightRepository;
        _mediaBaseUrl = GetRequiredEnvironmentVariable("Media__PublicBaseUrl");
        _bucket = GetRequiredEnvironmentVariable("Media__Bucket");
        _bucketAccessKey = GetRequiredEnvironmentVariable("Media__BucketAccessKey");
    }

    public async Task<IReadOnlyList<BoardingGuideDto>> GetByFlightIdAsync(Guid flightId, bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        if (flightId == Guid.Empty)
        {
            throw new ArgumentException("Flight ID cannot be empty.", nameof(flightId));
        }

        var now = DateTimeOffset.UtcNow;
        var guides = (await _boardingGuideRepository.GetByFlightIdAsync(flightId, cancellationToken))
            .Where(guide => includeInactive || (guide.OpensAt <= now && guide.ClosesAt >= now))
            .OrderBy(guide => guide.OpensAt)
            .ToList();

        List<BoardingGuideDto> guideDtos = new List<BoardingGuideDto>();

        foreach (var guide in guides)
        {
            var media = await _mediaRepository.GetByGuideIdAsync(guide.Id, cancellationToken);

            var imageUrls = media.Where(m => m.Type == MediaType.Image).Select(m => m.Url).ToList();
            var videoUrls = media.Where(m => m.Type == MediaType.Video).Select(m => m.Url).ToList();

            var guideDto = new BoardingGuideDto
            {
                Id = guide.Id,
                FlightId = guide.Flight.Id,
                Description = guide.Description,
                OpensAt = guide.OpensAt,
                ClosesAt = guide.ClosesAt,
                ImageUrls = imageUrls,
                VideoUrls = videoUrls
            };

            guideDtos.Add(guideDto);
        }

        return guideDtos;
    }

    public async Task<BoardingGuideDto?> CreateAsync(BoardingGuideDto boardingGuideDto, CancellationToken cancellationToken = default)
    {
        if (boardingGuideDto is null || boardingGuideDto.FlightId == Guid.Empty)
        {
            throw new ArgumentNullException(nameof(boardingGuideDto));
        }

        Flight? flight = await _flightRepository.GetByIdAsync(boardingGuideDto.FlightId, cancellationToken);

        if (flight is null)
        {
            throw new ArgumentException($"Flight with ID {boardingGuideDto.FlightId} does not exist.", nameof(boardingGuideDto.FlightId));
        }

        var boardingGuide = new BoardingGuide
        {
            Flight = flight,
            Description = boardingGuideDto.Description,
            OpensAt = boardingGuideDto.OpensAt,
            ClosesAt = boardingGuideDto.ClosesAt, 
        };

        var createdGuide = await _boardingGuideRepository.CreateAsync(boardingGuide, cancellationToken);

        return BoardingGuideDto.FromEntity(createdGuide);
    }

    public async Task<string?> UploadMediaUrlAsync(Guid id, MediaType type, string? url, string? extension, CancellationToken cancellationToken = default)
    {
        var guide = await _boardingGuideRepository.GetByIdAsync(id, cancellationToken);

        if (guide is null)
        {
            return null;
        }

        if (url is not null && !Uri.IsWellFormedUriString(url, UriKind.Absolute))
        {
            throw new ArgumentException("The provided URL is not valid.", nameof(url));
        }

        Media media = new Media
        {
            BoardingGuide = guide,
            Type = type,
        };

        if (!string.IsNullOrWhiteSpace(url))
        {
            media.Url = url;
        }
        else if (extension is not null && !string.IsNullOrWhiteSpace(extension))
        {
            media.Url = GetMediaUrl(media, type, extension);
        }
        else
        {
            throw new ArgumentException("Either a valid URL or a file extension must be provided.", nameof(url));
        }

        media = await _mediaRepository.CreateAsync(media, cancellationToken);

        return media.Url;
    }

    private string GetMediaUrl(Media media, MediaType type, string extension)
    {
        var (bucketName, accessKey) = type switch
        {
            MediaType.Image => ($"{_bucket}/images", _bucketAccessKey),
            MediaType.Video => ($"{_bucket}/videos", _bucketAccessKey),
            _ => throw new ArgumentOutOfRangeException(nameof(type), "Invalid media type.")
        };

        var baseUrl = _mediaBaseUrl.TrimEnd('/');
        return $"{baseUrl}/{bucketName}/{media.Id}.{extension}?accessKey={Uri.EscapeDataString(accessKey)}";
    }

    private static string GetRequiredEnvironmentVariable(string key)
    {
        return Environment.GetEnvironmentVariable(key)
            ?? throw new InvalidOperationException($"Missing required environment variable '{key}'.");
    }
}
