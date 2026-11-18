import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

type AuthMode = 'login' | 'register' | 'recovery';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SinalaIconComponent],
  template: `
    <main class="auth-page">
      <a routerLink="/" class="brand"><span class="brand-mark"><lucide-icon name="radio"></lucide-icon></span>SINALA<span class="brand-dot">.</span></a>
      <section class="auth-card uk-card uk-card-default">
        @if (mode() !== 'recovery') { <div class="tabs"><button type="button" [class.active]="mode() === 'login'" (click)="setMode('login')">Entrar</button><button type="button" [class.active]="mode() === 'register'" (click)="setMode('register')">Criar conta</button></div> }
        @if (mode() === 'login') {
          <div class="auth-heading"><span class="overline">BEM-VINDO DE VOLTA</span><h1>Entrar na SINALA</h1><p>Entre para aceder à sua conta SINALA.</p></div>
          <form [formGroup]="loginForm" (ngSubmit)="submitLogin()"><label for="email">Email</label><input id="email" type="email" class="uk-input" formControlName="email" placeholder="nome@exemplo.ao" autocomplete="email">@if (loginForm.controls.email.touched && loginForm.controls.email.invalid) {<small class="error">Introduza um email válido.</small>}<label for="password">Palavra-passe</label><input id="password" type="password" class="uk-input" formControlName="password" placeholder="A sua palavra-passe" autocomplete="current-password">@if (loginForm.controls.password.touched && loginForm.controls.password.invalid) {<small class="error">Introduza a sua palavra-passe.</small>}<button type="button" class="forgot" (click)="setMode('recovery')">Esqueceu-se da palavra-passe?</button><button type="submit" class="uk-button uk-button-primary submit" [disabled]="busy()">{{ busy() ? 'A validar…' : 'Entrar' }} <lucide-icon name="arrow-right"></lucide-icon></button></form>
        } @else if (mode() === 'register') {
          <div class="auth-heading"><span class="overline">FAÇA PARTE DA COMUNIDADE</span><h1>Criar uma conta</h1><p>Registe-se para acompanhar os seus reportes.</p></div>
          <form [formGroup]="registerForm" (ngSubmit)="submitRegister()"><label for="name">Nome</label><input id="name" class="uk-input" formControlName="name" placeholder="O seu nome" autocomplete="name"><label for="reg-email">Email</label><input id="reg-email" type="email" class="uk-input" formControlName="email" placeholder="nome@exemplo.ao" autocomplete="email"><label for="reg-password">Palavra-passe</label><input id="reg-password" type="password" class="uk-input" formControlName="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password"><button type="submit" class="uk-button uk-button-primary submit" [disabled]="busy()">{{ busy() ? 'A criar conta…' : 'Criar conta' }} <lucide-icon name="arrow-right"></lucide-icon></button></form>
        } @else {
          <div class="auth-heading"><span class="overline">RECUPERAÇÃO DE ACESSO</span><h1>Recuperar palavra-passe</h1><p>Indique o email associado à sua conta.</p></div>
          <form [formGroup]="recoveryForm" (ngSubmit)="submitRecovery()"><label for="recovery-email">Email</label><input id="recovery-email" type="email" class="uk-input" formControlName="email" placeholder="nome@exemplo.ao" autocomplete="email"><button type="submit" class="uk-button uk-button-primary submit" [disabled]="busy()">{{ busy() ? 'A enviar…' : 'Enviar instruções' }} <lucide-icon name="arrow-right"></lucide-icon></button></form><button type="button" class="back-link" (click)="setMode('login')">Voltar a entrar</button>
        }
        @if (message()) { <div class="feedback" role="status"><lucide-icon name="circle-check-big"></lucide-icon><span>{{ message() }}</span>        @if (auth.role() === 'ADMIN') {<a routerLink="/admin">Abrir painel de administração</a>} @else {<a routerLink="/conta">Ver os meus reportes</a>}</div> }
        @if (auth.error()) { <div class="feedback error-feedback" role="alert"><lucide-icon name="circle-alert"></lucide-icon><span>{{ auth.error() }}</span></div> }
        @if (errorMessage()) { <div class="feedback error-feedback" role="alert"><lucide-icon name="circle-alert"></lucide-icon><span>{{ errorMessage() }}</span></div> }
      </section>
      <p class="auth-footer">A sua sessão é protegida pela SINALA. <a routerLink="/">Voltar ao portal</a></p>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background:#f7f9fb; }.auth-page { min-height:100vh; display:flex; align-items:center; flex-direction:column; padding:46px 16px 30px; }.brand { display:flex; align-items:center; gap:9px; margin-bottom:25px; color:#0a122a; text-decoration:none; font-size:18px; font-weight:800; }.brand-mark { width:31px; height:31px; display:grid; place-items:center; border-radius:9px; background:#0a122a; color:#6de0dd; }.brand-mark lucide-icon { width:17px; height:17px; }.brand-dot { margin-left:-8px; color:#20b9ca; }
    .auth-card { width:min(430px,100%); padding:25px; border:1px solid #e7ecf1; border-radius:12px; box-shadow:0 12px 40px #12203b08; }.tabs { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin-bottom:25px; padding:4px; border-radius:7px; background:#f3f5f7; }.tabs button { border:0; border-radius:5px; padding:9px; background:transparent; color:#8490a2; font-size:10px; font-weight:700; cursor:pointer; }.tabs button.active { background:#fff; color:#26334c; box-shadow:0 1px 5px #0a122a10; }
    .overline { color:#229ca5; font-size:8px; font-weight:800; letter-spacing:1px; }.auth-heading { margin-bottom:20px; }.auth-heading h1 { margin:8px 0 6px; color:#121c35; font-size:23px; letter-spacing:-.7px; }.auth-heading p { margin:0; color:#8993a3; font-size:10px; }
    label { display:block; margin:15px 0 6px; color:#34405a; font-size:9px; font-weight:700; }.uk-input { height:40px; border-color:#e1e6ec; border-radius:6px; font-size:10px; }.error { display:block; margin-top:5px; color:#bf534c; font-size:8px; }.forgot,.back-link { display:block; margin:10px 0 0 auto; border:0; background:none; color:#2199a3; font-size:9px; cursor:pointer; }.submit { width:100%; display:flex; justify-content:center; align-items:center; gap:8px; min-height:40px; margin-top:18px; border-radius:6px; background:#0a122a; border-color:#0a122a; color:#fff; font-size:10px; font-weight:700; text-transform:none; }.submit lucide-icon { width:13px; height:13px; }
    .back-link { margin:14px 0 0; padding:0; }
    .feedback { display:grid; grid-template-columns:16px 1fr; gap:7px; margin-top:17px; padding:10px; border-radius:7px; background:#eff8f4; color:#32845f; font-size:9px; line-height:1.5; }.feedback lucide-icon { width:14px; height:14px; }.feedback a { grid-column:2; color:#178d79; font-weight:700; text-decoration:none; }.feedback.error-feedback { background:#fff3f1; color:#a64e47; }
    .auth-footer { max-width:430px; margin:15px auto 0; color:#98a1af; font-size:8px; line-height:1.6; text-align:center; }.auth-footer a { color:#278f98; text-decoration:none; }
  `],
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  readonly mode = signal<AuthMode>('login');
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly busy = signal(false);
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });
  readonly recoveryForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.message.set('');
    this.errorMessage.set('');
  }

  async submitLogin(): Promise<void> {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;
    this.busy.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.signIn(this.loginForm.controls.email.value, this.loginForm.controls.password.value);
      this.message.set('Sessão iniciada com sucesso.');
    } catch (error: unknown) {
      this.errorMessage.set(this.apiError(error, 'Não foi possível iniciar sessão. Verifique os seus dados e a ligação à API.'));
    } finally {
      this.busy.set(false);
    }
  }

  async submitRegister(): Promise<void> {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid) return;
    this.busy.set(true);
    this.errorMessage.set('');
    try {
      const { name, email, password } = this.registerForm.getRawValue();
      await this.auth.register(name, email, password);
      this.message.set('A sua conta foi criada.');
    } catch (error: unknown) {
      this.errorMessage.set(this.apiError(error, 'Não foi possível criar a conta. Tente novamente.'));
    } finally {
      this.busy.set(false);
    }
  }

  async submitRecovery(): Promise<void> {
    this.recoveryForm.markAllAsTouched();
    if (this.recoveryForm.invalid) return;
    this.busy.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.requestRecovery(this.recoveryForm.controls.email.value);
      this.message.set('Se a conta existir, receberá instruções para recuperar o acesso.');
    } catch (error: unknown) {
      this.errorMessage.set(this.apiError(error, 'A recuperação de palavra-passe não está configurada neste servidor.'));
    } finally {
      this.busy.set(false);
    }
  }

  private apiError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return fallback;
  }
}
