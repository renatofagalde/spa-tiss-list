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

  // Controles de upload - ✅ ARQUIVO ÚNICO
  showUploadDialog = false;
  uploading = false;
  uploadProgress: UploadProgress[] = [];
  selectedFile: File | null = null; // ✅ Mudou de selectedFiles[] para arquivo único

  // Arrays de dados vindos da API real
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

  // ✅ Getters para template do arquivo único
  get hasSelectedFile(): boolean {
    return this.selectedFile !== null;
  }

  get selectedFileSize(): string {
    return this.selectedFile ? this.tissService.formatFileSize(this.selectedFile.size) : '';
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
    public tissService: TissService
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

        this.allFiles = [];
        this.filteredFiles = [];
      }
    });
  }

  // ========== MÉTODOS DE UPLOAD - ✅ ARQUIVO ÚNICO ==========

  openUploadDialog() {
    this.showUploadDialog = true;
    this.selectedFile = null;
    this.uploadProgress = [];
  }

  closeUploadDialog() {
    if (!this.uploading) {
      this.showUploadDialog = false;
      this.selectedFile = null;
      this.uploadProgress = [];
    }
  }

  onFileSelect(event: any) {
    const files = Array.from(event.target.files) as File[];
    if (files.length > 0) {
      this.validateAndSetFile(files[0]); // ✅ Só pega o primeiro arquivo
    }
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []) as File[];
    if (files.length > 0) {
      this.validateAndSetFile(files[0]); // ✅ Só pega o primeiro arquivo
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
  }

  // ✅ Validação e seleção de arquivo único
  validateAndSetFile(file: File) {
    // Validar tipo de arquivo
    if (!this.tissService.isValidFileType(file)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Arquivo inválido',
        detail: `${file.name} - Tipo de arquivo não permitido. Use: .xlsx, .xls, .zip, .xml, .pdf`
      });
      return;
    }

    // ✅ Sem limitação rigorosa de tamanho - aceita arquivos grandes!
    if (!this.tissService.isValidFileSize(file, 1000)) { // 1GB como limite de bom senso
      this.messageService.add({
        severity: 'warn',
        summary: 'Arquivo muito grande',
        detail: `${file.name} - Tamanho máximo sugerido: 1GB`
      });
      return;
    }

    this.selectedFile = file;
    this.messageService.add({
      severity: 'success',
      summary: 'Arquivo selecionado',
      detail: `${file.name} pronto para upload`
    });
  }

  removeFile() {
    this.selectedFile = null;
  }

  clearFiles() {
    this.selectedFile = null;
    this.uploadProgress = [];
  }

  startUpload() {
    if (!this.selectedFile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Nenhum arquivo',
        detail: 'Selecione um arquivo para upload'
      });
      return;
    }

    this.uploading = true;
    this.uploadProgress = [{
      fileName: this.selectedFile.name,
      progress: 0,
      status: 'uploading'
    }];

    this.uploadSingleFile();
  }

  // ✅ Upload de arquivo único usando presigned URL
  private uploadSingleFile() {
    if (!this.selectedFile) return;

    const file = this.selectedFile;
    const progress = this.uploadProgress[0];

    // Simular progresso inicial
    const progressInterval = this.simulateProgress(0);

    this.tissService.uploadFile(file).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        progress.progress = 100;
        progress.status = 'success';
        progress.message = 'Upload concluído com sucesso!';

        this.uploading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Upload concluído',
          detail: `${file.name} enviado com sucesso`
        });

        // ✅ Fechar dialog após sucesso e atualizar listagem
        setTimeout(() => {
          this.closeUploadDialog();
          this.carregarDados(); // Atualizar a lista
        }, 1500);
      },
      error: (error) => {
        clearInterval(progressInterval);
        console.error('Erro no upload:', error);
        progress.progress = 100;
        progress.status = 'error';
        progress.message = error.error?.message || 'Erro no upload';

        this.uploading = false;

        this.messageService.add({
          severity: 'error',
          summary: 'Erro no upload',
          detail: error.error?.message || 'Falha ao enviar arquivo'
        });
      }
    });
  }

  // ✅ Simulação de progresso - retorna interval para poder limpar
  private simulateProgress(index: number): any {
    const progress = this.uploadProgress[index];
    return setInterval(() => {
      if (progress.status !== 'uploading' || progress.progress >= 90) {
        return;
      }
      progress.progress += Math.random() * 15;
      if (progress.progress > 90) {
        progress.progress = 90; // Para no 90% até o upload real terminar
      }
    }, 300);
  }

  // ========== MÉTODOS UTILITÁRIOS ==========

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

  getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  }

  // ========== MÉTODOS DE FILTROS ==========

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

  refreshData() {
    this.messageService.add({
      severity: 'info',
      summary: 'Atualizando dados',
      detail: 'Buscando arquivos mais recentes...'
    });
    this.carregarDados();
  }

  toggleDarkMode() {
    this.themeService.toggleTheme();
  }

  // ========== MÉTODOS PARA ÍCONES E SEVERIDADES ==========

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

  // ========== MÉTODOS DE DOWNLOAD ==========

  downloadFile(file: ProcessedFile) {
    this.messageService.add({
      severity: 'info',
      summary: 'Download iniciado',
      detail: `Baixando ${file.fileName}...`
    });

    this.tissService.downloadFile(file.key).subscribe({
      next: (blob) => {
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
