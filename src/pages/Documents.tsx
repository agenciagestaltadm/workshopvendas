import { 
  FileText, 
  Download, 
  File, 
  Image, 
  Table, 
  Archive, 
  ArrowLeft, 
  FileStack,
  Search,
  Grid3X3,
  List,
  Clock,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import Footer from '@/components/Footer';
import { useSiteSettings } from '@/lib/site-settings';
import {
  useDocuments,
  downloadDocument,
  formatFileSize,
  getFileIcon,
  type Document,
} from '@/lib/documents';

// File icon component with larger size
const FileIcon = ({ fileType, className = 'w-16 h-16' }: { fileType: string; className?: string }) => {
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

// Modern Document Card Component
const DocumentCard = ({ document, viewMode }: { document: Document; viewMode: 'grid' | 'list' }) => {
  const handleDownload = async () => {
    try {
      await downloadDocument(document);
      toast({
        title: 'Download iniciado',
        description: 'O download do documento foi iniciado',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer o download do documento',
        variant: 'destructive',
      });
    }
  };

  if (viewMode === 'list') {
    return (
      <Card className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex-shrink-0">
              <FileIcon fileType={document.file_type} className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">
                {document.name}
              </h3>
              {document.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {document.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(document.file_size)}</span>
                <span>•</span>
                <span>{document.download_count} downloads</span>
                <span>•</span>
                <span>{new Date(document.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
            <Button
              onClick={handleDownload}
              className="flex-shrink-0 h-12 px-6 rounded-xl"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white h-full flex flex-col">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-all duration-500" />
      
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="relative p-6 flex flex-col flex-1">
        {/* Icon and File Info */}
        <div className="flex items-start justify-between mb-5">
          <div className="p-4 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 rounded-2xl shadow-inner">
            <FileIcon fileType={document.file_type} className="w-14 h-14" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="secondary" className="text-sm font-medium px-4 py-1.5 rounded-full">
              {formatFileSize(document.file_size)}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span>{document.download_count}</span>
            </div>
          </div>
        </div>

        {/* Document Name */}
        <h3 className="text-xl font-bold text-foreground mb-3 line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors duration-300">
          {document.name}
        </h3>

        {/* Description */}
        {document.description ? (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
            {document.description}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
          <Clock className="w-4 h-4" />
          <span>Adicionado em {new Date(document.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <Download className="w-5 h-5 mr-2" />
          Baixar Documento
        </Button>
      </CardContent>
    </Card>
  );
};

// Modern Loading Skeleton
const DocumentsSkeleton = ({ viewMode }: { viewMode: 'grid' | 'list' }) => (
  <div className={viewMode === 'grid' 
    ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
    : "flex flex-col gap-4"
  }>
    {[1, 2, 3].map((i) => (
      <Card key={i} className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-5">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="w-20 h-7 rounded-full" />
              <Skeleton className="w-12 h-4 rounded" />
            </div>
          </div>
          <Skeleton className="h-7 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-5" />
          <Skeleton className="h-4 w-32 mb-5" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// Empty State Component
const EmptyState = ({ onBack, searchQuery }: { onBack: () => void; searchQuery: string }) => (
  <div className="text-center py-20 px-4">
    <div className="relative inline-flex items-center justify-center w-40 h-40 mb-8">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full animate-pulse" />
      <div className="absolute inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full" />
      <div className="absolute inset-8 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full" />
      <FileStack className="w-20 h-20 text-primary relative z-10" />
    </div>
    <h2 className="text-4xl font-bold text-foreground mb-4">
      {searchQuery ? 'Nenhum documento encontrado' : 'Nenhum documento disponível'}
    </h2>
    <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
      {searchQuery 
        ? `Não encontramos documentos correspondentes à busca "${searchQuery}". Tente outros termos.`
        : 'No momento não há documentos disponíveis para download. Volte mais tarde!'
      }
    </p>
    <Button onClick={onBack} size="lg" className="rounded-full px-8 h-14 text-base">
      <ArrowLeft className="w-5 h-5 mr-2" />
      Voltar para Home
    </Button>
  </div>
);

// Main Page Component
const Documents = () => {
  const navigate = useNavigate();
  const { data: settings, isLoading: settingsLoading } = useSiteSettings();
  const { data: documents = [], isLoading: documentsLoading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isLoading = settingsLoading || documentsLoading;

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase();
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(query) ||
      (doc.description?.toLowerCase().includes(query) ?? false)
    );
  }, [documents, searchQuery]);

  // Check if documents section is enabled
  if (!settingsLoading && !settings?.enable_documents_section) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState onBack={() => navigate('/')} searchQuery="" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 flex flex-col">
      {/* Modern Header */}
      <header className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>

          {/* Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileStack className="w-6 h-6 text-primary" />
                </div>
                <Badge variant="secondary" className="text-sm">
                  {documents.length} documento{documents.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 leading-tight">
                {settings?.documents_page_title || 'Documentos para Download'}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {settings?.documents_page_subtitle || 'Baixe os documentos disponíveis'}
              </p>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 lg:w-auto w-full">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-12 w-12 rounded-xl"
                >
                  <Grid3X3 className="w-5 h-5" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-12 w-12 rounded-xl"
                >
                  <List className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        {isLoading ? (
          <DocumentsSkeleton viewMode={viewMode} />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState onBack={() => navigate('/')} searchQuery={searchQuery} />
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
            : "flex flex-col gap-4"
          }>
            {filteredDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Documents;
