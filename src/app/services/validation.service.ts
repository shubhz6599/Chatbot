import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private apiUrl = 'https://asn.trialdemo.uk/validate-asn/';
  private createApiUrl = 'https://asn.trialdemo.uk/create-asn/';

  constructor(private http: HttpClient) {}

  validateASNFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(this.apiUrl, formData);
  }

   createASNFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(this.createApiUrl, formData);
  }
}
