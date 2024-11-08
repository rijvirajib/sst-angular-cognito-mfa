import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSignup() {
    if (this.signupForm.valid) {
      this.isLoading = true;
      const { email, password } = this.signupForm.value;

      this.authService.signup(email, password).then(
        () => {
          this.isLoading = false;
          this.successMessage = 'Signup successful! Please check your email for the <a href="/confirm">confirmation code</a>.';
          setTimeout(() => {
            this.router.navigate(['/confirm']);
          }, 3000); // Optional delay before redirect
        },
        (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Failed to sign up.';
        }
      );
    }
  }
}

