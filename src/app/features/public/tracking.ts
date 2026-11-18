import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Incident, IncidentStatus } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

const STATUS_STEPS: IncidentStatus[] = ['Recebido', 'Em análise', 'Classificado', 'Encerrado'];

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule, SinalaIconComponent],
  template: `
    <section class="page-wrap">
      <div class="page-intro"><span class="overline">ACOMPANHAMENTO</span><h1>Onde está o seu reporte?</h1><p>Consulte o estado da ocorrência através da referência recebida após o envio.</p></div>
      <form class="lookup-card uk-card uk-card-default" (ngSubmit)="search()">
        <label for="reference">Referência do reporte</label>
        <div class="lookup-row"><input id="reference" class="uk-input" [formControl]="reference" placeholder="Ex.: SNL-2026-ABCDE23456789" autocomplete="off"><button class="uk-button uk-button-primary" type="submit" [disabled]="loading()">{{ loading() ? 'A consultar…' : 'Consultar' }} <lucide-icon name="search"></lucide-icon></button></div>
        @if (submitted() && reference.invalid) { <small class="error">Introduza a referência completa do reporte.</small> }
        @if (notFound()) { <div class="not-found"><lucide-icon name="circle-alert"></lucide-icon><span>Não encontrámos esta referência. Verifique os caracteres e tente novamente.</span></div> }
        @if (errorMessage()) { <div class="not-found" role="alert"><lucide-icon name="circle-alert"></lucide-icon><span>{{ errorMessage() }}</span></div> }
        <small class="example">Introduza a referência recebida após submeter o reporte.</small>
      </form>
      @if (result(); as incident) {
        <div class="result-grid">
          <div class="result-main">
            <section class="detail-card uk-card uk-card-default">
              <div class="detail-head"><div><span class="overline">REFERÊNCIA DO REPORTE</span><h2>{{ incident.reference }}</h2></div><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></div>
              <div class="incident-summary"><span class="summary-icon"><lucide-icon name="activity"></lucide-icon></span><div><strong>{{ incident.category }}</strong><small>O detalhe do relato é reservado à equipa responsável.</small></div></div>
              <div class="meta-grid"><div><span>Localização aproximada</span><strong>{{ incident.neighborhood ? incident.neighborhood + ', ' : '' }}{{ incident.municipality }}, {{ incident.province }}</strong></div><div><span>Operador</span><strong>{{ incident.provider || 'Não indicado' }}</strong></div><div><span>Data do reporte</span><strong>{{ incident.createdAt | date:'d MMM y, HH:mm':'':'pt-PT' }}</strong></div><div><span>Classificação assistida</span><strong>{{ incident.aiClassification }}</strong></div></div>
            </section>
            <section class="detail-card history-card uk-card uk-card-default">
              <div class="section-title"><h3>Histórico do reporte</h3><span>{{ incident.history.length }} actualizações</span></div>
              <div class="timeline">
                @for (event of incident.history; track $index) {
                  <div class="timeline-event"><span class="timeline-dot" [class.active]="$last"></span><div><strong>{{ event.status }}</strong><small>{{ event.note }}</small><time>{{ event.date | date:'d MMM y, HH:mm':'':'pt-PT' }}</time></div></div>
                }
              </div>
            </section>
          </div>
          <aside class="result-side">
            <div class="next-card uk-card uk-card-default"><span class="side-icon"><lucide-icon name="route"></lucide-icon></span><h3>O que acontece a seguir?</h3><p>Os reportes são analisados e agrupados com outros relatos semelhantes. Os estados são actualizados à medida que a análise avança.</p><a routerLink="/ocorrencias">Explorar outros reportes <lucide-icon name="arrow-up-right"></lucide-icon></a></div>
            <div class="privacy-card"><lucide-icon name="shield-check"></lucide-icon><span>O mapa público apresenta apenas localizações aproximadas. Os reportes não confirmam falhas de rede.</span></div>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#f7f9fb; }
    .page-wrap { max-width:1100px; margin:auto; padding:48px 24px 70px; }
    .page-intro { margin-bottom:28px; text-align:center; }
    .overline { color:#229ca5; font-size:9px; font-weight:800; letter-spacing:1.15px; }
    h1 { margin:9px 0 8px; color:#101a33; font-size:34px; letter-spacing:-1.3px; }
    .page-intro p { margin:0; color:#7f899a; font-size:12px; }
    .lookup-card { max-width:630px; margin:0 auto 24px; padding:21px; border:1px solid #e8edf1; border-radius:11px; }
    label { display:block; margin-bottom:8px; color:#34405a; font-size:10px; font-weight:700; }
    .lookup-row { display:flex; gap:9px; }
    .uk-input { height:42px; border-color:#e1e6ec; border-radius:7px; color:#25314b; font-size:11px; }
    .lookup-row .uk-button { display:inline-flex; align-items:center; gap:8px; height:42px; padding:0 16px; border-radius:7px; background:#0a122a; border-color:#0a122a; color:#fff; font-size:10px; font-weight:700; text-transform:none; white-space:nowrap; }
    .lookup-row lucide-icon { width:14px; height:14px; }
    .example { display:block; margin-top:10px; color:#9aa2b0; font-size:9px; }
    .example button { border:0; padding:0; background:none; color:#179ca6; text-decoration:underline; cursor:pointer; font:inherit; }
    .error { display:block; margin-top:7px; color:#bf534c; font-size:9px; }
    .not-found { display:flex; gap:8px; align-items:center; margin-top:12px; padding:10px; border-radius:7px; background:#fff3f1; color:#a64e47; font-size:10px; line-height:1.5; }
    .not-found lucide-icon { width:15px; height:15px; flex:0 0 15px; }
    .result-grid { display:grid; grid-template-columns:minmax(0, 1.4fr) minmax(230px, .6fr); gap:16px; align-items:start; }
    .result-main { display:grid; gap:14px; }
    .detail-card, .next-card { padding:21px; border:1px solid #e8edf1; border-radius:10px; }
    .detail-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    .detail-head h2 { margin:5px 0 0; color:#15203a; font-size:20px; letter-spacing:.2px; }
    .status-chip { padding:6px 9px; border-radius:5px; font-size:9px; font-weight:700; }
    .status-chip.pending { background:#fff5e8; color:#b37a23; }.status-chip.review { background:#edf2ff; color:#596bd2; }.status-chip.done { background:#e8f7ef; color:#318d64; }
    .incident-summary { display:flex; gap:11px; margin:20px 0; padding:15px; border-radius:8px; background:#f7f9fb; }
    .summary-icon { width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; border-radius:9px; background:#e8f8f8; color:#1b9ca5; }
    .summary-icon lucide-icon { width:16px; height:16px; }
    .incident-summary strong, .incident-summary small { display:block; }
    .incident-summary strong { color:#26314a; font-size:11px; }
    .incident-summary small { margin-top:4px; color:#818b9c; font-size:10px; line-height:1.5; }
    .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:17px 20px; }
    .meta-grid span, .meta-grid strong { display:block; }
    .meta-grid span { margin-bottom:5px; color:#919aaa; font-size:9px; }
    .meta-grid strong { color:#35405a; font-size:10px; }
    .section-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
    .section-title h3 { margin:0; color:#1d2942; font-size:13px; }.section-title span { color:#929bac; font-size:9px; }
    .timeline { display:grid; gap:0; }
    .timeline-event { position:relative; display:flex; gap:12px; padding:0 0 18px; }
    .timeline-event:not(:last-child)::after { content:''; position:absolute; left:5px; top:12px; bottom:0; width:1px; background:#e4e9ef; }
    .timeline-dot { z-index:1; width:11px; height:11px; flex:0 0 11px; margin-top:2px; border:2px solid #cad3dd; border-radius:50%; background:#fff; }
    .timeline-dot.active { border-color:#20b9ca; background:#20b9ca; box-shadow:0 0 0 3px #20b9ca20; }
    .timeline-event strong, .timeline-event small, .timeline-event time { display:block; }
    .timeline-event strong { color:#34405a; font-size:10px; }.timeline-event small { margin:4px 0; color:#8791a1; font-size:9px; }.timeline-event time { color:#a0a8b5; font-size:8px; }
    .next-card { background:#fff; }
    .side-icon { width:35px; height:35px; display:grid; place-items:center; border-radius:10px; background:#eaf8f8; color:#159ca5; }
    .side-icon lucide-icon { width:17px; height:17px; }
    .next-card h3 { margin:14px 0 7px; color:#25314b; font-size:13px; }
    .next-card p { margin:0; color:#828c9d; font-size:10px; line-height:1.7; }
    .next-card a { display:inline-flex; align-items:center; gap:6px; margin-top:15px; color:#159ca5; text-decoration:none; font-size:9px; font-weight:700; }
    .next-card a lucide-icon { width:13px; height:13px; }
    .privacy-card { display:flex; gap:8px; margin-top:12px; padding:12px; border-radius:8px; background:#eef8f7; color:#537981; font-size:9px; line-height:1.6; }
    .privacy-card lucide-icon { width:14px; height:14px; flex:0 0 14px; color:#209ca4; }
    @media (max-width:720px) { .page-wrap { padding:36px 16px 54px; }.result-grid { grid-template-columns:1fr; } }
    @media (max-width:440px) { .lookup-row { flex-direction:column; }.lookup-row .uk-button { justify-content:center; }.meta-grid { grid-template-columns:1fr; gap:13px; } }
  `],
})
export class TrackingComponent {
  private readonly incidentService = inject(IncidentService);
  private readonly route = inject(ActivatedRoute);
  readonly reference = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^SNL-\d{4}-[A-Z2-7]{13}$/i)] });
  readonly submitted = signal(false);
  readonly notFound = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly result = signal<Incident | null>(null);

  constructor() {
    const reference = this.route.snapshot.queryParamMap.get('reference');
    if (reference) {
      this.reference.setValue(reference);
      this.search();
    }
  }

  async search(): Promise<void> {
    this.submitted.set(true);
    this.reference.markAsTouched();
    if (this.reference.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');
    this.notFound.set(false);
    try {
      const incident = await this.incidentService.findByReference(this.reference.value);
      this.result.set(incident);
      this.notFound.set(!incident);
    } catch (error: unknown) {
      console.error('Não foi possível consultar a referência.', error);
      this.errorMessage.set('Não foi possível consultar o reporte. Verifique a ligação à API e tente novamente.');
      this.result.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  statusClass(status: IncidentStatus): string {
    if (status === 'Encerrado') return 'done';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'pending';
  }
}
