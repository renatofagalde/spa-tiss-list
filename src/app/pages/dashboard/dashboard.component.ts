// src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { TissService, TissFile } from '../../services/tiss.service';

interface ProcessedTissFile extends TissFile {
  fileName: string;
  category: string;
  date: string;
  isZip: boolean;
  isExcel: boolean;
  fullPath: string;
  formattedSize: string;
  formattedDate: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    CardModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    SelectModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  files: ProcessedTissFile[] = [];
  filteredFiles: ProcessedTissFile[] = [];
  loading = true;

  // Estatísticas
  totalFiles = 0;
  processedFiles = 0;
  incomingFiles = 0;
  totalSizeFormatted = '0 KB';

  // Filtros
  searchTerm = '';
  selectedCategory = '';
  selectedFileType = '';

  categoryOptions = [
    { label: 'Todas as categorias', value: '' },
    { label: 'Processados', value: 'Processados' },
    { label: 'Recebidos', value: 'Recebidos' },
    { label: 'Outros', value: 'Outros' }
  ];

  fileTypeOptions = [
    { label: 'Todos os tipos', value: '' },
    { label: 'ZIP', value: 'zip' },
    { label: 'Excel', value: 'excel' }
  ];

  constructor(
    private tissService: TissService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.loading = true;

    this.messageService.add({
      severity: 'info',
      summary: 'Carregando',
      detail: 'Buscando arquivos na API TISS...',
      life: 3000
    });

    this.tissService.listFiles().subscribe({
      next: (response) => {
        console.log('✅ Resposta da API:', response);

        this.files = response.objects
          .filter(file => file.key !== 'incoming/' && file.size > 0) // Remove pasta vazia e arquivos vazios
          .map(file => {
            const parsed = this.tissService.parseFilePath(file.key);
            return {
              ...file,
              ...parsed,
              formattedSize: this.tissService.formatFileSize(file.size),
              formattedDate: new Date(file.last_modified).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            };
          })
          .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime());

        this.calculateStats();
        this.applyFilters();
        this.loading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `${this.totalFiles} arquivos carregados da API!`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('❌ Erro ao carregar arquivos da API:', error);
        this.loading = false;

        // Mostrar detalhes específicos do erro
        let errorMessage = 'Erro ao conectar com a API TISS';

        if (error.status === 0) {
          errorMessage = 'Erro de CORS ou rede. Verifique se a API permite requisições do localhost:4200';
        } else if (error.status === 401) {
          errorMessage = 'Erro de autenticação. Verifique os headers da requisição';
        } else if (error.status === 403) {
          errorMessage = 'Acesso negado. Verifique as permissões da API';
        } else if (error.status === 404) {
          errorMessage = 'Endpoint não encontrado. Verifique a URL da API';
        } else if (error.status >= 500) {
          errorMessage = `Erro interno do servidor (${error.status})`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Erro na API',
          detail: errorMessage,
          life: 8000
        });

        // Log detalhado para debug
        console.error('Detalhes do erro:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          message: error.message
        });
      }
    });
  }

  calculateStats(): void {
    this.totalFiles = this.files.length;
    this.processedFiles = this.files.filter(f => f.category === 'Processados').length;
    this.incomingFiles = this.files.filter(f => f.category === 'Recebidos').length;

    const totalSize = this.files.reduce((sum, file) => sum + file.size, 0);
    this.totalSizeFormatted = this.tissService.formatFileSize(totalSize);
  }

  applyFilters(): void {
    this.filteredFiles = this.files.filter(file => {
      const matchesSearch = !this.searchTerm ||
        file.fileName.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesCategory = !this.selectedCategory ||
        file.category === this.selectedCategory;

      const matchesFileType = !this.selectedFileType ||
        (this.selectedFileType === 'zip' && file.isZip) ||
        (this.selectedFileType === 'excel' && file.isExcel);

      return matchesSearch && matchesCategory && matchesFileType;
    });
  }

  refreshData(): void {
    this.loadFiles();
  }

  downloadFile(file: ProcessedTissFile): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Download iniciado',
      detail: `Baixando ${file.fileName}...`,
      life: 3000
    });

    this.tissService.downloadFile(file.key).subscribe({
      next: (blob) => {
        // Criar URL para download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Download concluído',
          detail: `${file.fileName} baixado com sucesso!`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('❌ Erro no download:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro no download',
          detail: `Não foi possível baixar ${file.fileName}. Verifique se o arquivo existe na API.`,
          life: 5000
        });
      }
    });
  }

  copyDownloadUrl(file: ProcessedTissFile): void {
    const url = this.tissService.getDownloadUrl(file.key);
    navigator.clipboard.writeText(url).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'URL copiada',
        detail: 'URL de download copiada para a área de transferência',
        life: 3000
      });
    }).catch(() => {
      // Fallback se clipboard API não estiver disponível
      this.messageService.add({
        severity: 'warn',
        summary: 'URL gerada',
        detail: `URL: ${url}`,
        life: 8000
      });
    });
  }

  getFileIcon(file: ProcessedTissFile): string {
    if (file.isZip) return 'pi pi-file-archive text-blue-500';
    if (file.isExcel) return 'pi pi-file-excel text-green-500';
    return 'pi pi-file text-surface-500';
  }

  getCategorySeverity(category: string): 'success' | 'info' | 'secondary' {
    switch (category) {
      case 'Processados': return 'success';
      case 'Recebidos': return 'info';
      default: return 'secondary';
    }
  }

  getFileType(file: ProcessedTissFile): string {
    if (file.isZip) return 'ZIP';
    if (file.isExcel) return 'XLSX';
    return 'Outros';
  }

  getFileTypeSeverity(file: ProcessedTissFile): 'primary' | 'success' | 'secondary' {
    if (file.isZip) return 'primary';
    if (file.isExcel) return 'success';
    return 'secondary';
  }

  toggleDarkMode(): void {
    const element = document.documentElement;
    element.classList.toggle('dark-mode');

    // Salvar preferência no localStorage
    const isDarkMode = element.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode.toString());
  }
}
