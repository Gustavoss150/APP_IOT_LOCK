import type { FormEvent } from 'react'

type UserModalProps = {
  isOpen: boolean
  name: string
  cpf: string
  cardUid: string
  error: string | null
  submitting: boolean
  onChangeName: (value: string) => void
  onChangeCpf: (value: string) => void
  onChangeCardUid: (value: string) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function UserModal({
  isOpen,
  name,
  cpf,
  cardUid,
  error,
  submitting,
  onChangeName,
  onChangeCpf,
  onChangeCardUid,
  onClose,
  onSubmit,
}: UserModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-user-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">NOVO REGISTRO</p>
            <h2 id="modal-user-title">Cadastrar pessoa</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Fechar modal" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={onSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <label className="form-field">
            <span>Nome completo</span>
            <input
              type="text"
              placeholder="Ex: Maria Eduarda"
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
              autoFocus
              required
            />
          </label>

          <label className="form-field">
            <span>CPF (11 dígitos)</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(event) => onChangeCpf(event.target.value)}
              required
            />
          </label>

          <label className="form-field">
            <span>UID do cartão RFID (opcional)</span>
            <input
              type="text"
              placeholder="Ex: 01B46906"
              value={cardUid}
              onChange={(event) => onChangeCardUid(event.target.value.toUpperCase())}
            />
            <small>Se preenchido, o cartão já será vinculado e ativado para esta pessoa.</small>
          </label>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
