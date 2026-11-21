import { Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/services/analytics.service';
import { IncidentService } from '../../core/services/incident.service';
import { AnalyticsChartComponent } from '../../shared/components/analytics-chart';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, AnalyticsChartComponent, SinalaIconComponent],
  template: `
    <section class="dashboard">
      <div class="page-head"><div><span class="overline">{{ todayLabel() }}</span><h1>Visão geral</h1><p>Acompanhe os reportes de conectividade da comunidade.</p></div><a routerLink="/admin/ocorrencias" class="view-all">Gerir ocorrências <lucide-icon name="arrow-up-right"></lucide-icon></a></div>
      <div class="kpi-grid">
        <article class="kpi-card sinala-card"><span class="kpi-icon cyan"><lucide-icon name="radio"></lucide-icon></span><span class="kpi-title">Total de reportes</span><strong>{{ incidentService.total() | number }}</strong><small>Registos recebidos pela plataforma</small></article>
        <article class="kpi-card sinala-card"><span class="kpi-icon violet"><lucide-icon name="calendar-days"></lucide-icon></span><span class="kpi-title">Recebidos hoje</span><strong>{{ incidentService.receivedToday() }}</strong><small>Desde o início do dia</small></article>
        <article class="kpi-card sinala-card"><span class="kpi-icon amber"><lucide-icon name="clock-3"></lucide-icon></span><span class="kpi-title">Em análise</span><strong>{{ analytics.underReview() }}</strong><small>Requerem acompanhamento</small></article>
        <article class="kpi-card sinala-card"><span class="kpi-icon green"><lucide-icon name="circle-check-big"></lucide-icon></span><span class="kpi-title">Encerrados</span><strong>{{ closedTotal() }}</strong><small>Reportes actualmente encerrados</small></article>
      </div>
      <div class="chart-grid">
        <section class="chart-card sinala-card"><div class="card-head"><div><h2>Volume de reportes</h2><p>Actividade comunitária nos últimos sete dias</p></div></div><app-analytics-chart title="Volume de reportes ao longo do tempo" type="line" [labels]="weekLabels()" [values]="weekValues()"></app-analytics-chart></section>
        <section class="chart-card sinala-card"><div class="card-head"><div><h2>Reportes por categoria</h2><p>Distribuição dos reportes registados</p></div><a routerLink="/admin/analytics">Detalhes</a></div><app-analytics-chart title="Reportes por categoria" type="pie" [labels]="categoryLabels()" [values]="categoryValues()"></app-analytics-chart></section>
      </div>
      <div class="bottom-grid">
        <section class="data-card sinala-card"><div class="card-head"><div><h2>Reportes recentes</h2><p>Últimas contribuições da comunidade</p></div><a routerLink="/admin/ocorrencias">Ver todos <lucide-icon name="arrow-right"></lucide-icon></a></div><div class="recent-table-wrap"><table class="recent-table"><thead><tr><th>REFERÊNCIA</th><th>CATEGORIA</th><th>PROVÍNCIA</th><th>ESTADO</th><th>DATA</th></tr></thead><tbody>@for (incident of recent(); track incident.id) {<tr><td><strong>{{ incident.reference }}</strong></td><td>{{ incident.category }}</td><td>{{ incident.province }}</td><td><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></td><td>{{ incident.createdAt | date:'d MMM':'':'pt-PT' }}</td></tr>}</tbody></table></div></section>
        <section class="region-card sinala-card"><div class="card-head"><div><h2>Distribuição geográfica</h2><p>Reportes por província</p></div><a routerLink="/admin/analytics">Ver mapa</a></div><div class="region-list">@for (province of topProvinces(); track province[0]) {<div class="region-row"><span>{{ province[0] }}</span><div class="progress"><i [style.width.%]="(province[1] / maxProvince()) * 100"></i></div><strong>{{ province[1] }}</strong></div>} @empty { <p class="empty-state">Ainda não existem reportes para apresentar.</p> }</div><div class="region-total"><lucide-icon name="map-pin"></lucide-icon>{{ analytics.provinces().length }} províncias com reportes</div></section>
      </div>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .page-head { display:flex; justify-content:space-between; align-items:end; gap:15px; margin-bottom:18px; }
    .overline { color:#9aa8c1; font-size:11px; font-weight:800; letter-spacing:1px; }
    h1 { margin:7px 0 5px; color:#00163f; font-size:26px; letter-spacing:-.8px; }.page-head p { margin:0; color:#9aa8c1; font-size:12px; }
    .view-all, .card-head > a { display:inline-flex; align-items:center; gap:6px; min-height:32px; color:#0060c0; text-decoration:none; font-size:12px; font-weight:700; white-space:nowrap; }.view-all lucide-icon, .card-head > a lucide-icon { width:13px; height:13px; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .kpi-card { position:relative; overflow:hidden; min-height:125px; padding:15px; border:1px solid #e8edf1; border-radius:9px; }
    .kpi-icon { width:29px; height:29px; display:grid; place-items:center; margin-bottom:10px; border-radius:8px; }.kpi-icon lucide-icon { width:15px; height:15px; }.kpi-icon.cyan { background:#e9f3ff; color:#169ba5; }.kpi-icon.violet { background:#eaf2ff; color:#0060c0; }.kpi-icon.amber { background:#fff4e5; color:#d69b3d; }.kpi-icon.green { background:#e8f7ef; color:#319a6e; }
    .kpi-title { position:absolute; top:22px; left:53px; color:#9aa8c1; font-size:11px; }.kpi-card > strong { display:block; color:#00163f; font-size:23px; letter-spacing:-.7px; }.kpi-card > small { display:block; margin-top:5px; color:#9aa8c1; font-size:11px; }.positive { color:#38a778; font-weight:800; }
    .sparkline { position:absolute; right:12px; bottom:10px; width:48px; height:20px; opacity:.65; border-bottom:2px solid #0090f0; border-radius:50% 40% 0 0; transform:skewY(-18deg); }.sparkline.purple { border-color:#0060c0; }.sparkline.orange { border-color:#d8a144; }.sparkline.green-line { border-color:#39a879; }.chart-grid { display:grid; grid-template-columns:1.35fr .85fr; gap:13px; margin-top:13px; }
    .chart-card, .data-card, .region-card { padding:17px; border:1px solid #e8edf1; border-radius:9px; }
    .card-head { display:flex; justify-content:space-between; align-items:start; gap:10px; }.card-head h2 { margin:0; color:#00163f; font-size:14px; }.card-head p { margin:4px 0 0; color:#9aa8c1; font-size:11px; }
    .card-head .form-select { width:115px; height:34px; border-color:#e5e9ef; border-radius:5px; color:#9aa8c1; font-size:12px; }
    .chart-card app-analytics-chart { margin-top:6px; }
    .bottom-grid { display:grid; grid-template-columns:1.35fr .85fr; gap:13px; margin-top:13px; }.data-card, .region-card { min-width:0; }
    .recent-table-wrap { overflow-x:auto; margin-top:13px; }.recent-table { width:100%; min-width:520px; border-collapse:collapse; text-align:left; }.recent-table th { padding:9px 7px; border-bottom:1px solid #edf0f3; color:#9aa8c1; font-size:11px; letter-spacing:.45px; }.recent-table td { padding:11px 7px; border-bottom:1px solid #f0f2f5; color:#b8c7dd; font-size:12px; white-space:nowrap; }.recent-table td strong { color:#5cc8ff; }
    .status-chip { padding:4px 6px; border-radius:4px; font-size:11px; font-weight:700; }.status-chip.pending { background:#fff5e8; color:#b37a23; }.status-chip.review { background:#e9f2ff; color:#003090; }.status-chip.done { background:#e8f7ef; color:#318d64; }
    .region-list { display:grid; gap:13px; margin:18px 0; }.region-row { display:grid; grid-template-columns:72px 1fr 22px; align-items:center; gap:8px; color:#b8c7dd; font-size:12px; }.region-row strong { text-align:right; color:#dce8f8; font-size:12px; }.progress { height:5px; border-radius:8px; background:#1e3b68; }.progress i { display:block; height:100%; border-radius:8px; background:#00a8f0; }
    .region-total { display:flex; align-items:center; gap:6px; padding-top:11px; border-top:1px solid #edf0f3; color:#9aa8c1; font-size:12px; }.region-total lucide-icon { width:12px; height:12px; color:#00a8f0; }
    @media(max-width:980px) { .kpi-grid { grid-template-columns:repeat(2,1fr); }.chart-grid, .bottom-grid { grid-template-columns:1fr; } }
    @media(max-width:560px) { .page-head { align-items:flex-start; flex-direction:column; }.kpi-grid { gap:8px; }.kpi-card { min-height:114px; padding:12px; }.kpi-title { left:48px; }.card-head { flex-wrap:wrap; } }
  `],
})
export class AdminDashboardComponent {
  readonly incidentService = inject(IncidentService);
  readonly analytics = inject(AnalyticsService);
  readonly incidents = this.incidentService.incidents;
  readonly recent = computed(() => this.incidents().slice(0, 5));
  readonly categoryLabels = computed(() => this.analytics.categories().map(([name]) => name));
  readonly categoryValues = computed(() => this.analytics.categories().map(([, count]) => count));
  readonly topProvinces = computed(() => this.analytics.provinces().slice(0, 5));
  readonly maxProvince = computed(() => Math.max(1, ...this.topProvinces().map(([, count]) => count)));
  readonly todayLabel = computed(() => new Date().toLocaleDateString('pt-PT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).toLocaleUpperCase('pt-PT'));
  readonly closedTotal = computed(() =>
    this.incidents().filter((incident) => incident.status === 'Encerrado').length,
  );
  readonly weekLabels = computed(() => this.lastSevenDays().map((date) =>
    date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }),
  ));
  readonly weekValues = computed(() => {
    const dates = this.lastSevenDays();
    const counts = new Map(dates.map((date) => [this.dayKey(date), 0]));
    for (const incident of this.incidents()) {
      const day = this.dayKey(new Date(incident.createdAt));
      if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return [...counts.values()];
  });

  private lastSevenDays(): Date[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  statusClass(status: string): string {
    if (status === 'Encerrado') return 'done';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'pending';
  }
}
