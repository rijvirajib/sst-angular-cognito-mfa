import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss'],
})
export class ConfirmComponent implements OnInit {
  confirmForm!: FormGroup;
  successMessage = '';
  errorMessage = '';
  isLoading = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.confirmForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      confirmationCode: ['', Validators.required],
    });
  }

  onConfirm() {
    if (this.confirmForm.valid) {
      this.isLoading = true;
      const { email, confirmationCode } = this.confirmForm.value;

      this.authService.verifyEmail(email, confirmationCode).then(
        () => {
          this.isLoading = false;
          this.successMessage = 'Email verified successfully. Redirecting you to login or click <a href="/login">login</a> to go immediately.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Failed to verify email. Please try again.';
        }
      );
    }
  }
}

