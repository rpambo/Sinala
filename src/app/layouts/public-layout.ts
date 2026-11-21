import { Component, HostListener, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { IncidentService } from '../core/services/incident.service';
import { NotificationService } from '../core/services/notification.service';
import { SinalaIconComponent } from '../shared/components/lucide-icon';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, SinalaIconComponent],
  template: `
    <a class="skip-link" href="#main-content">Saltar para o conteúdo</a>
    <header
      class="site-header"
      [class.over-hero]="isHome()"
      [class.is-scrolled]="scrolled()"
      [class.menu-open]="menuOpen()"
    >
      <div class="header-inner">
        <a class="brand" routerLink="/" aria-label="SINALA — página inicial">
          <span class="brand-logo">
            <img src="/assets/images/sinala-logo.png" alt="" width="538" height="188" fetchpriority="high" />
          </span>
        </a>

        <button
          class="mobile-menu"
          type="button"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="main-navigation"
          [attr.aria-label]="menuOpen() ? 'Fechar menu' : 'Abrir menu'"
        >
          <lucide-icon [name]="menuOpen() ? 'x' : 'menu'"></lucide-icon>
        </button>

        <nav id="main-navigation" class="main-nav" [class.open]="menuOpen()" aria-label="Navegação principal">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Início</a>
          <a routerLink="/" fragment="como-funciona" (click)="closeMenu()">Como funciona</a>
          <a routerLink="/mapa" routerLinkActive="active" (click)="closeMenu()">Mapa</a>
          <a routerLink="/ocorrencias" routerLinkActive="active" (click)="closeMenu()">Relatos</a>
          <span class="nav-divider" aria-hidden="true"></span>
          <a class="nav-mobile-account" routerLink="/auth" (click)="closeMenu()">Entrar / Criar conta</a>
        </nav>

        <div class="header-actions">
          @if (auth.isAuthenticated()) {
            <a class="auth-link" routerLink="/conta">A minha conta</a>
            <button type="button" class="auth-link sign-out" (click)="signOut()">Sair</button>
          } @else {
            <a class="auth-link" routerLink="/auth">Entrar</a>
          }
          <a class="header-cta" routerLink="/reportar" aria-label="Reportar problema">
            <span class="header-cta-label">Reportar problema</span>
            <lucide-icon name="arrow-right"></lucide-icon>
          </a>
        </div>
      </div>
    </header>

    @if (incidentService.error()) {
      <div class="api-alert" role="status">{{ incidentService.error() }}</div>
    }

    <main id="main-content"><router-outlet /></main>

    <footer class="site-footer">
      <div class="shell footer-grid">
        <div class="footer-brand-block">
          <a class="brand footer-brand" routerLink="/" aria-label="SINALA — página inicial">
            <span class="brand-logo">
              <img src="/assets/images/sinala-logo.png" alt="" width="538" height="188" loading="lazy" />
            </span>
          </a>
          <p>Uma plataforma pública de relatos comunitários sobre conectividade em Angola.</p>
          <span class="footer-signal"><i aria-hidden="true"></i> REDE COMUNITÁRIA · ANGOLA</span>
        </div>

        <nav class="footer-column" aria-label="Navegação do rodapé">
          <h2>Explorar</h2>
          <a routerLink="/">Início</a>
          <a routerLink="/" fragment="como-funciona">Como funciona</a>
          <a routerLink="/mapa">Mapa de conectividade</a>
          <a routerLink="/ocorrencias">Relatos</a>
        </nav>

        <nav class="footer-column" aria-label="Ações no rodapé">
          <h2>Participar</h2>
          <a routerLink="/reportar">Fazer um relato</a>
          <a routerLink="/acompanhar">Acompanhar registo</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/conta">A minha conta</a>
          } @else {
            <a routerLink="/auth">Criar conta</a>
          }
        </nav>

        <div class="footer-column footer-note-block">
          <h2>Sobre a plataforma</h2>
          <p>Os relatos são experiências partilhadas pela comunidade. Não confirmam falhas de rede e não apresentam moradas pessoais.</p>
          <span>© {{ year }} SINALA</span>
        </div>
      </div>
      <div class="shell footer-bottom">
        <span>Conectividade vista por quem a vive.</span>
        <span>Luanda · Angola</span>
      </div>
    </footer>

    @if (notifications.message()) {
      <div class="toast" role="status">{{ notifications.message() }}</div>
    }
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#f4f6f7; color:#00163f; font-family:'Manrope', sans-serif; }
    .skip-link { position:fixed; z-index:200; top:-60px; left:16px; padding:10px 14px; background:#00a8f0; color:#000f2e; font-size:12px; font-weight:700; text-decoration:none; transition:top .2s ease; }
    .skip-link:focus { top:12px; }
    .site-header { position:sticky; z-index:100; top:0; height:78px; background:#00163f; border-bottom:1px solid #ffffff14; color:#e6f0ff; }
    .site-header.over-hero { position:fixed; left:0; right:0; background:linear-gradient(180deg,#000f2eb3,#000f2e1a); border-bottom-color:#ffffff24; transition:background .3s ease, border-color .3s ease, backdrop-filter .3s ease; }
    .site-header.over-hero.is-scrolled { background:#00163fee; border-bottom-color:#ffffff21; backdrop-filter:blur(14px); }
    .header-inner { width:min(1240px,100% - 64px); height:100%; margin:auto; display:flex; align-items:center; gap:34px; }
    .brand { display:inline-flex; align-items:center; color:#f1f7f9; text-decoration:none; }
    .brand-logo { display:inline-flex; align-items:center; padding:5px 8px; border:1px solid #00a8f04d; background:#e9f3ff; }
    .brand-logo img { display:block; width:132px; height:auto; }
    .main-nav { display:flex; flex:1; align-items:center; gap:28px; }
    .main-nav a { position:relative; display:inline-flex; align-items:center; min-height:32px; color:#b4c7d3; text-decoration:none; font-size:12px; font-weight:600; letter-spacing:.1px; transition:color .2s ease; }
    .main-nav a::after { position:absolute; right:0; bottom:-7px; left:0; height:1px; background:#00a8f0; transform:scaleX(0); transform-origin:left; transition:transform .22s ease; content:''; }
    .main-nav a:hover, .main-nav a.active { color:#f2f9fb; }
    .main-nav a:hover::after, .main-nav a.active::after { transform:scaleX(1); }
    .nav-divider, .nav-mobile-account { display:none; }
    .header-actions { display:flex; align-items:center; gap:20px; margin-left:auto; }
    .auth-link { display:inline-flex; align-items:center; min-height:32px; border:0; padding:0; background:none; color:#b8cbd6; text-decoration:none; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; transition:color .2s ease; }
    .auth-link:hover { color:#00a8f0; }
    .header-cta { display:inline-flex; align-items:center; gap:10px; height:42px; padding:0 16px; background:#00a8f0; color:#000f2e; text-decoration:none; font-size:12px; font-weight:800; white-space:nowrap; transition:background .2s ease; }
    .header-cta:hover { background:#5cc8ff; }
    .header-cta lucide-icon { width:14px; height:14px; }
    .mobile-menu { display:none; border:1px solid #ffffff33; background:#002866; color:#e6f0ff; padding:8px; cursor:pointer; }
    .mobile-menu lucide-icon { width:18px; height:18px; }
    .api-alert { padding:10px 24px; background:#fff3f1; color:#a64e47; text-align:center; font-size:12px; }
    .site-footer { background:#00123a; color:#9cb2c0; }
    .shell { width:min(1240px,100% - 64px); margin-inline:auto; }
    .footer-grid { display:grid; grid-template-columns:1.5fr .8fr .8fr 1fr; gap:48px; padding-top:66px; padding-bottom:54px; }
    .footer-brand .brand-logo { padding:4px 7px; background:#e9f3ff; }
    .footer-brand .brand-logo img { width:118px; }
    .footer-brand-block p { max-width:290px; margin:18px 0 16px; font-size:12px; line-height:1.8; }
    .footer-signal { display:inline-flex; align-items:center; gap:9px; color:#6f8899; font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; letter-spacing:1.2px; }
    .footer-signal i { width:6px; height:6px; border-radius:50%; background:#00a8f0; box-shadow:0 0 8px #00a8f0; }
    .footer-column { display:flex; flex-direction:column; gap:12px; }
    .footer-column h2 { margin:4px 0 8px; color:#e7f1f5; font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; }
    .footer-column a { display:flex; align-items:center; width:max-content; min-height:32px; color:#9db2c1; text-decoration:none; font-size:12px; transition:color .2s ease; }
    .footer-column a:hover { color:#00a8f0; }
    .footer-note-block p { margin:0 0 8px; font-size:12px; line-height:1.8; }
    .footer-note-block span { color:#647d8f; font-size:11px; }
    .footer-bottom { display:flex; justify-content:space-between; gap:16px; padding-top:18px; padding-bottom:24px; border-top:1px solid #ffffff17; color:#698293; font-size:10px; letter-spacing:.3px; }
    .toast { position:fixed; z-index:120; right:20px; bottom:20px; max-width:calc(100vw - 40px); padding:13px 17px; border:1px solid #00a8f056; background:#002866; color:#d6eaff; box-shadow:0 14px 34px #000d2866; font-size:12px; }
    @media(max-width:900px) {
      .header-inner, .footer-grid, .footer-bottom { width:calc(100% - 40px); }
      .site-header { height:68px; }
      .main-nav { position:absolute; top:68px; right:0; left:0; display:none; flex-direction:column; align-items:stretch; gap:0; padding:10px 20px 18px; border-bottom:1px solid #ffffff1f; background:#00163ff7; box-shadow:0 18px 34px #000d2880; backdrop-filter:blur(12px); }
      .main-nav.open { display:flex; }
      .main-nav a { padding:13px 0; border-bottom:1px solid #ffffff14; font-size:13px; }
      .main-nav a::after { display:none; }
      .nav-divider { display:block; height:1px; margin-top:6px; background:#ffffff1f; }
      .nav-mobile-account { display:block; color:#00a8f0!important; }
      .mobile-menu { display:inline-flex; order:3; }
      .header-actions .auth-link { display:none; }
      .footer-grid { grid-template-columns:1fr 1fr; gap:34px 24px; padding-top:48px; }
    }
    @media(max-width:560px) {
      .header-inner, .footer-grid, .footer-bottom { width:calc(100% - 32px); }
      .header-inner { gap:12px; }
      .brand-logo { padding:4px 6px; }
      .brand-logo img { width:112px; }
      .header-cta { height:38px; padding:0 11px; font-size:11px; }
      .header-cta lucide-icon { width:12px; height:12px; }
      .footer-grid { grid-template-columns:1fr; }
      .footer-bottom { flex-direction:column; gap:6px; }
    }
    @media(max-width:380px) {
      .header-inner { gap:8px; }
      .brand-logo img { width:96px; }
      .mobile-menu { min-width:38px; min-height:38px; padding:8px; }
      .header-cta { width:38px; height:38px; justify-content:center; padding:0; }
      .header-cta-label { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
    }
  `],
})
export class PublicLayoutComponent {
  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);
  readonly year = new Date().getFullYear();

  readonly notifications = inject(NotificationService);
  readonly auth = inject(AuthService);
  readonly incidentService = inject(IncidentService);
  private readonly router = inject(Router);

  readonly isHome = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url.split('?')[0] === '/'),
    ),
    { initialValue: this.router.url.split('?')[0] === '/' },
  );

  constructor() {
    void this.incidentService.loadPublic().catch(() => undefined);
    void this.auth.ensureSession().catch(() => undefined);
    this.router.events.pipe(takeUntilDestroyed()).subscribe(() => this.menuOpen.set(false));
    if (typeof window !== 'undefined') this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 24);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  toggleMenu(): void {
    this.menuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.incidentService.switchToPublic().catch(() => undefined);
    await this.router.navigate(['/']);
  }
}
