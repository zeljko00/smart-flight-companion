import { apiRequest } from './apiClient'

type ApiComment = {
  id: string
  authorId?: string
  author?: string
  content?: string
  flightId?: string
  flightNumber?: string
  createdAt?: string
}

export type FlightComment = {
  id: string
  authorId: string
  author: string
  content: string
  flightId: string
  flightNumber: string
  createdAt: string
}

type CreateCommentRequest = {
  flightId: string
  content: string
}

function toFlightComment(comment: ApiComment): FlightComment {
  return {
    id: comment.id,
    authorId: comment.authorId ?? '',
    author: comment.author?.trim() || 'Unknown',
    content: comment.content?.trim() || '',
    flightId: comment.flightId ?? '',
    flightNumber: comment.flightNumber ?? '',
    createdAt: comment.createdAt ?? new Date().toISOString(),
  }
}

export async function fetchCommentsByFlight(flightId: string): Promise<FlightComment[]> {
  const comments = await apiRequest<ApiComment[]>(`/flights/${encodeURIComponent(flightId)}/comments`)

  return comments
    .map(toFlightComment)
    .filter((comment) => comment.content.length > 0)
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
}

export async function fetchAllComments(): Promise<FlightComment[]> {
  const comments = await apiRequest<ApiComment[]>('/comments')

  return comments
    .map(toFlightComment)
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
}

export async function deleteComment(id: string): Promise<void> {
  await apiRequest<unknown>(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function createComment(request: CreateCommentRequest): Promise<FlightComment> {
  const comment = await apiRequest<ApiComment>('/comments', {
    method: 'POST',
    body: {
      flightId: request.flightId,
      content: request.content,
    },
  })

  return toFlightComment(comment)
}
