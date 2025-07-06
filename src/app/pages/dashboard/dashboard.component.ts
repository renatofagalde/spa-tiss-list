import { Component, OnInit } from '@angular/core';
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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ThemeService } from '../../services/theme.service';

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
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Filtros
  searchTerm = '';
  selectedCategory: any = null;
  selectedFileType: any = null;
  loading = false;

  // Dados das estatísticas
  totalFiles = 41;
  processedFiles = 20;
  incomingFiles = 21;
  totalSizeFormatted = '272.98 KB';

  // Arrays de dados
  filteredFiles = [
    {
      fileName: 'prd001_xmls.zip',
      category: 'Processados',
      formattedDate: '05/07/2025, 03:25',
      formattedSize: '3.49 KB',
      type: 'ZIP'
    },
    {
      fileName: 'prd001.xlsx',
      category: 'Recebidos',
      formattedDate: '05/07/2025, 03:25',
      formattedSize: '9.55 KB',
      type: 'XLSX'
    },
    {
      fileName: 'md5002_xmls.zip',
      category: 'Processados',
      formattedDate: '04/07/2025, 23:26',
      formattedSize: '3.49 KB',
      type: 'ZIP'
    },
    {
      fileName: 'md5002.xlsx',
      category: 'Recebidos',
      formattedDate: '04/07/2025, 23:26',
      formattedSize: '9.55 KB',
      type: 'XLSX'
    }
  ];

  allFiles = [...this.filteredFiles]; // Cópia para filtros

  // Opções para selects
  categoryOptions = [
    { label: 'Todas as categorias', value: null },
    { label: 'Processados', value: 'Processados' },
    { label: 'Recebidos', value: 'Recebidos' }
  ];

  fileTypeOptions = [
    { label: 'Todos os tipos', value: null },
    { label: 'ZIP', value: 'ZIP' },
    { label: 'XLSX', value: 'XLSX' }
  ];

  constructor(
    private messageService: MessageService,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.loading = true;
    // Simular carregamento
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  refreshData() {
    this.messageService.add({
      severity: 'success',
      summary: 'Lista atualizada',
      detail: 'Os dados foram atualizados com sucesso!'
    });
    this.carregarDados();
  }

  // Novos métodos necessários
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
  getFileIcon(file: any): string {
    if (file.type === 'ZIP') {
      return 'pi pi-file-archive text-orange-500';
    } else if (file.type === 'XLSX') {
      return 'pi pi-file-excel text-green-500';
    }
    return 'pi pi-file text-surface-600';
  }

  getCategorySeverity(category: string): string {
    return category === 'Processados' ? 'success' : 'info';
  }

  getFileType(file: any): string {
    return file.type;
  }

  getFileTypeSeverity(file: any): string {
    return file.type === 'ZIP' ? 'warning' : 'success';
  }

  downloadFile(file: any) {
    this.messageService.add({
      severity: 'info',
      summary: 'Download iniciado',
      detail: `Baixando ${file.fileName}...`
    });
    // Implementar lógica de download
  }

  copyDownloadUrl(file: any) {
    // Simular cópia para clipboard
    navigator.clipboard.writeText(`https://example.com/download/${file.fileName}`);
    this.messageService.add({
      severity: 'success',
      summary: 'URL copiada',
      detail: 'URL de download copiada para a área de transferência'
    });
  }
}
