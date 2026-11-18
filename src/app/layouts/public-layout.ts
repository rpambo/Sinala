import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { IncidentService } from '../core/services/incident.service';
import { NotificationService } from '../core/services/notification.service';
import { SinalaIconComponent } from '../shared/components/lucide-icon';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SinalaIconComponent],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/" aria-label="SINALA — página inicial">
        <span class="brand-mark"><lucide-icon name="radio"></lucide-icon></span>
        <span>SINALA<span class="brand-dot">.</span></span>
      </a>
      <button class="mobile-menu" type="button" (click)="toggleMenu()" aria-label="Abrir menu">
        <lucide-icon [name]="menuOpen() ? 'x' : 'menu'"></lucide-icon>
      </button>
      <nav class="main-nav" [class.open]="menuOpen()" aria-label="Navegação principal">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="menuOpen.set(false)">Início</a>
        <a routerLink="/mapa" routerLinkActive="active" (click)="menuOpen.set(false)">Mapa</a>
        <a routerLink="/ocorrencias" routerLinkActive="active" (click)="menuOpen.set(false)">Relatos</a>
        <a routerLink="/" fragment="como-funciona" (click)="menuOpen.set(false)">Como funciona</a>
      </nav>
      <div class="header-actions">
        @if (auth.isAuthenticated()) {
          <a class="auth-link" routerLink="/conta">A minha conta</a>
          <button type="button" class="auth-link" (click)="signOut()">Sair</button>
        } @else {
          <a class="auth-link" routerLink="/auth">Entrar</a>
        }
        <a class="uk-button uk-button-primary report-link" routerLink="/reportar">
          Reportar problema <lucide-icon name="arrow-right"></lucide-icon>
        </a>
      </div>
    </header>
    @if (incidentService.error()) {
      <div class="api-alert" role="status">{{ incidentService.error() }}</div>
    }
    <main><router-outlet /></main>
    <footer class="site-footer">
      <a class="brand footer-brand" routerLink="/">
        <span class="brand-mark"><lucide-icon name="radio"></lucide-icon></span>
        <span>SINALA<span class="brand-dot">.</span></span>
      </a>
      <p>Uma plataforma pública de relatos comunitários sobre conectividade.</p>
      <span class="footer-note">Relatos comunitários · Angola</span>
    </footer>
    @if (notifications.message()) {
      <div class="toast" role="status">{{ notifications.message() }}</div>
    }
  `,
  styles: [`
    :host { display:block; min-height:100vh; color:#14243b; background:#f5f2eb; }
    .site-header { position:relative; z-index:20; min-height:78px; display:flex; align-items:center; gap:48px; padding:0 max(24px,calc((100vw - 1240px)/2)); border-bottom:1px solid #e2e3dd; background:#fbfaf6; }
    .brand { display:inline-flex; align-items:center; gap:10px; color:#14263e; text-decoration:none; font-size:20px; font-weight:800; letter-spacing:-.8px; }
    .brand-mark { width:36px; height:36px; display:grid; place-items:center; border-radius:4px; background:#12273d; color:#6bd3d5; }
    .brand-mark lucide-icon { width:18px; height:18px; }.brand-dot { color:#1e9aa6; }
    .main-nav { display:flex; align-items:center; gap:30px; flex:1; }
    .main-nav a { color:#637287; text-decoration:none; font-size:13px; font-weight:600; transition:color .18s; }
    .main-nav a:hover,.main-nav a.active { color:#152b43; }
    .header-actions { display:flex; align-items:center; }
    .auth-link { border:0; background:none; color:#344c64; text-decoration:none; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; }
    .api-alert { padding:10px 24px; background:#fff3f1; color:#a64e47; text-align:center; font-size:12px; }
    .report-link { display:inline-flex; align-items:center; gap:9px; min-height:44px; padding:0 16px; border:1px solid #132a42; border-radius:3px; background:#132a42; color:#fff; font-size:12px; font-weight:700; text-transform:none; white-space:nowrap; }
    .report-link:hover { border-color:#1d405c; background:#1d405c; color:#fff; }
    .report-link lucide-icon { width:14px; height:14px; }
    .mobile-menu { display:none; border:1px solid #e1e7ed; border-radius:6px; background:#fff; color:#1b334d; padding:8px; }.mobile-menu lucide-icon { width:18px; height:18px; }
    .site-footer { display:flex; align-items:center; gap:20px; padding:22px max(24px,calc((100vw - 1240px)/2)); border-top:1px solid #e2e3dd; background:#fbfaf6; }
    .footer-brand { font-size:15px; }.footer-brand .brand-mark { width:30px; height:30px; border-radius:4px; }
    .site-footer p { flex:1; margin:0; color:#68788a; font-size:12px; }.footer-note { color:#7f8da0; font-size:11px; }
    .toast { position:fixed; z-index:30; right:20px; bottom:20px; padding:12px 16px; border:1px solid #344360; border-radius:7px; background:#16213b; color:#dce7ff; box-shadow:0 12px 30px #02061133; font-size:11px; }
    @media(max-width:820px) {
      .site-header { min-height:68px; gap:12px; padding:0 18px; }
      .mobile-menu { display:inline-flex; order:3; }.header-actions { margin-left:auto; }
      .main-nav { display:none; position:absolute; top:67px; left:0; right:0; padding:10px 18px 14px; border-bottom:1px solid #e3e8ee; background:#fbfaf6; box-shadow:0 12px 24px #172e4612; }
      .main-nav.open { display:grid; gap:0; }.main-nav a { padding:12px 3px; border-bottom:1px solid #edf0f4; font-size:12px; }
      .site-footer { flex-wrap:wrap; gap:10px; padding:17px 18px; }.site-footer p { min-width:100%; order:3; }
    }
    @media(max-width:440px) { .site-header { padding:0 14px; }.report-link { min-height:38px; padding:0 10px; font-size:10px; }.brand { font-size:17px; } }
  `],
})
export class PublicLayoutComponent {
  readonly menuOpen = signal(false);
  readonly notifications = inject(NotificationService);
  readonly auth = inject(AuthService);
  readonly incidentService = inject(IncidentService);
  private readonly router = inject(Router);

  constructor() {
    void this.incidentService.loadPublic().catch(() => undefined);
    void this.auth.ensureSession().catch(() => undefined);
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
