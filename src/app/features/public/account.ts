import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IncidentService } from '../../core/services/incident.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [DatePipe, RouterLink, SinalaIconComponent],
  template: `
    <section class="account-page">
      <header class="page-heading">
        <span class="overline">A MINHA CONTA</span>
        <h1>Olá, {{ auth.user()?.name }}</h1>
        <p>Acompanhe os reportes submetidos enquanto tem sessão iniciada.</p>
      </header>
      <section class="reports-card sinala-card">
        <div class="card-heading">
          <div><h2>Os meus reportes</h2><p>{{ incidents.accountIncidents().length }} registos associados a esta conta</p></div>
          <a routerLink="/reportar" class="new-report"><lucide-icon name="plus"></lucide-icon>Novo reporte</a>
        </div>
        @if (incidents.accountLoading()) {
          <p class="feedback" role="status">A carregar os seus reportes…</p>
        } @else if (incidents.accountError()) {
          <p class="feedback error" role="alert">{{ incidents.accountError() }}</p>
        } @else {
          <div class="report-list">
            @for (incident of incidents.accountIncidents(); track incident.id) {
              <article class="report-row">
                <div class="report-main">
                  <strong>{{ incident.reference }}</strong>
                  <span>{{ incident.category }} · {{ incident.municipality }}, {{ incident.province }}</span>
                  <small>Submetido a {{ incident.createdAt | date:'d MMM y, HH:mm':'':'pt-PT' }}</small>
                </div>
                <span class="status">{{ incident.status }}</span>
                <a [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }" aria-label="Acompanhar reporte">
                  Acompanhar <lucide-icon name="arrow-up-right"></lucide-icon>
                </a>
              </article>
            } @empty {
              <div class="empty">
                <lucide-icon name="file-search"></lucide-icon>
                <strong>Ainda não tem reportes associados.</strong>
                <span>Os reportes enviados com esta sessão iniciada aparecerão aqui.</span>
              </div>
            }
          </div>
        }
      </section>
    </section>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#f4f6f7; }
    .account-page { max-width:900px; margin:auto; padding:48px 24px 70px; }
    .page-heading { margin-bottom:22px; }.overline { color:#0060c0; font-size:11px; font-weight:800; letter-spacing:1px; }
    h1 { margin:8px 0; color:#00163f; font-size:30px; letter-spacing:-.8px; }.page-heading p,.card-heading p { margin:0; color:#62748a; font-size:11px; }
    .reports-card { padding:20px; border:1px solid #dbe3e7; border-radius:10px; }
    .card-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:16px; border-bottom:1px solid #e6edf0; }
    .card-heading h2 { margin:0 0 5px; color:#00163f; font-size:15px; }
    .new-report { display:inline-flex; align-items:center; gap:6px; padding:9px 11px; border-radius:6px; background:#00163f; color:#fff; font-size:11px; font-weight:700; text-decoration:none; white-space:nowrap; }
    .new-report lucide-icon,.report-row a lucide-icon { width:13px; height:13px; }
    .report-list { display:grid; }.report-row { display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:20px; padding:16px 0; border-bottom:1px solid #eef2f4; }
    .report-main { display:grid; gap:5px; }.report-main strong { color:#0060c0; font-size:12px; }.report-main span { color:#38445b; font-size:11px; }.report-main small { color:#62748a; font-size:11px; }
    .status { padding:6px 8px; border-radius:5px; background:#e9f2ff; color:#003090; font-size:11px; font-weight:700; white-space:nowrap; }
    .report-row a { display:inline-flex; align-items:center; gap:5px; min-height:32px; color:#0060c0; text-decoration:none; font-size:11px; font-weight:700; white-space:nowrap; }
    .empty { display:grid; justify-items:center; gap:8px; padding:38px 12px; color:#8c97a7; text-align:center; font-size:12px; }.empty lucide-icon { width:22px; height:22px; color:#0060c0; }.empty strong { color:#29415a; font-size:12px; }
    .feedback { padding:13px 0; color:#647086; font-size:12px; }.feedback.error { color:#a64e47; }
    @media(max-width:600px) { .account-page { padding:34px 14px 50px; }.reports-card { padding:14px; }.report-row { grid-template-columns:1fr auto; gap:8px; }.report-row a { grid-column:1/-1; }.card-heading { align-items:flex-start; flex-direction:column; } }
  `],
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly incidents = inject(IncidentService);

  constructor() {
    void this.incidents.loadAccount().catch(() => undefined);
  }
}
