import { apiRequest } from './apiClient'

type ApiNewsArticle = {
  title?: string
  link?: string
  summary?: string | null
  publishedAt?: string | null
}

export type NewsArticle = {
  title: string
  link: string
  summary: string | null
  publishedAt: string | null
}

function toNewsArticle(article: ApiNewsArticle): NewsArticle | null {
  const title = article.title?.trim()
  const link = article.link?.trim()

  if (!title || !link) {
    return null
  }

  const summary = article.summary?.trim() || null
  const publishedAt = article.publishedAt?.trim() || null

  return {
    title,
    link,
    summary,
    publishedAt,
  }
}

export async function fetchLatestNews(count = 6): Promise<NewsArticle[]> {
  const safeCount = Number.isFinite(count) ? Math.min(Math.max(Math.trunc(count), 1), 50) : 6
  const articles = await apiRequest<ApiNewsArticle[]>(`/news?count=${safeCount}`)

  return articles
    .map(toNewsArticle)
    .filter((article): article is NewsArticle => Boolean(article))
}