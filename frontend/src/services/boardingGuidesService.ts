import { apiRequest } from './apiClient'

export type BoardingGuideMediaType = 'image' | 'video'

type ApiBoardingGuide = {
  id: string
  flightId?: string
  description?: string
  opensAt?: string
  closesAt?: string
  imageUrls?: string[]
  videoUrls?: string[]
}

type ApiMediaType = 0 | 1

export type CreateBoardingGuideRequest = {
  description: string
  opensAt: string
  closesAt: string
}

export type BoardingGuide = {
  id: string
  flightId: string
  description: string
  opensAt: string
  closesAt: string
  imageUrls: string[]
  videoUrls: string[]
}

function toApiMediaType(type: BoardingGuideMediaType): ApiMediaType {
  return type === 'image' ? 0 : 1
}

function getFileExtension(fileName: string): string | null {
  const normalized = fileName.trim()
  const index = normalized.lastIndexOf('.')

  if (index <= 0 || index >= normalized.length - 1) {
    return null
  }

  return normalized.slice(index + 1).toLowerCase()
}

function toBoardingGuide(raw: ApiBoardingGuide, fallbackFlightId: string): BoardingGuide {
  return {
    id: raw.id,
    flightId: raw.flightId ?? fallbackFlightId,
    description: raw.description ?? '',
    opensAt: raw.opensAt ?? '',
    closesAt: raw.closesAt ?? '',
    imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls.filter((url) => typeof url === 'string') : [],
    videoUrls: Array.isArray(raw.videoUrls) ? raw.videoUrls.filter((url) => typeof url === 'string') : [],
  }
}

export async function createBoardingGuide(
  flightId: string,
  request: CreateBoardingGuideRequest,
): Promise<BoardingGuide> {
  const payload = await apiRequest<ApiBoardingGuide>(
    `/flights/${encodeURIComponent(flightId)}/boarding-guides`,
    {
      method: 'POST',
      body: {
        flightId,
        description: request.description,
        opensAt: request.opensAt,
        closesAt: request.closesAt,
        imageUrls: [],
        videoUrls: [],
      },
    },
  )

  return toBoardingGuide(payload, flightId)
}

export async function fetchBoardingGuidesByFlight(flightId: string): Promise<BoardingGuide[]> {
  const payload = await apiRequest<ApiBoardingGuide[]>(
    `/flights/${encodeURIComponent(flightId)}/boarding-guides`,
  )

  if (!Array.isArray(payload)) {
    return []
  }

  return payload.map((guide) => toBoardingGuide(guide, flightId))
}

export async function attachBoardingGuideMediaUrl(
  flightId: string,
  guideId: string,
  type: BoardingGuideMediaType,
  mediaUrl: string,
): Promise<string> {
  return await apiRequest<string>(
    `/flights/${encodeURIComponent(flightId)}/boarding-guides/${encodeURIComponent(guideId)}/media`,
    {
      method: 'POST',
      body: {
        type: toApiMediaType(type),
        url: mediaUrl,
        extension: null,
      },
    },
  )
}

export async function attachBoardingGuideMediaFile(
  flightId: string,
  guideId: string,
  type: BoardingGuideMediaType,
  file: File,
): Promise<string> {
  const extension = getFileExtension(file.name)

  if (!extension) {
    throw new Error('Missing file extension.')
  }

  const mediaUrl = await apiRequest<string>(
    `/flights/${encodeURIComponent(flightId)}/boarding-guides/${encodeURIComponent(guideId)}/media`,
    {
      method: 'POST',
      body: {
        type: toApiMediaType(type),
        url: null,
        extension,
      },
    },
  )

  const uploadResponse = await fetch(mediaUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file to media storage: ${uploadResponse.status}`)
  }

  return mediaUrl
}
