import type { PageNotice, PendingTransfer, User } from '../types'

type ToastStackProps = {
  notices: PageNotice[]
  pendingTransfer: PendingTransfer | null
  transferringCard: boolean
  usersById: Map<number, User>
  onDismissNotice: (id: number) => void
  onCancelTransfer: () => void
  onConfirmTransfer: () => void
}

export function ToastStack({
  notices,
  pendingTransfer,
  transferringCard,
  usersById,
  onDismissNotice,
  onCancelTransfer,
  onConfirmTransfer,
}: ToastStackProps) {
  if (!notices.length && !pendingTransfer) return null

  return (
    <div className="toast-stack" role="region" aria-label="Notificações do sistema">
      {pendingTransfer && (
        <div
          className="toast-card toast-warning"
          role="alertdialog"
          aria-labelledby="toast-transfer-title"
        >
          <div className="toast-head">
            <strong id="toast-transfer-title">Cartão já vinculado a outra pessoa</strong>
            <button
              type="button"
              className="toast-close"
              aria-label="Fechar aviso"
              onClick={onCancelTransfer}
            >
              ×
            </button>
          </div>
          <p>
            O cartão <code>{pendingTransfer.card.card_uid}</code> já pertence a{' '}
            <strong>
              {usersById.get(pendingTransfer.card.user_id)?.name ??
                `Pessoa #${pendingTransfer.card.user_id}`}
            </strong>
            . Deseja transferi-lo para{' '}
            <strong>
              {usersById.get(pendingTransfer.targetUserId)?.name ??
                `Pessoa #${pendingTransfer.targetUserId}`}
            </strong>
            ?
          </p>
          <div className="toast-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={transferringCard}
              onClick={onCancelTransfer}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={transferringCard}
              onClick={onConfirmTransfer}
            >
              {transferringCard ? 'Transferindo...' : 'Confirmar transferência'}
            </button>
          </div>
        </div>
      )}

      {notices.map((notice) => (
        <div key={notice.id} className={`toast-card toast-${notice.type}`} role="status">
          <div className="toast-head">
            <strong>{notice.title}</strong>
            <button
              type="button"
              className="toast-close"
              aria-label="Fechar notificação"
              onClick={() => onDismissNotice(notice.id)}
            >
              ×
            </button>
          </div>
          <p>{notice.message}</p>
        </div>
      ))}
    </div>
  )
}
