import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

export interface UploadResponse {
  success: boolean;
  message?: string;
  key?: string;
  error?: string;
}

// ✅ Novas interfaces para presigned URL
export interface PresignedUrlRequest {
  bucket_name: string;
  key: string;
  content_type: string;
  expires: number;
  metadata: {
    department: string;
    author: string;
    version: string;
  };
}

export interface PresignedUrlResponse {
  upload_url: string;
  bucket_name: string;
  key: string;
  expires_at: string;
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
   * ✅ NOVO: Upload usando presigned URL (sem limitação de 5MB!)
   * 1. Solicita presigned URL do backend
   * 2. Faz upload direto para S3
   */
  uploadFile(file: File, customFileName?: string): Observable<UploadResponse> {
    // Nome do arquivo: usar customFileName se fornecido, senão usar nome original
    const fileName = customFileName || file.name;

    // ✅ Detectar hostname para usar como author
    const hostname = window.location.hostname;

    // Preparar requisição para presigned URL
    const presignedRequest: PresignedUrlRequest = {
      bucket_name: this.BUCKET_NAME,
      key: fileName, // O backend vai automaticamente adicionar "incoming/" se necessário
      content_type: file.type || 'application/octet-stream',
      expires: 1800, // 30 minutos
      metadata: {
        department: 'tiss',
        author: hostname, // ✅ Host que está rodando o app Angular
        version: '1.0'
      }
    };

    // 1. Solicitar presigned URL
    return this.getPresignedUrl(presignedRequest).pipe(
      // 2. Usar a URL para upload direto
      switchMap((presignedResponse) =>
        this.uploadToS3(presignedResponse.upload_url, file, presignedResponse.key)
      )
    );
  }

  /**
   * ✅ Solicita presigned URL do backend
   */
  private getPresignedUrl(request: PresignedUrlRequest): Observable<PresignedUrlResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Request-Journey': 'upload-with-metadata',
      'X-Request-ID': this.generateUUID()
    });

    const url = `${this.API_BASE}/presigned-url`;
    return this.http.post<PresignedUrlResponse>(url, request, { headers });
  }

  /**
   * ✅ Faz upload direto para S3 usando presigned URL
   * Envia apenas Content-Type (sem metadados)
   */
  private uploadToS3(uploadUrl: string, file: File, finalKey: string): Observable<UploadResponse> {
    const headers = new HttpHeaders({
      'Content-Type': file.type || 'application/octet-stream'
    });

    return new Observable<UploadResponse>(observer => {
      this.http.put(uploadUrl, file, {
        headers,
        observe: 'response'
      }).subscribe({
        next: (response) => {
          if (response.status === 200) {
            observer.next({
              success: true,
              message: 'Upload realizado com sucesso',
              key: finalKey
            });
          } else {
            observer.next({
              success: false,
              error: `Upload falhou com status: ${response.status}`
            });
          }
          observer.complete();
        },
        error: (error) => {
          console.error('Erro no upload para S3:', error);
          observer.next({
            success: false,
            error: error.error?.message || 'Erro no upload para S3'
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * Gera a URL de download para um arquivo
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

  /**
   * Valida se o arquivo é um tipo permitido
   */
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/zip', // .zip
      'text/xml', // .xml
      'application/xml', // .xml
      'application/pdf' // .pdf
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.zip', '.xml', '.pdf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    return allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);
  }

  /**
   * ✅ Removida limitação de tamanho - agora sem limite!
   * Mas mantemos validação opcional para UX
   */
  isValidFileSize(file: File, maxSizeMB: number = 1000): boolean { // ✅ Aumentado para 1GB como exemplo
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}
