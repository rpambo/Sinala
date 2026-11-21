import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const user: AuthUser = {
    id: 'user-1',
    name: 'Citizen',
    email: 'admin@example.ao',
    role: 'CITIZEN',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the role returned by the server instead of inferring privileges from email', async () => {
    const signIn = service.signIn(user.email, 'password');
    const request = http.expectOne('/api/auth/login');

    expect(request.request.withCredentials).toBeTrue();
    request.flush(user);

    await expectAsync(signIn).toBeResolvedTo(user);
    expect(service.role()).toBe('CITIZEN');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('registers without starting a session', async () => {
    const registration = service.register('Citizen', user.email, 'password12');
    const request = http.expectOne('/api/auth/register');
    const message = { message: 'Enviámos um email de verificação.', email: user.email };

    expect(request.request.method).toBe('POST');
    request.flush(message);

    await expectAsync(registration).toBeResolvedTo(message);
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('starts a session after email verification', async () => {
    const verification = service.verifyEmail('a'.repeat(64));
    const request = http.expectOne('/api/auth/verify');

    expect(request.request.body).toEqual({ token: 'a'.repeat(64) });
    request.flush(user);

    await expectAsync(verification).toBeResolvedTo(user);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('clears the local session after a password reset', async () => {
    await service.signIn(user.email, 'password');
    http.expectOne('/api/auth/login').flush(user);
    const session = service.ensureSession();
    http.expectOne('/api/auth/session').flush(user);
    await session;

    const reset = service.resetPassword('b'.repeat(64), 'newpassword12');
    const request = http.expectOne('/api/auth/reset');
    expect(request.request.body).toEqual({ token: 'b'.repeat(64), password: 'newpassword12' });
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expectAsync(reset).toBeResolved();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('clears the local session even when sign out fails', async () => {
    await service.signIn(user.email, 'password');
    http.expectOne('/api/auth/login').flush(user);

    const signOut = service.signOut();
    http.expectOne('/api/auth/logout').flush({ error: ' falha ' }, { status: 500, statusText: 'Server Error' });

    await expectAsync(signOut).toBeRejected();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
