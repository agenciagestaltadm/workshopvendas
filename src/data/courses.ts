export type CourseCategory = 'Curso' | 'Workshop';

export interface Course {
  id: string;
  nome: string;
  categoria: CourseCategory;
  data: string;
  horario: string;
  local: string;
  cargaHoraria?: string;
  vagas?: number;
  facilitador?: string;
  descricao: string;
}

export const courses: Course[] = [
  {
    id: 'workshop-1',
    nome: 'Produtos Digitais e Seus Fornecedores',
    categoria: 'Curso',
    data: '2026-04-06',
    horario: '14:00 - 17:30',
    local: 'Sebrae - Parauapebas',
    vagas: 20,
    facilitador: 'Rafael Castro',
    descricao:
      'Conheça os principais produtos que mais geram renda na internet. Descubra fornecedores confiáveis e aprenda a estruturar seu negócio digital do zero.',
  },
  {
    id: 'workshop-2',
    nome: 'Páginas de Vendas',
    categoria: 'Curso',
    data: '2026-04-07',
    horario: '14:00 - 17:30',
    local: 'Sebrae - Parauapebas',
    vagas: 20,
    facilitador: 'Gabriel Gurgel',
    descricao:
      'Aprenda a produzir páginas de vendas online para vender seus produtos. Estrutura, copywriting, elementos visuais e otimização para conversão.',
  },
  {
    id: 'workshop-3',
    nome: 'Produção de Criativos',
    categoria: 'Curso',
    data: '2026-04-08',
    horario: '14:00 - 17:30',
    local: 'Sebrae - Parauapebas',
    vagas: 20,
    facilitador: 'Victor Alves',
    descricao:
      'Aprenda a produzir Vídeos, Artes e Copys para seus criativos. Técnicas profissionais de edição, design e redação persuasiva para redes sociais.',
  },
  {
    id: 'workshop-4',
    nome: 'Gestão de Tráfego Pago',
    categoria: 'Curso',
    data: '2026-04-09',
    horario: '14:00 - 17:30',
    local: 'Sebrae - Parauapebas',
    vagas: 20,
    facilitador: 'Rafael Castro',
    descricao:
      'Aprenda a impulsionar seus criativos para o mundo. Estratégias de anúncios pagos no Meta Ads, Google Ads e outras plataformas para escalar suas vendas.',
  },
  {
    id: 'workshop-5',
    nome: 'Técnicas de Vendas',
    categoria: 'Curso',
    data: '2026-04-10',
    horario: '14:00 - 17:30',
    local: 'Sebrae - Parauapebas',
    vagas: 20,
    facilitador: 'Rafael Castro',
    descricao:
      'Aprenda técnicas de vendas para vender no WhatsApp e redes sociais. Abordagem, objeções, fechamento e pós-venda para maximizar seus resultados.',
  },
];

export const categoryColors: Record<CourseCategory, string> = {
  'Curso': 'bg-category-curso',
  'Workshop': 'bg-category-curso',
};
