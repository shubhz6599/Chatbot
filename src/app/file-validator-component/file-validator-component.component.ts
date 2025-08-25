import { Component } from '@angular/core';

@Component({
  selector: 'app-file-validator-component',
  templateUrl: './file-validator-component.component.html',
  styleUrls: ['./file-validator-component.component.css']
})
export class FileValidatorComponentComponent {
fileValidationMessage: string = '';

  uploadFile(event: any) {
    const file = event.target.files[0];
    if (!file) {
      this.fileValidationMessage = 'No file selected.';
      return;
    }

    const fileExtension = file.name.split('.').pop();
    if (fileExtension !== 'csv') {
      this.fileValidationMessage = 'Invalid file type. Please upload a CSV file.';
      return;
    }

    // Simulate validation
    setTimeout(() => {
      const isValid = Math.random() > 0.5;
      if (isValid) {
        this.fileValidationMessage = 'The file is valid.';
      } else {
        this.fileValidationMessage = 'The file is invalid. Please ensure all requirements are met.';
      }
    }, 1500);
  }
}
