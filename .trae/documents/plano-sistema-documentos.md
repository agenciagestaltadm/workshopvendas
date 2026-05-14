# Plano de Implementação: Sistema de Documentos

## Visão Geral
Implementar um sistema completo de documentos na dashboard admin, com ativação/desativação, botão personalizado na página inicial, e página de downloads.

---

## 1. Estrutura do Banco de Dados (Migrações Supabase)

### 1.1 Novas colunas em `site_settings`
- `enable_documents_section` (boolean, default false)
- `documents_button_label` (text, default 'Documentos')
- `documents_page_title` (text, default 'Documentos para Download')
- `documents_page_subtitle` (text, default 'Baixe os documentos disponíveis')

### 1.2 Nova tabela `documents`
- `id` (uuid, primary key)
- `name` (text, not null)
- `description` (text)
- `file_path` (text, not null)
- `file_size` (integer)
- `file_type` (text)
- `is_active` (boolean, default true)
- `download_count` (integer, default 0)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 1.3 Storage Bucket `documents`
- Bucket público para armazenar arquivos
- Políticas RLS para upload/download
- Limite de tamanho: 10MB

### 1.4 Funções RPC
- `get_documents()` - Lista documentos ativos
- `admin_create_document(payload)` - Criar documento
- `admin_update_document(id, payload)` - Atualizar documento
- `admin_delete_document(id)` - Deletar documento
- `increment_download_count(id)` - Incrementar contador

---

## 2. Frontend - Tipos e Hooks

### 2.1 Atualizar `site-settings.ts`
Adicionar ao tipo `SiteSettings`:
- `enable_documents_section: boolean | null`
- `documents_button_label: string | null`
- `documents_page_title: string | null`
- `documents_page_subtitle: string | null`

Adicionar ao `defaultSiteSettings`:
- `enable_documents_section: false`
- `documents_button_label: 'Documentos'`
- `documents_page_title: 'Documentos para Download'`
- `documents_page_subtitle: 'Baixe os documentos disponíveis'`

### 2.2 Criar tipo `Document`
```typescript
export type Document = {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number;
  file_type: string;
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
};

export type CreateDocumentInput = {
  name: string;
  description?: string;
  file: File;
};

export type UpdateDocumentInput = {
  name?: string;
  description?: string;
  file?: File;
};
```

### 2.3 Criar hooks
- `useDocuments()` - Query para listar documentos
- `useCreateDocument()` - Mutation para criar documento
- `useUpdateDocument()` - Mutation para atualizar documento
- `useDeleteDocument()` - Mutation para deletar documento
- `useDownloadDocument()` - Função para download

---

## 3. Frontend - Componentes

### 3.1 Nova Seção na Dashboard Admin
**Arquivo**: `src/components/admin/DocumentsSection.tsx`

Funcionalidades:
- Toggle para ativar/desativar seção de documentos
- Campo para editar label do botão
- Campo para editar título da página
- Campo para editar subtítulo da página
- Lista de documentos com:
  - Nome, descrição, tamanho, contador de downloads
  - Botão para baixar
  - Botão para editar
  - Botão para deletar
- Formulário para adicionar novo documento:
  - Nome (obrigatório)
  - Descrição (opcional)
  - Upload de arquivo (máx 10MB)

### 3.2 Atualizar `SiteSettingsDialog`
Adicionar aba ou seção para configurações de documentos:
- Toggle enable_documents_section
- Input documents_button_label
- Input documents_page_title
- Input documents_page_subtitle

### 3.3 Atualizar Hero/CTA Section
**Arquivo**: `src/components/HeroSection.tsx` ou CTASection

Quando `enable_documents_section` for true:
- Adicionar novo botão ao lado dos botões existentes
- Texto do botão vindo de `documents_button_label`
- Link para `/documentos`

---

## 4. Frontend - Nova Página

### 4.1 Criar Página de Documentos
**Arquivo**: `src/pages/Documents.tsx`

Estrutura:
- Header com título e subtítulo (dos site settings)
- Grid/Lista de documentos disponíveis
- Cada documento mostra:
  - Ícone baseado no tipo de arquivo
  - Nome
  - Descrição (se houver)
  - Tamanho do arquivo
  - Botão de download
- Mensagem quando não há documentos
- Footer padrão

### 4.2 Adicionar Rota
**Arquivo**: `src/App.tsx`

Adicionar:
```typescript
import Documents from './pages/Documents';

// Dentro de AppRoutes
<Route path="/documentos" element={<Documents />} />
```

---

## 5. Frontend - Utilitários

### 5.1 Funções de Formatação
- `formatFileSize(bytes: number): string` - Converte bytes para KB/MB
- `getFileIcon(type: string): LucideIcon` - Retorna ícone apropriado

### 5.2 Validação
- `validateFileSize(file: File, maxSizeMB: number): boolean`
- `validateFileType(file: File, allowedTypes: string[]): boolean`

---

## 6. Ordem de Implementação

### Fase 1: Backend (Migrações)
1. Criar migração SQL com:
   - Novas colunas em site_settings
   - Tabela documents
   - Storage bucket
   - Funções RPC
   - Políticas RLS

### Fase 2: Frontend - Tipos e Hooks
2. Atualizar site-settings.ts
3. Criar tipos Document
4. Criar hooks useDocuments, useCreateDocument, etc.

### Fase 3: Frontend - Admin
5. Criar componente DocumentsSection
6. Atualizar SiteSettingsDialog
7. Testar CRUD de documentos

### Fase 4: Frontend - Página Pública
8. Criar página Documents.tsx
9. Adicionar rota em App.tsx
10. Testar página de downloads

### Fase 5: Integração
11. Atualizar Hero/CTA Section com botão condicional
12. Testar fluxo completo
13. Revisar responsividade

---

## 7. Considerações Técnicas

### Segurança
- Limite de 10MB por arquivo
- Validação de tipos de arquivo permitidos
- URLs de download temporárias (opcional)
- Controle de acesso via RLS

### UX
- Feedback visual durante upload
- Loading states
- Confirmação antes de deletar
- Toasts de sucesso/erro

### Performance
- Lazy loading da página Documents
- Cache de documentos com React Query
- Paginação se necessário

---

## 8. Testes

### Testes Unitários
- Hooks de documentos
- Utilitários de formatação
- Validação de arquivos

### Testes de Integração
- CRUD de documentos
- Upload/download
- Fluxo completo

### Testes E2E
- Navegação até página de documentos
- Download de arquivo
- Acesso admin
