import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = import.meta.env['NG_APP_API_URL'];

  private authStateSubject = new BehaviorSubject<string | null>(null);
  public authState$ = this.authStateSubject.asObservable();
  private userSubject = new BehaviorSubject<Record<string, any> | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    const token = localStorage.getItem('idToken');
    const expiresAt = localStorage.getItem('expiresAt');
    const storedUser = localStorage.getItem('user');
    if (token && expiresAt && new Date().getTime() < parseInt(expiresAt, 10)) {
      this.authStateSubject.next(token);
      if (storedUser) {
        this.userSubject.next(JSON.parse(storedUser));
      } else {
        this.fetchUser();
      }
    }
  }

  private normalizeKeys(data: Record<string, any>): Record<string, any> {
    return Object.keys(data).reduce((acc, key) => {
      const normalizedKey = key
        .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        .replace(/^./, (letter) => letter.toLowerCase());
      acc[normalizedKey] = data[key];
      return acc;
    }, {} as Record<string, any>);
  }

  private saveAuthData(data: {
    idToken: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }): void {
    const expirationTime = new Date().getTime() + data.expiresIn * 1000;
    localStorage.setItem('idToken', data.idToken);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresAt', expirationTime.toString());
    this.updateAuthState(data.idToken);
  }

  private saveUser(data: Record<string, any>): void {
    localStorage.setItem('user', JSON.stringify(data));
    this.userSubject.next(data);
  }

  public updateAuthState(idToken: string | null): void {
    if (!idToken) {
      this.clearAuthData();
    } else {
      this.authStateSubject.next(idToken);
      this.fetchUser();
    }
  }

  private clearAuthData(): void {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');
    this.authStateSubject.next(null);
    this.userSubject.next(null);
  }

  async signup(email: string, password: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/mfa/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Signup failed: ${errorText}`);
    }
  
    return response.json();
  }
  
  async verifyEmail(email: string, confirmationCode: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/mfa/email-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, confirmationCode }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Email verification failed: ${errorText}`);
    }
  
    const result = await response.json();
    console.log('Email Verified:', result);
  }  

  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/mfa/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${errorText}`);
    }
  
    const rawData = await response.json();
    const data = this.normalizeKeys(rawData) as {
      idToken?: string;
      accessToken?: string;
      refreshToken?: string;
      expiresIn?: number;
      message?: string;
      session?: string;
      qrCodeUrl?: string;
      otpauthUrl?: string;
      username?: string;
    };
  
    if (data.message === 'SOFTWARE_TOKEN_MFA required') {
      localStorage.setItem('mfaSession', data.session!);
      return { session: data.session, mfaRequired: true };
    } else if (data.message === 'MFA required') {
      localStorage.setItem('mfaSession', data.session!);
      localStorage.setItem('qrCodeUrl', data.qrCodeUrl!);
      localStorage.setItem('otpauthUrl', data.otpauthUrl!);
      localStorage.setItem('username', data.username!);
  
      return {
        mfaRequired: true,
        session: data.session,
        qrCodeUrl: data.qrCodeUrl,
        otpauthUrl: data.otpauthUrl,
        username: data.username,
      };
    } else if (data.idToken && data.accessToken && data.refreshToken && data.expiresIn) {
      this.saveAuthData(data as {
        idToken: string;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      });
      return data.idToken;
    }
  
    throw new Error('Unexpected login response.');
  }

  async registerMfa(session: string, mfaCode: string): Promise<void> {
    const response = await fetch(`${this.apiUrl}/mfa/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, mfaCode }),
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MFA registration failed: ${errorText}`);
    }
  
    const result = await response.json();
    console.log('MFA Registration Successful:', result);
  }
  
  async verifyMfaCode(session: string, mfaCode: string, username: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session, mfaCode, username }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify MFA code.');
    }

    const rawData = await response.json();
    const data = this.normalizeKeys(rawData) as {
      idToken: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    this.saveAuthData(data);
    return data.idToken;
  }

  async validateToken(): Promise<boolean> {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    const response = await fetch(`${this.apiUrl}/mfa/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();
    if (response.ok && result.user) {
      this.saveUser(result.user);
    }
    return response.ok;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token found.');

    const response = await fetch(`${this.apiUrl}/mfa/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      this.clearAuthData();
      return false;
    }

    const rawData = await response.json();
    const data = this.normalizeKeys(rawData) as {
      idToken: string;
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    this.saveAuthData(data);
    return true;
  }

  async ensureAuthenticated(): Promise<boolean> {
    const expiresAt = localStorage.getItem('expiresAt');
    if (expiresAt && new Date().getTime() < parseInt(expiresAt, 10)) {
      return true;
    }

    try {
      return await this.refreshToken();
    } catch {
      this.logout();
      return false;
    }
  }

  private async fetchUser(): Promise<void> {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const response = await fetch(`${this.apiUrl}/mfa/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.user) {
        this.saveUser(result.user);
      }
    }
  }

  public getUser(): Record<string, any> | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  logout(): void {
    this.clearAuthData();
  }
}
