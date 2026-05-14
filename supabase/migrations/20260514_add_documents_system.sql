-- Sistema de Documentos - Migração Completa

-- =============================================
-- 1. NOVAS COLUNAS EM SITE_SETTINGS
-- =============================================

-- Adicionar colunas para configuração do sistema de documentos
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS enable_documents_section BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS documents_button_label TEXT DEFAULT 'Documentos',
ADD COLUMN IF NOT EXISTS documents_page_title TEXT DEFAULT 'Documentos para Download',
ADD COLUMN IF NOT EXISTS documents_page_subtitle TEXT DEFAULT 'Baixe os documentos disponíveis';

-- =============================================
-- 2. TABELA DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    file_type TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_documents_active ON public.documents(is_active);
CREATE INDEX IF NOT EXISTS idx_documents_created ON public.documents(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON public.documents;
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_documents_updated_at();

-- =============================================
-- 3. STORAGE BUCKET DOCUMENTS
-- =============================================

-- Criar bucket para documentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Política: Documentos são publicamente legíveis
DROP POLICY IF EXISTS "Documents are publicly readable" ON storage.objects;
CREATE POLICY "Documents are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents');

-- Política: Admin pode fazer upload
DROP POLICY IF EXISTS "Admin can upload documents" ON storage.objects;
CREATE POLICY "Admin can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.email() = 'admgestalt@gmail.com');

-- Política: Admin pode deletar
DROP POLICY IF EXISTS "Admin can delete documents" ON storage.objects;
CREATE POLICY "Admin can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.email() = 'admgestalt@gmail.com');

-- =============================================
-- 4. FUNÇÕES RPC
-- =============================================

-- Função: Listar documentos ativos
CREATE OR REPLACE FUNCTION public.get_documents()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    is_active BOOLEAN,
    download_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        d.id,
        d.name,
        d.description,
        d.file_path,
        d.file_size,
        d.file_type,
        d.is_active,
        d.download_count,
        d.created_at,
        d.updated_at
    FROM public.documents d
    WHERE d.is_active = true
    ORDER BY d.created_at DESC;
$$;

-- Função: Listar todos os documentos (admin)
CREATE OR REPLACE FUNCTION public.admin_get_all_documents()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    file_path TEXT,
    file_size INTEGER,
    file_type TEXT,
    is_active BOOLEAN,
    download_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        d.id,
        d.name,
        d.description,
        d.file_path,
        d.file_size,
        d.file_type,
        d.is_active,
        d.download_count,
        d.created_at,
        d.updated_at
    FROM public.documents d
    ORDER BY d.created_at DESC;
$$;

-- Função: Criar documento (admin)
CREATE OR REPLACE FUNCTION public.admin_create_document(
    p_name TEXT,
    p_description TEXT,
    p_file_path TEXT,
    p_file_size INTEGER,
    p_file_type TEXT
)
RETURNS public.documents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result public.documents;
BEGIN
    IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    INSERT INTO public.documents (
        name,
        description,
        file_path,
        file_size,
        file_type
    )
    VALUES (
        p_name,
        p_description,
        p_file_path,
        p_file_size,
        p_file_type
    )
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

-- Função: Atualizar documento (admin)
CREATE OR REPLACE FUNCTION public.admin_update_document(
    p_id UUID,
    p_name TEXT,
    p_description TEXT,
    p_is_active BOOLEAN
)
RETURNS public.documents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result public.documents;
BEGIN
    IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    UPDATE public.documents
    SET
        name = COALESCE(p_name, name),
        description = COALESCE(p_description, description),
        is_active = COALESCE(p_is_active, is_active),
        updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

-- Função: Deletar documento (admin)
CREATE OR REPLACE FUNCTION public.admin_delete_document(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.email() IS DISTINCT FROM 'admgestalt@gmail.com' THEN
        RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    DELETE FROM public.documents WHERE id = p_id;
END;
$$;

-- Função: Incrementar contador de downloads
CREATE OR REPLACE FUNCTION public.increment_download_count(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.documents
    SET download_count = download_count + 1
    WHERE id = p_id;
END;
$$;

-- =============================================
-- 5. POLÍTICAS RLS PARA DOCUMENTOS
-- =============================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Política: Documentos ativos são publicamente legíveis
DROP POLICY IF EXISTS "Active documents are publicly readable" ON public.documents;
CREATE POLICY "Active documents are publicly readable"
ON public.documents
FOR SELECT
USING (is_active = true);

-- Política: Admin pode gerenciar todos os documentos
DROP POLICY IF EXISTS "Admin can manage all documents" ON public.documents;
CREATE POLICY "Admin can manage all documents"
ON public.documents
FOR ALL
TO authenticated
USING (auth.email() = 'admgestalt@gmail.com')
WITH CHECK (auth.email() = 'admgestalt@gmail.com');

-- =============================================
-- 6. DADOS INICIAIS (OPCIONAL)
-- =============================================

-- Garantir que site_settings exista com valores padrão
INSERT INTO public.site_settings (
    id,
    enable_documents_section,
    documents_button_label,
    documents_page_title,
    documents_page_subtitle
)
VALUES (
    'default',
    false,
    'Documentos',
    'Documentos para Download',
    'Baixe os documentos disponíveis'
)
ON CONFLICT (id) DO UPDATE SET
    enable_documents_section = COALESCE(public.site_settings.enable_documents_section, false),
    documents_button_label = COALESCE(public.site_settings.documents_button_label, 'Documentos'),
    documents_page_title = COALESCE(public.site_settings.documents_page_title, 'Documentos para Download'),
    documents_page_subtitle = COALESCE(public.site_settings.documents_page_subtitle, 'Baixe os documentos disponíveis');
