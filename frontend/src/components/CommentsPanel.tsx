import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import { deleteComment, fetchAllComments, type FlightComment } from '../services/commentsService'
import '../style/CommentsPanel.css'

type FlightGroup = {
  flightId: string
  flightNumber: string
  comments: FlightComment[]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

type DeleteDialogProps = {
  comment: FlightComment
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteCommentDialog({ comment, isDeleting, onConfirm, onCancel }: DeleteDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    // Guarded because StrictMode runs this effect twice.
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="comments-dialog"
      aria-labelledby="comments-dialog-title"
      onCancel={(event) => {
        // Escape key: keep the dialog open while a delete is in flight.
        if (isDeleting) {
          event.preventDefault()
        }
      }}
      onClose={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel()
        }
      }}
    >
      <div className="comments-dialog__header">
        <div className="comments-dialog__icon" aria-hidden="true">
          <Trash2 size={18} />
        </div>
        <div>
          <h3 id="comments-dialog-title">{t('admin.comments.confirmTitle')}</h3>
          <p>{t('admin.comments.confirmDelete')}</p>
        </div>
        <button
          type="button"
          className="comments-dialog__close"
          onClick={onCancel}
          disabled={isDeleting}
          aria-label={t('admin.comments.cancel')}
          title={t('admin.comments.cancel')}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <blockquote className="comments-dialog__preview">
        <p className="comments-dialog__preview-meta">
          {comment.author} · {t('admin.comments.flight')} {comment.flightNumber}
        </p>
        <p className="comments-dialog__preview-content">{comment.content}</p>
      </blockquote>

      <div className="comments-dialog__actions">
        <button
          type="button"
          className="comments-dialog__button comments-dialog__button--secondary"
          onClick={onCancel}
          disabled={isDeleting}
          autoFocus
        >
          {t('admin.comments.cancel')}
        </button>
        <button
          type="button"
          className="comments-dialog__button comments-dialog__button--danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="comments-panel__icon comments-panel__icon--spin" aria-hidden="true" />
          ) : (
            <Trash2 className="comments-panel__icon" aria-hidden="true" />
          )}
          <span>{isDeleting ? t('admin.comments.deleting') : t('admin.comments.delete')}</span>
        </button>
      </div>
    </dialog>
  )
}

export function CommentsPanel() {
  const { t } = useTranslation()
  const [comments, setComments] = useState<FlightComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingComment, setPendingComment] = useState<FlightComment | null>(null)

  const loadComments = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      setComments(await fetchAllComments())
    } catch {
      setErrorMessage(t('admin.comments.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const groups = useMemo<FlightGroup[]>(() => {
    const map = new Map<string, FlightGroup>()

    for (const comment of comments) {
      const existing = map.get(comment.flightId)
      if (existing) {
        existing.comments.push(comment)
      } else {
        map.set(comment.flightId, {
          flightId: comment.flightId,
          flightNumber: comment.flightNumber,
          comments: [comment],
        })
      }
    }

    return Array.from(map.values()).sort((first, second) =>
      first.flightNumber.localeCompare(second.flightNumber),
    )
  }, [comments])

  const handleDelete = async (id: string) => {
    setErrorMessage(null)
    setNoticeMessage(null)
    setDeletingId(id)

    try {
      await deleteComment(id)
      setComments((current) => current.filter((comment) => comment.id !== id))
      setNoticeMessage(t('admin.comments.deleteSuccess'))
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.comments.deleteError'))
    } finally {
      setDeletingId(null)
      setPendingComment(null)
    }
  }

  return (
    <section className="comments-panel" aria-label={t('admin.comments.aria')}>
      <div className="comments-panel__toolbar">
        <p className="comments-panel__count">{t('admin.comments.total', { count: comments.length })}</p>
        <button
          type="button"
          className="comments-panel__refresh"
          onClick={() => void loadComments()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="comments-panel__icon comments-panel__icon--spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="comments-panel__icon" aria-hidden="true" />
          )}
          <span>{t('admin.comments.refresh')}</span>
        </button>
      </div>

      {isLoading && comments.length === 0 ? (
        <p className="comments-panel__message">{t('admin.comments.loading')}</p>
      ) : null}

      {errorMessage ? (
        <p className="comments-panel__message comments-panel__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!errorMessage && noticeMessage ? (
        <p className="comments-panel__message comments-panel__message--success">{noticeMessage}</p>
      ) : null}

      {!isLoading && !errorMessage && groups.length === 0 ? (
        <p className="comments-panel__message">{t('admin.comments.empty')}</p>
      ) : null}

      <div className="comments-panel__groups">
        {groups.map((group) => (
          <article key={group.flightId} className="comments-panel__group">
            <h3>
              {t('admin.comments.flight')} {group.flightNumber} ({group.comments.length})
            </h3>
            <ul className="comments-panel__list">
              {group.comments.map((comment) => (
                <li key={comment.id} className="comments-panel__item">
                  <div className="comments-panel__body">
                    <p className="comments-panel__meta">
                      <strong>{comment.author}</strong> · {formatDate(comment.createdAt)}
                    </p>
                    <p className="comments-panel__content">{comment.content}</p>
                  </div>
                  <button
                    type="button"
                    className="comments-panel__delete"
                    onClick={() => setPendingComment(comment)}
                    disabled={deletingId === comment.id}
                    aria-label={t('admin.comments.delete')}
                    title={t('admin.comments.delete')}
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="comments-panel__icon comments-panel__icon--spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="comments-panel__icon" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      {pendingComment ? (
        <DeleteCommentDialog
          comment={pendingComment}
          isDeleting={deletingId === pendingComment.id}
          onConfirm={() => void handleDelete(pendingComment.id)}
          onCancel={() => setPendingComment(null)}
        />
      ) : null}
    </section>
  )
}
