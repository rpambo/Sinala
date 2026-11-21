import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, SinalaIconComponent],
  templateUrl: './auth-verify-email.html',
  styleUrl: './auth.css',
})
export class VerifyEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly state = signal<'loading' | 'done' | 'error'>('loading');
  readonly message = signal('');
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';

  constructor() {
    if (!this.token) {
      this.state.set('error');
      this.message.set('O link de verificação não contém um token válido.');
      return;
    }
    void this.verify();
  }

  async verify(): Promise<void> {
    this.state.set('loading');
    this.message.set('');
    try {
      const user = await this.auth.verifyEmail(this.token);
      this.state.set('done');
      this.message.set('Email confirmado. A abrir a sua conta…');
      await this.router.navigateByUrl(user.role === 'ADMIN' ? '/admin' : '/conta');
    } catch (error: unknown) {
      this.state.set('error');
      this.message.set(error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
        ? error.error.error
        : 'Não foi possível confirmar o email. O link pode ter expirado.');
    }
  }
}
