import type { DashboardData } from '../types'

type OverviewStatsProps = {
  data: DashboardData
  loading: boolean
  updatedAt: Date | null
}

export function OverviewStats({ data, loading, updatedAt }: OverviewStatsProps) {
  const isInitialLoading = loading && !updatedAt
  const activeCardsCount = data.cards.filter((card) => card.active).length

  return (
    <section className="stats-grid" aria-label="Resumo dos cadastros">
      <article className="stat-panel stat-coral">
        <div className="stat-top">
          <span>PESSOAS</span>
          <span className="stat-index">01</span>
        </div>
        <strong>{isInitialLoading ? '—' : data.users.length}</strong>
        <p>cadastros na API</p>
      </article>

      <article className="stat-panel stat-green">
        <div className="stat-top">
          <span>CARTÕES ATIVOS</span>
          <span className="stat-index">02</span>
        </div>
        <strong>{isInitialLoading ? '—' : activeCardsCount}</strong>
        <p>de {data.cards.length} cartões cadastrados</p>
      </article>

      <article className="stat-panel stat-blue">
        <div className="stat-top">
          <span>EVENTOS RECENTES</span>
          <span className="stat-index">03</span>
        </div>
        <strong>{isInitialLoading ? '—' : data.logs.length}</strong>
        <p>registros retornados pela API</p>
      </article>
    </section>
  )
}
