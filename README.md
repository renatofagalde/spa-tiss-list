# SPA TISS List MVP

Este projeto é uma aplicação **Single Page Application (SPA)** desenvolvida com **Angular** utilizando o novo modo **standalone** (sem a necessidade de `AppModule`), visando simplificar a estrutura e melhorar o desempenho da aplicação.

## 🔍 Visão Geral

A aplicação foi criada como parte de um MVP para visualização e interação com dados do padrão TISS. Toda a lógica de backend é baseada em funções **AWS Lambda** escritas em **Golang**, garantindo alta performance, escalabilidade e baixo custo.

## 🌐 Acesso à Aplicação

Você pode acessar a versão hospedada diretamente pelo Firebase Hosting através do link:

👉 [https://spa-tiss-list-mvp.web.app/](https://spa-tiss-list-mvp.web.app/)

A aplicação está **hospedada no Google Firebase**, garantindo alta disponibilidade e distribuição via CDN.

## 🧠 Tecnologias Utilizadas

- Angular (Standalone Components)
- TypeScript / SCSS
- Firebase Hosting
- AWS Lambda (backend em Go)

## 🛠️ Scripts de Build e Deploy

Use os comandos abaixo para compilar e publicar o projeto:

```bash
# Instale as dependências do projeto
npm install

# Build da aplicação para produção
ng build --configuration=production

# Deploy apenas da hospedagem no Firebase
firebase deploy --only hosting
```

## 📁 Estrutura do Projeto (Resumo)

```
spa-tiss-list/
├── src/                  # Código-fonte da aplicação Angular
│   └── app/
│       ├── pages/        # Páginas como Dashboard
│       └── services/     # Serviços como TISS e Tema
├── dist/                 # Saída do build de produção
├── public/               # Arquivos públicos para o Firebase
├── firebase.json         # Configurações do Firebase
├── angular.json          # Configuração do Angular CLI
├── package.json          # Dependências e scripts do projeto
```

## 📌 Observações

- O projeto já está preparado para build e deploy em ambientes produtivos.
- Pode ser usado como base para outros projetos em Angular standalone com backend desacoplado.
