import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_BYTES,
  passwordBytesValidator,
  passwordsMatchValidator,
} from './password-validators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SinalaIconComponent],
  templateUrl: './auth-reset-password.html',
  styleUrl: './auth.css',
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly errorMessage = signal('');
  readonly form = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, passwordBytesValidator()],
    }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  }, { validators: [passwordsMatchValidator('password', 'confirmation')] });
  protected readonly passwordHint = `Entre ${PASSWORD_MIN_BYTES} e ${PASSWORD_MAX_BYTES} bytes (um carácter ASCII ocupa 1 byte).`;

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.token) return;
    this.busy.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.resetPassword(this.token, this.form.controls.password.value);
      this.done.set(true);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
        ? error.error.error
        : 'Não foi possível redefinir a palavra-passe. Peça um novo link.');
    } finally {
      this.busy.set(false);
    }
  }
}
