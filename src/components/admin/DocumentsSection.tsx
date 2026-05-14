import { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Edit3,
  Plus,
  X,
  File,
  Image,
  Table,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  useAdminDocuments,
  useCreateDocument,
  useUpdateDocument,
  useDeleteDocument,
  formatFileSize,
  getFileIcon,
  type Document,
  type CreateDocumentInput,
  validateFileSize,
  validateFileType,
} from '@/lib/documents';

// File icon component
const FileIcon = ({ fileType, className = 'w-8 h-8' }: { fileType: string; className?: string }) => {
  const iconType = getFileIcon(fileType);
  
  switch (iconType) {
    case 'image':
      return <Image className={`${className} text-purple-500`} />;
    case 'table':
      return <Table className={`${className} text-green-500`} />;
    case 'presentation':
      return <FileText className={`${className} text-orange-500`} />;
    case 'archive':
      return <Archive className={`${className} text-yellow-500`} />;
    case 'file-text':
      return <FileText className={`${className} text-blue-500`} />;
    default:
      return <File className={`${className} text-gray-500`} />;
  }
};

// Document Form Component
interface DocumentFormProps {
  document?: Document | null;
  onSubmit: (data: CreateDocumentInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DocumentForm = ({ document, onSubmit, onCancel, isLoading }: DocumentFormProps) => {
  const [name, setName] = useState(document?.name || '');
  const [description, setDescription] = useState(document?.description || '');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!document && !file) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo',
        variant: 'destructive',
      });
      return;
    }

    if (file && !validateFileSize(file, 10)) {
      toast({
        title: 'Erro',
        description: 'Arquivo muito grande. Tamanho máximo: 10MB',
        variant: 'destructive',
      });
      return;
    }

    if (file && !validateFileType(file)) {
      toast({
        title: 'Erro',
        description: 'Tipo de arquivo não permitido',
        variant: 'destructive',
      });
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      file: file!,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (!validateFileSize(selectedFile, 10)) {
        toast({
          title: 'Erro',
          description: 'Arquivo muito grande. Tamanho máximo: 10MB',
          variant: 'destructive',
        });
        return;
      }

      if (!validateFileType(selectedFile)) {
        toast({
          title: 'Erro',
          description: 'Tipo de arquivo não permitido',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      
      // Auto-fill name if empty
      if (!name) {
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setName(fileName);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Documento *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Manual do Aluno"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição opcional do documento"
          rows={3}
        />
      </div>

      {!document && (
        <div className="space-y-2">
          <Label htmlFor="file">Arquivo *</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {file ? file.name : 'Selecionar arquivo'}
            </Button>
          </div>
          {file && (
            <p className="text-sm text-muted-foreground">
              Tamanho: {formatFileSize(file.size)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tamanho máximo: 10MB. Formatos permitidos: PDF, Word, Excel, PowerPoint, Imagens, ZIP
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : document ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
};

// Main Documents Section Component
export const DocumentsSection = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<Document | null>(null);

  const { data: documents = [], isLoading } = useAdminDocuments();
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  const handleCreate = async (data: CreateDocumentInput) => {
    try {
      await createDocument.mutateAsync(data);
      toast({
        title: 'Sucesso',
        description: 'Documento criado com sucesso',
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar documento',
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (data: CreateDocumentInput) => {
    if (!editingDocument) return;

    try {
      await updateDocument.mutateAsync({
        id: editingDocument.id,
        input: {
          name: data.name,
          description: data.description,
        },
      });
      toast({
        title: 'Sucesso',
        description: 'Documento atualizado com sucesso',
      });
      setEditingDocument(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar documento',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingDocument) return;

    try {
      await deleteDocument.mutateAsync({
        id: deletingDocument.id,
        filePath: deletingDocument.file_path,
      });
      toast({
        title: 'Sucesso',
        description: 'Documento deletado com sucesso',
      });
      setDeletingDocument(null);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao deletar documento',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (document: Document) => {
    try {
      await updateDocument.mutateAsync({
        id: document.id,
        input: {
          is_active: !document.is_active,
        },
      });
      toast({
        title: 'Sucesso',
        description: `Documento ${document.is_active ? 'desativado' : 'ativado'} com sucesso`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar documento',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documentos</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie os documentos disponíveis para download
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <File className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-2">Nenhum documento</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Clique em "Novo Documento" para adicionar o primeiro documento
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                !doc.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-shrink-0">
                <FileIcon fileType={doc.file_type} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{doc.name}</h4>
                  {!doc.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inativo
                    </Badge>
                  )}
                </div>
                {doc.description && (
                  <p className="text-sm text-muted-foreground truncate">
                    {doc.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{doc.download_count} downloads</span>
                  <span>•</span>
                  <span>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(doc)}
                  title={doc.is_active ? 'Desativar' : 'Ativar'}
                >
                  {doc.is_active ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingDocument(doc)}
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingDocument(doc)}
                  className="text-destructive hover:text-destructive"
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
            <DialogDescription>
              Adicione um novo documento para disponibilizar aos usuários.
            </DialogDescription>
          </DialogHeader>
          <DocumentForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createDocument.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Edite as informações do documento.
            </DialogDescription>
          </DialogHeader>
          <DocumentForm
            document={editingDocument}
            onSubmit={handleUpdate}
            onCancel={() => setEditingDocument(null)}
            isLoading={updateDocument.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!deletingDocument} onOpenChange={() => setDeletingDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o documento "{deletingDocument?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDocument.isPending ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentsSection;
