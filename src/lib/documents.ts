import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase';

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
  is_active?: boolean;
};

// Format file size to human readable format
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Validate file size (maxSize in MB)
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
];

// Validate file type
export const validateFileType = (file: File): boolean => {
  return ALLOWED_FILE_TYPES.includes(file.type);
};

// Get file icon based on type
export const getFileIcon = (fileType: string): string => {
  if (fileType.includes('pdf')) return 'file-text';
  if (fileType.includes('word') || fileType.includes('document')) return 'file-text';
  if (fileType.includes('excel') || fileType.includes('sheet')) return 'table';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'presentation';
  if (fileType.includes('image')) return 'image';
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'archive';
  return 'file';
};

// Hook: Get all documents (public)
export const useDocuments = () =>
  useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [] as Document[];
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('get_documents');
      if (error) {
        console.error('Error fetching documents:', error);
        return [] as Document[];
      }
      return (data ?? []) as Document[];
    },
  });

// Hook: Get all documents (admin)
export const useAdminDocuments = () =>
  useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [] as Document[];
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('admin_get_all_documents');
      if (error) {
        console.error('Error fetching admin documents:', error);
        return [] as Document[];
      }
      return (data ?? []) as Document[];
    },
  });

// Hook: Create document
export const useCreateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured');
      const supabase = requireSupabase();

      // Validate file
      if (!validateFileSize(input.file, 10)) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
      }
      if (!validateFileType(input.file)) {
        throw new Error('Tipo de arquivo não permitido');
      }

      // Upload file to storage
      const fileExt = getFileExtension(input.file.name);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, input.file);

      if (uploadError) {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      // Create document record
      const { data, error } = await supabase.rpc('admin_create_document', {
        p_name: input.name,
        p_description: input.description || '',
        p_file_path: fileName,
        p_file_size: input.file.size,
        p_file_type: input.file.type,
      });

      if (error) {
        // Rollback: delete uploaded file
        await supabase.storage.from('documents').remove([fileName]);
        throw new Error(`Erro ao criar documento: ${error.message}`);
      }

      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
  });
};

// Hook: Update document
export const useUpdateDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDocumentInput }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured');
      const supabase = requireSupabase();

      const { data, error } = await supabase.rpc('admin_update_document', {
        p_id: id,
        p_name: input.name || null,
        p_description: input.description || null,
        p_is_active: input.is_active ?? null,
      });

      if (error) {
        throw new Error(`Erro ao atualizar documento: ${error.message}`);
      }

      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
  });
};

// Hook: Delete document
export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      if (!isSupabaseConfigured) throw new Error('Supabase not configured');
      const supabase = requireSupabase();

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
      }

      // Delete document record
      const { error } = await supabase.rpc('admin_delete_document', {
        p_id: id,
      });

      if (error) {
        throw new Error(`Erro ao deletar documento: ${error.message}`);
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
    },
  });
};

// Function: Download document
export const downloadDocument = async (document: Document) => {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const supabase = requireSupabase();

  // Get public URL
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(document.file_path);

  // Increment download count
  await supabase.rpc('increment_download_count', { p_id: document.id });

  // Open download in new tab
  window.open(data.publicUrl, '_blank');
};