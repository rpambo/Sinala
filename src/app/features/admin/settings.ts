import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [SinalaIconComponent],
  template: `
    <section>
      <div class="page-head"><span class="overline">CONFIGURAÇÃO</span><h1>Definições</h1><p>Preferências temporárias desta página.</p></div>
      <div class="settings-grid">
        <section class="settings-card sinala-card"><div class="section-head"><span class="section-icon"><lucide-icon name="bell"></lucide-icon></span><div><h2>Notificações</h2><p>Preferências temporárias nesta página.</p></div></div><label class="setting-row"><span><strong>Novos reportes</strong><small>Indicar quando chega um novo reporte.</small></span><input type="checkbox" [checked]="newReports()" (change)="newReports.set(!newReports())"></label><label class="setting-row"><span><strong>Alterações de estado</strong><small>Notificar actualizações de estado.</small></span><input type="checkbox" [checked]="statusUpdates()" (change)="statusUpdates.set(!statusUpdates())"></label></section>
        <section class="settings-card sinala-card"><div class="section-head"><span class="section-icon purple"><lucide-icon name="sparkles"></lucide-icon></span><div><h2>Análise assistida</h2><p>Exibição de correspondências heurísticas.</p></div></div><label class="setting-row"><span><strong>Mostrar sugestões de classificação</strong><small>Comparações por categoria, zona e operador.</small></span><input type="checkbox" [checked]="aiSuggestions()" (change)="aiSuggestions.set(!aiSuggestions())"></label><div class="setting-info"><lucide-icon name="info"></lucide-icon><span>As sugestões não são diagnósticos e devem ser revistas por uma pessoa.</span></div></section>
        <section class="settings-card sinala-card account-card"><div class="section-head"><span class="section-icon blue"><lucide-icon name="user-round"></lucide-icon></span><div><h2>Conta da equipa</h2><p>Sessão autenticada</p></div></div><div class="profile"><span class="avatar">{{ initials() }}</span><span><strong>{{ auth.user()?.name }}</strong><small>{{ auth.user()?.email }} · {{ auth.user()?.role }}</small></span><span class="read-only">Só leitura</span></div></section>
      </div>
      <div class="save-row"><span>As preferências não são persistidas.</span><button type="button" class="button button-primary" (click)="save()"><lucide-icon name="save"></lucide-icon>Aplicar preferências</button></div>
    </section>
  `,
  styles: [`
    :host { display:block; }.page-head { margin-bottom:18px; }.overline { color:#8d97a8; font-size:8px; font-weight:800; letter-spacing:1px; }.page-head h1 { margin:7px 0 5px; color:#00163f; font-size:26px; letter-spacing:-.8px; }.page-head p { margin:0; color:#8993a3; font-size:10px; }.settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:13px; }.settings-card { padding:18px; border:1px solid #e8edf1; border-radius:9px; }.section-head { display:flex; align-items:center; gap:10px; margin-bottom:18px; }.section-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:9px; background:#e9f3ff; color:#0060c0; }.section-icon.purple { background:#eaf2ff; color:#0060c0; }.section-icon.blue { background:#eaf2ff; color:#003090; }.section-icon lucide-icon { width:16px; height:16px; }.section-head h2 { margin:0; color:#00163f; font-size:12px; }.section-head p { margin:4px 0 0; color:#929baa; font-size:8px; }
    .setting-row { display:flex; justify-content:space-between; align-items:center; gap:14px; padding:13px 0; border-top:1px solid #f0f2f5; cursor:pointer; }.setting-row strong,.setting-row small { display:block; }.setting-row strong { color:#39455d; font-size:9px; }.setting-row small { margin-top:4px; color:#929baa; font-size:8px; }.setting-row input { width:30px; height:16px; accent-color:#0090f0; cursor:pointer; }
    .setting-info { display:flex; gap:7px; margin-top:9px; padding:10px; border-radius:6px; background:#eef4ff; color:#0060c0; font-size:8px; line-height:1.5; }.setting-info lucide-icon { width:13px; height:13px; flex:0 0 13px; }
    .account-card { grid-column:1/-1; }.profile { display:flex; align-items:center; gap:10px; padding:13px; border:1px solid #edf0f3; border-radius:7px; }.avatar { width:32px; height:32px; display:grid; place-items:center; border-radius:50%; background:#d6eaff; color:#0b6973; font-size:9px; font-weight:800; }.profile strong,.profile small { display:block; }.profile strong { color:#38445d; font-size:9px; }.profile small { margin-top:4px; color:#929baa; font-size:8px; }.read-only { margin-left:auto; padding:5px 7px; border-radius:4px; background:#f4f6f8; color:#8a93a3; font-size:11px; }
    .save-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:14px; }.save-row > span { color:#969eac; font-size:8px; }.save-row .button { display:flex; align-items:center; gap:7px; min-height:36px; padding:0 12px; border-radius:6px; background:#00123a; border-color:#00123a; color:#fff; font-size:9px; text-transform:none; }.save-row lucide-icon { width:13px; height:13px; }
    @media(max-width:650px) { .settings-grid { grid-template-columns:1fr; }.account-card { grid-column:auto; }.save-row { align-items:flex-start; flex-direction:column; } }
  `],
})
export class AdminSettingsComponent {
  private readonly notifications = inject(NotificationService);
  readonly auth = inject(AuthService);
  readonly newReports = signal(true);
  readonly statusUpdates = signal(true);
  readonly aiSuggestions = signal(true);

  initials(): string {
    return this.auth.user()?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase() ?? 'SA';
  }

  save(): void {
    this.notifications.show('Preferências aplicadas temporariamente.');
  }
}
