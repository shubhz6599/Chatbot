import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // private apiUrl = 'http://localhost:8000/api/answer';
  private apiUrl ='http://144.24.124.252/ask';

  constructor(private http: HttpClient) {}

  askQuestion(question?: string, files?: File[]): Observable<any> {
    const formData = new FormData();
    if (question) {
      formData.append('question', question);
    }

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('image', file, file.name);
      });
    }

 return this.http.post(this.apiUrl, formData, {
  // headers: new HttpHeaders({ 'enctype': 'multipart/form-data' })
});

}
}
