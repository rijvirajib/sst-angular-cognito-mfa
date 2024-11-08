import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router'; // Import Router
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  mfaSetupForm!: FormGroup;
  errorMessage = '';
  successMessage = '';
  qrCodeUrl: string | null = null;
  otpauthUrl: string | null = null;
  isFirstTimeMfaSetup = false;
  session: string | null = null;
  username: string | null = null;
  isLoading = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.mfaSetupForm = this.fb.group({
      mfaCode: ['', Validators.required],
    });
  }

  onLogIn() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.errorMessage = '';
      this.successMessage = '';
      this.isLoading = true;
  
      this.authService.login(email, password).then(
        (response: any) => {
          this.isLoading = false;
  
          if (response.mfaRequired) {
            this.session = response.session;
            this.username = email;
  
            if (response.qrCodeUrl && response.otpauthUrl) {
              this.qrCodeUrl = response.qrCodeUrl;
              this.otpauthUrl = response.otpauthUrl;
              this.isFirstTimeMfaSetup = true; // Set for first-time setup
            }
          } else if (response.idToken) {
            this.router.navigate(['/dashboard']);
          }
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Login failed.';
        }
      );
    }
  }
  

  onMfaSubmit() {
    if (this.mfaSetupForm.valid && this.session) {
      const mfaCode = this.mfaSetupForm.value.mfaCode;
      this.isLoading = true; // Set loading state

      this.authService.verifyMfaCode(this.session, mfaCode, this.username!).then(
        (idToken: string) => {
          this.isLoading = false; // Reset loading state
          this.authService.updateAuthState(idToken);
          this.resetMfaState();
          this.router.navigate(['/dashboard']); // Navigate to the dashboard
        },
        (error) => {
          this.isLoading = false; // Reset loading state
          this.errorMessage = error.message || 'Failed to verify MFA code.';
        }
      );
    }
  }

  onMfaRegister() {
    if (this.mfaSetupForm.valid && this.session) {
      const mfaCode = this.mfaSetupForm.value.mfaCode;
      this.isLoading = true;
  
      this.authService.registerMfa(this.session, mfaCode).then(
        () => {
          this.isLoading = false;
          this.successMessage = 'MFA setup completed successfully. Please log in again.';
          this.resetMfaState();
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Failed to complete MFA setup.';
        }
      );
    }
  }
  

  resetMfaState() {
    this.qrCodeUrl = null;
    this.otpauthUrl = null;
    this.session = null;
    this.username = null;
    this.errorMessage = '';
    this.isFirstTimeMfaSetup = false;
  }
}
