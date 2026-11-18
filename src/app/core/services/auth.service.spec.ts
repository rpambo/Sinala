import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService, AuthUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the role returned by the server instead of inferring privileges from email', async () => {
    const user: AuthUser = {
      id: 'user-1',
      name: 'Citizen',
      email: 'admin@example.ao',
      role: 'CITIZEN',
    };
    const signIn = service.signIn(user.email, 'password');
    const request = http.expectOne('/api/auth/login');

    expect(request.request.withCredentials).toBeTrue();
    request.flush(user);

    await expectAsync(signIn).toBeResolvedTo(user);
    expect(service.role()).toBe('CITIZEN');
    expect(service.isAuthenticated()).toBeTrue();
  });
});
