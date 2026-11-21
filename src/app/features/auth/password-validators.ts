import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PASSWORD_MIN_BYTES = 8;
export const PASSWORD_MAX_BYTES = 72;

export function passwordBytesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    if (!value) return null;
    const length = new TextEncoder().encode(value).length;
    return length >= PASSWORD_MIN_BYTES && length <= PASSWORD_MAX_BYTES
      ? null
      : { passwordBytes: true };
  };
}

export function passwordsMatchValidator(passwordKey: string, confirmationKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get(passwordKey)?.value;
    const confirmation = control.get(confirmationKey)?.value;
    return password === confirmation ? null : { passwordMismatch: true };
  };
}
