import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAnalysisService } from '../../core/services/ai-analysis.service';
import { IncidentService } from '../../core/services/incident.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-ai-analysis',
  standalone: true,
  imports: [FormsModule, SinalaIconComponent],
  template: `
    <section>
      <div class="page-head"><div><span class="overline">FERRAMENTAS DE ANÁLISE</span><h1>Análise assistida</h1><p>Comparação heurística de relatos por categoria, zona e operador.</p></div><span class="demo-tag"><lucide-icon name="sparkles"></lucide-icon> Sugestões, não decisões</span></div>
      <div class="warning-banner"><lucide-icon name="triangle-alert"></lucide-icon><span>Esta versão não utiliza um modelo de IA. As semelhanças são calculadas por atributos e não confirmam falhas de rede.</span></div>
      <div class="ai-grid">
        <section class="analysis-card uk-card uk-card-default"><div class="card-title"><span class="title-icon"><lucide-icon name="scan-search"></lucide-icon></span><div><h2>Explorar reporte</h2><p>Seleccione um reporte para comparar relatos semelhantes.</p></div></div>
          <label for="incident">Reporte seleccionado</label><select id="incident" class="uk-select" [ngModel]="selectedId()" (ngModelChange)="selectedId.set($event)">@for (incident of incidents(); track incident.id) {<option [value]="incident.id">{{ incident.reference }} · {{ incident.category }} · {{ incident.province }}</option>}</select>
          @if (selectedIncident(); as incident) {
            <div class="selected-report"><span class="overline">REPORTE EM ANÁLISE</span><strong>{{ incident.category }}</strong><p>{{ incident.description }}</p><small>{{ incident.municipality }}, {{ incident.province }} · {{ incident.provider || 'Operador não indicado' }}</small></div>
            <div class="suggestion"><div class="suggestion-head"><span class="ai-mark"><lucide-icon name="sparkles"></lucide-icon></span><div><span class="overline">ESTADO DA CLASSIFICAÇÃO</span><strong>{{ incident.aiClassification }}</strong></div></div><p>A classificação automática ainda não está configurada. As correspondências abaixo são comparações simples por categoria, zona e operador.</p><span class="suggestion-disclaimer">Requer validação humana</span></div>
          } @else { <div class="empty"><lucide-icon name="file-search"></lucide-icon><span>Não existem reportes para analisar.</span></div> }
        </section>
        <section class="analysis-card uk-card uk-card-default"><div class="card-title"><span class="title-icon purple"><lucide-icon name="copy-check"></lucide-icon></span><div><h2>Relatos semelhantes</h2><p>Possíveis correspondências por categoria, zona e operador.</p></div></div>
          @for (match of similar(); track match.incident.id) {
            <article class="match"><div class="match-top"><strong>{{ match.incident.reference }}</strong><span>{{ match.similarity }}% semelhante</span></div><div class="match-category">{{ match.incident.category }}</div><p>{{ match.incident.description }}</p><small>{{ match.incident.municipality }}, {{ match.incident.province }} · {{ match.incident.provider }}</small><div class="similarity-bar"><i [style.width.%]="match.similarity"></i></div></article>
          } @empty { <div class="empty"><lucide-icon name="search-x"></lucide-icon><span>Não foram encontrados relatos semelhantes.</span></div> }
        </section>
      </div>
      <section class="summary-card uk-card uk-card-default"><div class="summary-icon"><lucide-icon name="text-search"></lucide-icon></div><div><span class="overline">RESUMO DOS REPORTES</span><p>{{ summary() }}</p><small>Resumo estatístico da plataforma. Não representa um diagnóstico de operador.</small></div></section>
    </section>
  `,
  styles: [`
    :host { display:block; }.page-head { display:flex; justify-content:space-between; align-items:end; gap:12px; margin-bottom:15px; }.overline { color:#8d97a8; font-size:8px; font-weight:800; letter-spacing:1px; }.page-head h1 { margin:7px 0 5px; color:#111b34; font-size:26px; letter-spacing:-.8px; }.page-head p { margin:0; color:#8993a3; font-size:10px; }.demo-tag { display:flex; align-items:center; gap:6px; color:#7970be; font-size:9px; font-weight:700; }.demo-tag lucide-icon { width:14px; height:14px; }
    .warning-banner { display:flex; align-items:center; gap:8px; margin-bottom:13px; padding:11px; border:1px solid #f1e4c9; border-radius:7px; background:#fffaf0; color:#987947; font-size:9px; line-height:1.55; }.warning-banner lucide-icon { width:15px; height:15px; flex:0 0 15px; }
    .ai-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }.analysis-card { min-width:0; padding:17px; border:1px solid #e8edf1; border-radius:9px; }.card-title { display:flex; align-items:center; gap:10px; margin-bottom:16px; }.title-icon { width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; border-radius:9px; background:#eaf8f8; color:#199ba4; }.title-icon.purple { background:#f0efff; color:#7469cb; }.title-icon lucide-icon { width:16px; height:16px; }.card-title h2 { margin:0; color:#202b44; font-size:12px; }.card-title p { margin:4px 0 0; color:#929baa; font-size:8px; }
    label { display:block; margin-bottom:6px; color:#59667c; font-size:9px; font-weight:700; }.uk-select { height:36px; border-color:#e4e9ef; border-radius:6px; color:#5f6b80; font-size:9px; }
    .selected-report { margin:14px 0; padding:13px; border-radius:7px; background:#f8fafb; }.selected-report .overline { display:block; }.selected-report strong { display:block; margin-top:8px; color:#26314a; font-size:11px; }.selected-report p { margin:5px 0; color:#69758a; font-size:9px; line-height:1.6; }.selected-report small { color:#9aa3b0; font-size:8px; }
    .suggestion { padding:13px; border:1px solid #e7e7f7; border-radius:8px; background:#fbfbff; }.suggestion-head { display:flex; align-items:center; gap:9px; }.ai-mark { width:28px; height:28px; flex:0 0 28px; display:grid; place-items:center; border-radius:8px; background:#efedff; color:#7267c7; }.ai-mark lucide-icon { width:14px; height:14px; }.suggestion-head .overline,.suggestion-head strong { display:block; }.suggestion-head .overline { color:#8f88c3; font-size:7px; }.suggestion-head strong { margin-top:4px; color:#3e3869; font-size:10px; }.confidence { margin-left:auto; color:#665cc0; font-size:13px; font-weight:800; text-align:right; }.confidence small { display:block; color:#9b96bc; font-size:7px; font-weight:500; }.suggestion p { margin:10px 0; color:#85819f; font-size:8px; line-height:1.6; }.suggestion-disclaimer { display:inline-block; padding:4px 6px; border-radius:4px; background:#f2efff; color:#7369bb; font-size:7px; font-weight:700; }
    .match { padding:12px 0; border-top:1px solid #f0f2f5; }.match-top { display:flex; justify-content:space-between; gap:8px; }.match-top strong { color:#288d96; font-size:9px; }.match-top span { color:#766dc1; font-size:8px; font-weight:700; }.match-category { margin-top:5px; color:#35415a; font-size:9px; font-weight:700; }.match p { margin:4px 0; color:#7f899a; font-size:8px; line-height:1.5; }.match small { color:#9aa3b0; font-size:7px; }.similarity-bar { height:3px; margin-top:9px; border-radius:4px; background:#efeff7; }.similarity-bar i { display:block; height:100%; border-radius:4px; background:#8a7dd5; }
    .empty { display:grid; place-items:center; gap:8px; min-height:150px; color:#9aa3b0; font-size:9px; }.empty lucide-icon { width:20px; height:20px; }.summary-card { display:flex; gap:12px; margin-top:13px; padding:16px; border:1px solid #e8edf1; border-radius:9px; }.summary-icon { width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; border-radius:9px; background:#eaf8f8; color:#199ba4; }.summary-icon lucide-icon { width:15px; height:15px; }.summary-card p { margin:6px 0; color:#39455d; font-size:10px; line-height:1.6; }.summary-card small { color:#9aa3b0; font-size:8px; }
    @media(max-width:760px) { .page-head { align-items:flex-start; flex-direction:column; }.ai-grid { grid-template-columns:1fr; } }
  `],
})
export class AiAnalysisComponent {
  private readonly incidentService = inject(IncidentService);
  private readonly aiService = inject(AiAnalysisService);
  readonly incidents = this.incidentService.incidents;
  readonly selectedId = signal(this.incidents()[0]?.id ?? '');
  readonly selectedIncident = computed(() => this.incidents().find((item) => item.id === this.selectedId()) ?? null);
  readonly similar = computed(() => {
    const incident = this.selectedIncident();
    return incident ? this.aiService.findSimilar(incident, this.incidents()) : [];
  });
  readonly summary = computed(() => this.aiService.summarize(this.incidents()));
}
