import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_BYTES,
  passwordBytesValidator,
  passwordsMatchValidator,
} from './password-validators';

type AuthMode = 'login' | 'register' | 'recovery';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SinalaIconComponent],
  templateUrl: './auth-login.html',
  styleUrl: './auth.css',
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly mode = signal<AuthMode>('login');
  readonly message = signal('');
  readonly errorMessage = signal('');
  readonly needsVerification = signal(false);
  readonly busy = signal(false);
  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly registerForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordBytesValidator()],
    }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatchValidator('password', 'confirmation')] });
  readonly recoveryForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.message.set('');
    this.errorMessage.set('');
    this.needsVerification.set(false);
  }

  async submitLogin(): Promise<void> {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;
    this.busy.set(true);
    this.errorMessage.set('');
    this.needsVerification.set(false);
    try {
      const user = await this.auth.signIn(this.loginForm.controls.email.value, this.loginForm.controls.password.value);
      await this.navigateAfterAuth(user.role);
    } catch (error: unknown) {
      this.errorMessage.set(this.apiError(error, 'Não foi possível iniciar sessão. Verifique os seus dados e a ligação à API.'));
      this.needsVerification.set(this.errorCode(error) === 'EMAIL_NOT_VERIFIED');
    } finally {
      this.busy.set(false);
    }
  }

  async resendVerification(): Promise<void> {
    const email = this.loginForm.controls.email.value;
    if (!email) return;
    this.busy.set(true);
    try {
      await this.auth.resendVerification(email);
      this.message.set('Se existir uma conta por verificar, enviámos um novo email.');
      this.needsVerification.set(false);
    } catch {
      this.errorMessage.set('Não foi possível reenviar o email. Tente novamente mais tarde.');
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
      const result = await this.auth.register(name, email, password);
      this.message.set(result.message || 'Enviámos um email de verificação. Confirme o seu endereço antes de entrar.');
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
      this.errorMessage.set(this.apiError(error, 'Não foi possível enviar as instruções. Tente novamente mais tarde.'));
    } finally {
      this.busy.set(false);
    }
  }

  private async navigateAfterAuth(role: string): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : role === 'ADMIN' ? '/admin' : '/conta';
    await this.router.navigateByUrl(destination);
  }

  private apiError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return fallback;
  }

  private errorCode(error: unknown): string {
    return error instanceof HttpErrorResponse && typeof error.error?.code === 'string' ? error.error.code : '';
  }

  protected readonly passwordHint = `Entre ${PASSWORD_MIN_BYTES} e ${PASSWORD_MAX_BYTES} bytes (um carácter ASCII ocupa 1 byte).`;
}
