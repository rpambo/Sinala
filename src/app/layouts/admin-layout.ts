import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { IncidentService } from '../core/services/incident.service';
import { SinalaIconComponent } from '../shared/components/lucide-icon';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SinalaIconComponent],
  template: `
    <div class="admin-shell">
      <aside class="sidebar" [class.sidebar-open]="menuOpen()">
        <a class="brand" routerLink="/admin">
          <span class="brand-mark"><lucide-icon name="radio"></lucide-icon></span>
          <span>SINALA<span class="brand-dot">.</span></span>
        </a>
        <div class="workspace-label">PLATAFORMA</div>
        <nav class="side-nav" aria-label="Navegação administrativa">
          <a routerLink="/admin" routerLinkActive="selected" [routerLinkActiveOptions]="{ exact: true }">
            <lucide-icon name="layout-dashboard"></lucide-icon>Visão geral
          </a>
          <a routerLink="/admin/ocorrencias" routerLinkActive="selected">
            <lucide-icon name="list-filter"></lucide-icon>Ocorrências
          </a>
          <a routerLink="/admin/analytics" routerLinkActive="selected">
            <lucide-icon name="chart-no-axes-combined"></lucide-icon>Análise geográfica
          </a>
          <a routerLink="/admin/ia" routerLinkActive="selected">
            <lucide-icon name="sparkles"></lucide-icon>Análise assistida
          </a>
          <a routerLink="/admin/definicoes" routerLinkActive="selected">
            <lucide-icon name="settings-2"></lucide-icon>Definições
          </a>
        </nav>
        <div class="sidebar-bottom">
          <a routerLink="/"><lucide-icon name="arrow-left"></lucide-icon>Voltar ao portal</a>
          <div class="account">
            <span class="avatar">{{ initials() }}</span>
            <span><strong>{{ auth.user()?.name }}</strong><small>{{ auth.user()?.email }}</small></span>
            <button type="button" class="sign-out" (click)="signOut()">Sair</button>
          </div>
        </div>
      </aside>
      <div class="admin-main">
        @if (incidentService.error()) {
          <div class="api-alert" role="status">{{ incidentService.error() }}</div>
        }
        <header class="admin-topbar">
          <button type="button" class="menu-button" aria-label="Abrir menu" (click)="toggleMenu()">
            <lucide-icon [name]="menuOpen() ? 'x' : 'menu'"></lucide-icon>
          </button>
          <div class="crumb"><span>Administração</span><lucide-icon name="chevron-right"></lucide-icon><strong>SINALA</strong></div>
          <div class="topbar-right">
            <span class="demo-pill"><span></span> Área administrativa</span>
            <button type="button" class="icon-button" aria-label="Notificações"><lucide-icon name="bell"></lucide-icon></button>
            <span class="avatar">{{ initials() }}</span>
          </div>
        </header>
        <main class="admin-content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: #080f21; color: #dce7ff; }
    .admin-shell { min-height: 100vh; display: flex; }
    .sidebar { width:218px; flex:0 0 218px; display:flex; flex-direction:column; padding:18px 12px 13px; background:#080f21; color:#fff; border-right:1px solid #202b45; }
    .brand { display:inline-flex; gap:9px; align-items:center; padding:0 8px; margin-bottom:29px; color:#e4ebfb; text-decoration:none; font-size:14px; font-weight:800; }
    .brand-mark { width:28px; height:28px; display:grid; place-items:center; border-radius:7px; background:#132440; color:#6de0dd; }
    .brand-mark lucide-icon { width: 18px; height: 18px; }
    .brand-dot { color: #20b9ca; }
    .workspace-label { padding:0 12px 10px; color:#71809b; font-size:8px; font-weight:800; letter-spacing:1.1px; }
    .side-nav { display: grid; gap: 5px; }
    .side-nav a, .sidebar-bottom > a { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:6px; color:#9eabc3; text-decoration:none; font-size:10px; font-weight:600; transition:all .18s ease; }
    .side-nav a lucide-icon, .sidebar-bottom > a lucide-icon { width: 16px; height: 16px; }
    .side-nav a:hover, .sidebar-bottom > a:hover { color:#fff; background:#ffffff0b; }
    .side-nav a.selected { color:#fff; background:#15223c; box-shadow:inset 2px 0 #28bdc8; }
    .sidebar-bottom { margin-top: auto; }
    .account { display:flex; gap:9px; align-items:center; margin:18px 4px 0; padding:12px 6px 0; border-top:1px solid #ffffff1a; }
    .account strong, .account small { display: block; }
    .account strong { color:#e1e9fa; font-size:9px; }
    .account small { margin-top:4px; color:#8995ac; font-size:7px; }
    .avatar { width: 30px; height: 30px; flex: 0 0 30px; display: grid; place-items: center; border-radius: 50%; background: #d7eff0; color: #0b6973; font-size: 10px; font-weight: 800; }
    .admin-main { min-width: 0; flex: 1; }
    .admin-topbar { height:56px; display:flex; align-items:center; justify-content:space-between; padding:0 21px; border-bottom:1px solid #202b45; background:#0b1226; }
    .crumb { display:flex; align-items:center; gap:8px; color:#8592aa; font:8px Consolas,monospace; }
    .crumb lucide-icon { width: 12px; height: 12px; }
    .crumb strong { color:#c8d4e9; font-weight:700; }
    .topbar-right { display: flex; align-items: center; gap: 17px; }
    .demo-pill { display:inline-flex; align-items:center; gap:7px; color:#8d9ab3; font:8px Consolas,monospace; }
    .demo-pill span { width:6px; height:6px; border-radius:50%; background:#48d2dc; }
    .icon-button, .menu-button { display:grid; place-items:center; border:0; background:transparent; color:#9eabc3; }
    .icon-button lucide-icon, .menu-button lucide-icon { width: 17px; height: 17px; }
    .admin-content { max-width:1600px; margin:0 auto; padding:20px 21px 40px; }
    .api-alert { padding:10px 20px; background:#fff3f1; color:#a64e47; font-size:11px; }
    .sign-out { margin-left:auto; border:0; background:none; color:#94a4bf; font-size:9px; cursor:pointer; }
    .menu-button { display: none; }
    @media (max-width: 800px) {
      .sidebar { position: fixed; z-index: 30; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform .2s ease; box-shadow: 18px 0 40px #0a122a22; }
      .sidebar.sidebar-open { transform: translateX(0); }
      .admin-topbar { padding: 0 18px; }
      .menu-button { display: grid; }
      .crumb { flex: 1; margin-left: 12px; }
      .demo-pill { display: none; }
      .admin-content { padding: 22px 18px 40px; }
    }
  `],
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly incidentService = inject(IncidentService);
  private readonly router = inject(Router);
  readonly menuOpen = signal(false);

  initials(): string {
    return this.auth.user()?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase() ?? 'SA';
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.incidentService.switchToPublic().catch(() => undefined);
    await this.router.navigate(['/']);
  }
}
