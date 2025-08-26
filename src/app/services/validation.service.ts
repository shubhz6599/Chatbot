import { Injectable } from '@angular/core';
import { Papa } from 'ngx-papaparse';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  constructor(private papa: Papa) {}

  async validateASNFile(file: File): Promise<ValidationResult> {
    return new Promise((resolve) => {
      this.papa.parse(file, {
        skipEmptyLines: true,
        complete: (result) => {
          const errors: string[] = [];
          const data: any[] = result.data;

          if (!data || data.length <= 1) {
            resolve({
              isValid: false,
              message: 'ASN file validation failed',
              errors: ['File is empty or has no data rows'],
              isProcessing: false
            });
            return;
          }

          // --- Normalize headers ---
          const headers: string[] = data[0].map((h: string) => h.trim().toLowerCase());
          const headerMap: { [key: string]: number } = {};
          headers.forEach((h, i) => (headerMap[h] = i));

          const requiredHeaders: { [key: string]: string } = {
            'po/sa number': 'PO/SA Number',
            'excise amount': 'Excise Amount',
            'lr no': 'LR No',
            'veh no': 'Veh No',
            'irn number': 'IRN Number'
          };

          for (const key of Object.keys(requiredHeaders)) {
            if (headerMap[key] === undefined) {
              errors.push(`Missing required field: ${requiredHeaders[key]}`);
            }
          }

          if (errors.length > 0) {
            resolve({
              isValid: false,
              message: 'ASN file validation failed',
              errors,
              isProcessing: false
            });
            return;
          }

          // --- Validate each row ---
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < headers.length) continue;

            // PO/SA Number must be 10 digits
            const poNumber = row[headerMap['po/sa number']];
            if (poNumber && !/^\d{10}$/.test(poNumber)) {
              errors.push(`Row ${i + 1}: PO/SA Number must be exactly 10 digits (found: ${poNumber})`);
            }

            // Excise Amount should be 0
            const excise = row[headerMap['excise amount']];
            if (excise !== '0') {
              errors.push(`Row ${i + 1}: Excise Amount should be 0 (found: ${excise || 'empty'})`);
            }

            // LR No: "*" if empty, else allow any non-"*"
            const lr = row[headerMap['lr no']];
            if (!lr || lr.trim() === '') {
              errors.push(`Row ${i + 1}: LR No should be "*" when empty`);
            } else if (lr === '*') {
              // ok only if intentionally empty
            }

            // Veh No: "*" if empty, else allow any non-"*"
            const veh = row[headerMap['veh no']];
            if (!veh || veh.trim() === '') {
              errors.push(`Row ${i + 1}: Veh No should be "*" when empty`);
            } else if (veh === '*') {
              // ok only if intentionally empty
            }

            // IRN Number must be 64 characters or empty
            const irn = row[headerMap['irn number']];
            if (irn && irn.length !== 64) {
              errors.push(`Row ${i + 1}: IRN Number must be 64 characters (found length: ${irn.length})`);
            }
          }

          const isValid = errors.length === 0;
          resolve({
            isValid,
            message: isValid ? 'ASN file is valid ✅' : 'ASN file validation failed ❌',
            errors,
            isProcessing: false
          });
        },
        error: (error) => {
          resolve({
            isValid: false,
            message: 'Error parsing file',
            errors: [error.message],
            isProcessing: false
          });
        }
      });
    });
  }

  getValidationRules(): ValidationRule[] {
    return [
      { field: 'PO/SA Number', rule: 'Must be exactly 10 digits', example: '1234567890' },
      { field: 'Excise Amount', rule: 'Should always be 0', example: '0' },
      { field: 'LR No', rule: 'If empty, must be "*". If filled, provide actual number', example: '*' },
      { field: 'Veh No', rule: 'If empty, must be "*". If filled, provide actual number', example: '*' },
      { field: 'IRN Number', rule: 'Must be 64 characters or empty', example: 'a1b2c3...' }
    ];
  }
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  errors?: string[];
  isProcessing?: boolean;
}

export interface ValidationRule {
  field: string;
  rule: string;
  example: string;
}
