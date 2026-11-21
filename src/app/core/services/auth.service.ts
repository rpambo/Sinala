import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'CITIZEN' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthMessage {
  message: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly user = signal<AuthUser | null>(null);
  readonly role = computed<UserRole>(() => this.user()?.role ?? 'CITIZEN');
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly error = signal('');
  private sessionRequest: Promise<AuthUser | null> | null = null;

  ensureSession(): Promise<AuthUser | null> {
    if (!this.sessionRequest) {
      this.sessionRequest = firstValueFrom(
        this.http.get<AuthUser | null>(`${environment.apiBaseUrl}/auth/session`, { withCredentials: true }),
      ).then((user) => {
        this.user.set(user);
        this.error.set('');
        return user;
      }).catch((error: unknown) => {
        this.sessionRequest = null;
        this.user.set(null);
        this.error.set('Não foi possível verificar a sessão. Confirme se a API está em execução.');
        throw error;
      });
    }
    return this.sessionRequest;
  }

  refreshSession(): Promise<AuthUser | null> {
    this.sessionRequest = null;
    return this.ensureSession();
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const user = await firstValueFrom(this.http.post<AuthUser>(
      `${environment.apiBaseUrl}/auth/login`, { email, password }, { withCredentials: true },
    ));
    this.setAuthenticated(user);
    return user;
  }

  async register(name: string, email: string, password: string): Promise<AuthMessage> {
    const result = await firstValueFrom(this.http.post<AuthMessage>(
      `${environment.apiBaseUrl}/auth/register`, { name, email, password }, { withCredentials: true },
    ));
    return result;
  }

  async verifyEmail(token: string): Promise<AuthUser> {
    const user = await firstValueFrom(this.http.post<AuthUser>(
      `${environment.apiBaseUrl}/auth/verify`, { token }, { withCredentials: true },
    ));
    this.setAuthenticated(user);
    return user;
  }

  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(
      `${environment.apiBaseUrl}/auth/verification/resend`, { email }, { withCredentials: true },
    ));
  }

  async requestRecovery(email: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(
      `${environment.apiBaseUrl}/auth/recovery`, { email }, { withCredentials: true },
    ));
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post<void>(
      `${environment.apiBaseUrl}/auth/reset`, { token, password }, { withCredentials: true },
    ));
    this.clearSessionLocally();
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>(
        `${environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true },
      ));
    } finally {
      this.clearSessionLocally();
    }
  }

  clearSessionLocally(message = ''): void {
    this.sessionRequest = Promise.resolve(null);
    this.user.set(null);
    this.error.set(message);
  }

  private setAuthenticated(user: AuthUser): void {
    this.sessionRequest = Promise.resolve(user);
    this.user.set(user);
    this.error.set('');
  }
}
