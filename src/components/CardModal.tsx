import type { FormEvent } from 'react'
import type { User } from '../types'
import { formatCpf } from '../utils/formatters'

type CardModalProps = {
  isOpen: boolean
  users: User[]
  selectedUserId: string
  manualCardUid: string
  enrollingRfid: boolean
  submittingCard: boolean
  onChangeSelectedUser: (userId: string) => void
  onChangeManualUid: (uid: string) => void
  onStartRfidEnrollment: () => void
  onClose: () => void
  onSubmitManual: (event: FormEvent<HTMLFormElement>) => void
}

export function CardModal({
  isOpen,
  users,
  selectedUserId,
  manualCardUid,
  enrollingRfid,
  submittingCard,
  onChangeSelectedUser,
  onChangeManualUid,
  onStartRfidEnrollment,
  onClose,
  onSubmitManual,
}: CardModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-card-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">CREDENCIAIS RFID</p>
            <h2 id="modal-card-title">Cadastrar cartão</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Fechar modal" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmitManual}>
          <label className="form-field">
            <span>Vincular à pessoa</span>
            <select
              value={selectedUserId}
              onChange={(event) => onChangeSelectedUser(event.target.value)}
              disabled={enrollingRfid}
              required
            >
              <option value="" disabled>
                Selecione uma pessoa...
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({formatCpf(user.cpf)})
                </option>
              ))}
            </select>
          </label>

          <div className="rfid-enroll-box">
            <div className="rfid-enroll-info">
              <strong>Leitura direta no RFID da porta</strong>
              <p>
                {enrollingRfid
                  ? 'Modo cadastro ativo! Aproxime o cartão no leitor RFID da porta agora...'
                  : 'Ative o modo cadastro e passe o cartão no leitor da fechadura para vinculá-lo automaticamente.'}
              </p>
            </div>
            <button
              type="button"
              className={enrollingRfid ? 'secondary-button' : 'primary-button'}
              onClick={enrollingRfid ? onClose : onStartRfidEnrollment}
            >
              {enrollingRfid ? 'Aguardando cartão na porta...' : 'Ler cartão no RFID da porta'}
            </button>
          </div>

          <label className="form-field">
            <span>Ou digite o UID manualmente (opcional)</span>
            <input
              type="text"
              placeholder="Ex: 01B46906"
              value={manualCardUid}
              onChange={(event) => onChangeManualUid(event.target.value.toUpperCase())}
              disabled={enrollingRfid}
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={submittingCard}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={submittingCard || enrollingRfid || !manualCardUid.trim()}
            >
              {submittingCard ? 'Salvando...' : 'Salvar manualmente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
