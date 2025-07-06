// src/app/services/tiss.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TissFile {
  key: string;
  last_modified: string;
  etag: string;
  size: number;
  storage_class: string;
}

export interface TissListResponse {
  objects: TissFile[];
  is_truncated: boolean;
  next_marker: string;
}

@Injectable({
  providedIn: 'root'
})
export class TissService {
  private readonly API_BASE = 'https://gz4z111dwi.execute-api.us-east-1.amazonaws.com/production/tiss/api/storage';
  private readonly BUCKET_NAME = 'prd-tiss';

  constructor(private http: HttpClient) {}

  /**
   * Lista todos os arquivos do bucket TISS
   * curl --location 'https://gz4z111dwi.execute-api.us-east-1.amazonaws.com/production/tiss/api/storage/list?bucket_name=prd-tiss' \
   * --header 'Content-Type: application/json' \
   * --header 'X-Request-Journey: list-bucket-files' \
   * --header 'X-Request-ID: 40005644-8403-4d8d-8603-4e2614489daa'
   */
  listFiles(): Observable<TissListResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Request-Journey': 'list-bucket-files',
      'X-Request-ID': this.generateUUID()
    });

    const url = `${this.API_BASE}/list?bucket_name=${this.BUCKET_NAME}`;

    return this.http.get<TissListResponse>(url, { headers });
  }

  /**
   * Gera a URL de download para um arquivo
   * curl --location 'https://gz4z111dwi.execute-api.us-east-1.amazonaws.com/production/tiss/api/storage/download/prd-tiss/processed-tiss/recurso_glosa/2025/07/05/prd001_xmls.zip' \
   * --header 'Content-Type: application/json' \
   * --header 'X-Request-Journey: list-bucket-files' \
   * --header 'X-Request-ID: $(uuidgen)'
   */
  getDownloadUrl(fileKey: string): string {
    return `${this.API_BASE}/download/${this.BUCKET_NAME}/${fileKey}`;
  }

  /**
   * Faz o download de um arquivo
   */
  downloadFile(fileKey: string): Observable<Blob> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Request-Journey': 'download-file',
      'X-Request-ID': this.generateUUID()
    });

    const url = this.getDownloadUrl(fileKey);

    return this.http.get(url, {
      headers,
      responseType: 'blob'
    });
  }

  /**
   * Gera um UUID v4 (como o comando uuidgen)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Converte bytes para formato legível
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extrai informações do path do arquivo baseado na estrutura do bucket
   */
  parseFilePath(key: string) {
    const parts = key.split('/');
    const fileName = parts[parts.length - 1];

    // Determinar categoria baseada no path
    let category = 'Outros';
    if (key.startsWith('processed-tiss/')) {
      category = 'Processados';
    } else if (key.startsWith('incoming/')) {
      category = 'Recebidos';
    }

    // Extrair data do path se possível (formato: YYYY/MM/DD)
    const dateMatch = key.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    let date = '';
    if (dateMatch) {
      date = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
    }

    // Determinar tipo de arquivo
    const isZip = fileName.toLowerCase().endsWith('.zip');
    const isExcel = fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls');

    return {
      fileName,
      category,
      date,
      isZip,
      isExcel,
      fullPath: key
    };
  }
}
