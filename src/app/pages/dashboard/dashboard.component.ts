import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../../services/theme.service';
import { TissService, TissFile } from '../../services/tiss.service';

// Interface para arquivos processados para a UI
interface ProcessedFile {
  fileName: string;
  category: string;
  formattedDate: string;
  formattedSize: string;
  type: string;
  key: string;
  originalFile: TissFile;
}

// Interface para controle de upload
interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableModule,
    CardModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectModule,
    ProgressSpinnerModule,
    ProgressBarModule,
    ToastModule,
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  searchTerm = '';
  selectedCategory: any = null;
  selectedFileType: any = null;
  loading = false;

  // Controles de upload
  showUploadDialog = false;
  uploading = false;
  uploadProgress: UploadProgress[] = [];
  selectedFiles: File[] = [];

  // Arrays de dados vindos da API real - SEM DADOS FAKE
  allFiles: ProcessedFile[] = [];
  filteredFiles: ProcessedFile[] = [];

  // Dados das estatísticas (calculados dinamicamente)
  get totalFiles(): number {
    return this.allFiles.length;
  }

  get processedFiles(): number {
    return this.allFiles.filter(f => f.category === 'Processados').length;
  }

  get incomingFiles(): number {
    return this.allFiles.filter(f => f.category === 'Recebidos').length;
  }

  get pendingFiles(): number {
    return this.allFiles.filter(f => f.category === 'Outros').length;
  }

  get totalSizeFormatted(): string {
    if (this.allFiles.length === 0) return '0 KB';

    const totalBytes = this.allFiles.reduce((total, file) => {
      return total + file.originalFile.size;
    }, 0);

    return this.tissService.formatFileSize(totalBytes);
  }

  // Opções para selects
  categoryOptions = [
    { label: 'Todas as categorias', value: null },
    { label: 'Processados', value: 'Processados' },
    { label: 'Recebidos', value: 'Recebidos' },
    { label: 'Outros', value: 'Outros' }
  ];

  fileTypeOptions = [
    { label: 'Todos os tipos', value: null },
    { label: 'ZIP', value: 'ZIP' },
    { label: 'XLSX', value: 'XLSX' },
    { label: 'Outros', value: 'Outros' }
  ];

  constructor(
    private messageService: MessageService,
    public themeService: ThemeService,
    public tissService: TissService  // Tornado público para usar no template
  ) {}

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.loading = true;

    this.tissService.listFiles().subscribe({
      next: (response) => {
        this.allFiles = response.objects.map(file => {
          const pathInfo = this.tissService.parseFilePath(file.key);

          return {
            fileName: pathInfo.fileName,
            category: pathInfo.category,
            formattedDate: pathInfo.date || this.formatDate(file.last_modified),
            formattedSize: this.tissService.formatFileSize(file.size),
            type: this.getFileTypeFromName(pathInfo.fileName),
            key: file.key,
            originalFile: file
          };
        });

        this.filteredFiles = [...this.allFiles];
        this.loading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Dados carregados',
          detail: `${this.allFiles.length} arquivos carregados com sucesso`
        });
      },
      error: (error) => {
        console.error('Erro ao carregar arquivos:', error);
        this.loading = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Erro ao carregar dados',
          detail: 'Não foi possível carregar os arquivos. Verifique sua conexão.'
        });

        // Mantém arrays vazios em caso de erro
        this.allFiles = [];
        this.filteredFiles = [];
      }
    });
  }

  // ========== MÉTODOS DE UPLOAD ==========

  openUploadDialog() {
    this.showUploadDialog = true;
    this.selectedFiles = [];
    this.uploadProgress = [];
  }

  closeUploadDialog() {
    if (!this.uploading) {
      this.showUploadDialog = false;
      this.selectedFiles = [];
      this.uploadProgress = [];
    }
  }

  onFileSelect(event: any) {
    const files = Array.from(event.target.files || event.files) as File[];
    this.validateAndAddFiles(files);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []) as File[];
    this.validateAndAddFiles(files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
  }

  validateAndAddFiles(files: File[]) {
    const validFiles: File[] = [];

    files.forEach(file => {
      // Validar tipo de arquivo
      if (!this.tissService.isValidFileType(file)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Arquivo inválido',
          detail: `${file.name} - Tipo de arquivo não permitido. Use: .xlsx, .xls, .zip, .xml, .pdf`
        });
        return;
      }

      // Validar tamanho (50MB)
      if (!this.tissService.isValidFileSize(file, 50)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Arquivo muito grande',
          detail: `${file.name} - Tamanho máximo permitido: 50MB`
        });
        return;
      }

      // Verificar se já foi adicionado
      if (this.selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Arquivo duplicado',
          detail: `${file.name} já foi adicionado`
        });
        return;
      }

      validFiles.push(file);
    });

    this.selectedFiles = [...this.selectedFiles, ...validFiles];

    if (validFiles.length > 0) {
      this.messageService.add({
        severity: 'success',
        summary: 'Arquivos adicionados',
        detail: `${validFiles.length} arquivo(s) adicionado(s) para upload`
      });
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  clearFiles() {
    this.selectedFiles = [];
    this.uploadProgress = [];
  }

  startUpload() {
    if (this.selectedFiles.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nenhum arquivo',
        detail: 'Selecione pelo menos um arquivo para upload'
      });
      return;
    }

    this.uploading = true;
    this.uploadProgress = this.selectedFiles.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));

    // Upload sequencial para melhor controle
    this.uploadFilesSequentially(0);
  }

  private uploadFilesSequentially(index: number) {
    if (index >= this.selectedFiles.length) {
      // Todos os uploads concluídos
      this.uploading = false;

      const successCount = this.uploadProgress.filter(p => p.status === 'success').length;
      const errorCount = this.uploadProgress.filter(p => p.status === 'error').length;

      if (successCount > 0) {
        this.messageService.add({
          severity: 'success',
          summary: 'Upload concluído',
          detail: `${successCount} arquivo(s) enviado(s) com sucesso`
        });

        // Recarregar a lista após uploads bem-sucedidos
        this.carregarDados();
      }

      if (errorCount > 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Alguns uploads falharam',
          detail: `${errorCount} arquivo(s) falharam no envio`
        });
      }

      return;
    }

    const file = this.selectedFiles[index];
    const progress = this.uploadProgress[index];

    this.tissService.uploadFile(file).subscribe({
      next: (response) => {
        progress.progress = 100;
        progress.status = 'success';
        progress.message = 'Upload concluído';

        // Continuar com o próximo arquivo
        setTimeout(() => this.uploadFilesSequentially(index + 1), 500);
      },
      error: (error) => {
        console.error('Erro no upload:', error);
        progress.progress = 100;
        progress.status = 'error';
        progress.message = error.error?.message || 'Erro no upload';

        // Continuar com o próximo arquivo mesmo com erro
        setTimeout(() => this.uploadFilesSequentially(index + 1), 500);
      }
    });

    // Simular progresso (já que não temos progresso real da API)
    this.simulateProgress(index);
  }

  private simulateProgress(index: number) {
    const progress = this.uploadProgress[index];
    const interval = setInterval(() => {
      if (progress.status !== 'uploading' || progress.progress >= 90) {
        clearInterval(interval);
        return;
      }
      progress.progress += Math.random() * 10;
    }, 200);
  }

  // ========== MÉTODOS ORIGINAIS ==========

  // Método para formatar data
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  // Método para determinar tipo do arquivo pelo nome
  private getFileTypeFromName(fileName: string): string {
    const extension = fileName.split('.').pop()?.toUpperCase();
    switch (extension) {
      case 'ZIP':
        return 'ZIP';
      case 'XLS':
      case 'XLSX':
        return 'XLSX';
      case 'XML':
        return 'XML';
      case 'PDF':
        return 'PDF';
      default:
        return 'Outros';
    }
  }

  refreshData() {
    this.messageService.add({
      severity: 'info',
      summary: 'Atualizando dados',
      detail: 'Buscando arquivos mais recentes...'
    });
    this.carregarDados();
  }

  // Método para obter horário atual
  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  }

  applyFilters() {
    this.filteredFiles = this.allFiles.filter(file => {
      const matchesSearch = !this.searchTerm ||
        file.fileName.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory = !this.selectedCategory ||
        file.category === this.selectedCategory;

      const matchesFileType = !this.selectedFileType ||
        file.type === this.selectedFileType;

      return matchesSearch && matchesCategory && matchesFileType;
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = null;
    this.selectedFileType = null;
    this.filteredFiles = [...this.allFiles];

    this.messageService.add({
      severity: 'info',
      summary: 'Filtros limpos',
      detail: 'Todos os filtros foram removidos'
    });
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  // Métodos para ícones e severidades
  getFileIcon(file: ProcessedFile): string {
    switch (file.type) {
      case 'ZIP':
        return 'pi pi-file-archive text-orange-500';
      case 'XLSX':
        return 'pi pi-file-excel text-green-500';
      case 'XML':
        return 'pi pi-code text-blue-500';
      case 'PDF':
        return 'pi pi-file-pdf text-red-500';
      default:
        return 'pi pi-file text-surface-600';
    }
  }

  getCategorySeverity(category: string): string {
    switch (category) {
      case 'Processados':
        return 'success';
      case 'Recebidos':
        return 'info';
      case 'Outros':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  // Método público para usar no template - retorna o tipo do arquivo
  getFileType(file: ProcessedFile): string {
    return file.type;
  }

  getFileTypeSeverity(file: ProcessedFile): string {
    switch (file.type) {
      case 'ZIP':
        return 'warning';
      case 'XLSX':
        return 'success';
      case 'XML':
        return 'info';
      case 'PDF':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  downloadFile(file: ProcessedFile) {
    this.messageService.add({
      severity: 'info',
      summary: 'Download iniciado',
      detail: `Baixando ${file.fileName}...`
    });

    // Usar o serviço real para download
    this.tissService.downloadFile(file.key).subscribe({
      next: (blob) => {
        // Criar URL do blob e fazer download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        link.click();
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Download concluído',
          detail: `${file.fileName} baixado com sucesso`
        });
      },
      error: (error) => {
        console.error('Erro no download:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro no download',
          detail: `Falha ao baixar ${file.fileName}`
        });
      }
    });
  }

  copyDownloadUrl(file: ProcessedFile) {
    const url = this.tissService.getDownloadUrl(file.key);
    navigator.clipboard.writeText(url).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'URL copiada',
        detail: 'URL de download copiada para a área de transferência'
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Não foi possível copiar a URL'
      });
    });
  }
}
