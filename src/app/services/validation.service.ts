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
            'irn number': 'IRN Number',
            'invoice date (dd.mm.yyyy)': 'Invoice Date (dd.mm.yyyy)'
          };

          // Check for missing headers
          for (const key of Object.keys(requiredHeaders)) {
            if (headerMap[key] === undefined) {
              errors.push(`Missing required field: ${requiredHeaders[key]}`);
            }
          }

          // Helper function to convert column index to Excel column letter
          const toExcelColumn = (index: number): string => {
            let result = '';
            while (index >= 0) {
              result = String.fromCharCode(65 + (index % 26)) + result;
              index = Math.floor(index / 26) - 1;
            }
            return result;
          };

          // --- Validate each row ---
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < headers.length) continue;

            const rowErrors: string[] = [];
            const rowNum = i + 1; // Excel row number (1-based)

            // PO/SA Number must be 10 digits
            const poColIndex = headerMap['po/sa number'];
            if (poColIndex !== undefined) {
              const poNumber = row[poColIndex];
              if (poNumber && !/^\d{10}$/.test(poNumber.toString().trim())) {
                const colLetter = toExcelColumn(poColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: PO/SA Number must be exactly 10 digits (found: ${poNumber})`);
              }
            }

            // Excise Amount should be 0
            const exciseColIndex = headerMap['excise amount'];
            if (exciseColIndex !== undefined) {
              const excise = row[exciseColIndex];
              if (excise !== '0' && excise !== 0) {
                const colLetter = toExcelColumn(exciseColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: Excise Amount should be 0 (found: ${excise || 'empty'})`);
              }
            }

            // LR No: "*" if empty, else allow any non-"*"
            const lrColIndex = headerMap['lr no'];
            if (lrColIndex !== undefined) {
              const lr = row[lrColIndex];
              if (!lr || lr.toString().trim() === '') {
                const colLetter = toExcelColumn(lrColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: LR No should be "*" when empty`);
              }
            }

            // Veh No: "*" if empty, else allow any non-"*"
            const vehColIndex = headerMap['veh no'];
            if (vehColIndex !== undefined) {
              const veh = row[vehColIndex];
              if (!veh || veh.toString().trim() === '') {
                const colLetter = toExcelColumn(vehColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: Veh No should be "*" when empty`);
              }
            }

            // IRN Number must be 64 characters or empty
            const irnColIndex = headerMap['irn number'];
            if (irnColIndex !== undefined) {
              const irn = row[irnColIndex];
              if (irn && irn.toString().length !== 64) {
                const colLetter = toExcelColumn(irnColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: IRN Number must be 64 characters (found length: ${irn.toString().length})`);
              }
            }

            // Invoice Date must be dd.mm.yyyy format and not empty
            const dateColIndex = headerMap['invoice date (dd.mm.yyyy)'];
            if (dateColIndex !== undefined) {
              const dateVal = row[dateColIndex]?.toString().trim();
              const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;

              if (!dateVal) {
                const colLetter = toExcelColumn(dateColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: Invoice Date cannot be empty`);
              } else if (!dateRegex.test(dateVal)) {
                const colLetter = toExcelColumn(dateColIndex);
                rowErrors.push(`Cell ${colLetter}${rowNum}: Invoice Date must be in dd.mm.yyyy format (found: ${dateVal})`);
              }
            }

            // Add all row errors to the main errors array
            errors.push(...rowErrors);
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
      { field: 'IRN Number', rule: 'Must be 64 characters or empty', example: 'a1b2c3...' },
      { field: 'Invoice Date (dd.mm.yyyy)', rule: 'Must be in dd.mm.yyyy format (cannot be empty)', example: '23.07.2025' }
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
