# Plano de Correção de Layout - Cards de Cursos

## Problemas Identificados

### 1. Imagens Cortadas
- **Problema**: Imagens estão sendo cortadas ou aparecendo apenas parcialmente
- **Causa**: `object-contain` com `max-h` muito restritivo e container mal dimensionado
- **Solução**: Aumentar altura máxima, adicionar padding adequado e garantir espaço para imagem completa

### 2. Textos Grandes e Desorganizados
- **Problema**: Títulos, descrições e textos muito grandes ocupam muito espaço
- **Causa**: Classes `text-lg sm:text-xl md:text-2xl` e espaçamentos `mb-3 sm:mb-5` excessivos
- **Solução**: 
  - Reduzir títulos para `text-base sm:text-lg md:text-xl`
  - Reduzir espaçamentos para `mb-2`
  - Limitar descrição a 2 linhas com botão discreto

### 3. Elementos Ultrapassando Limites
- **Problema**: Tags de data/hora/local vazam do card ou ficam mal posicionadas
- **Causa**: Padding excessivo (`py-2 px-3`), ícones grandes (`h-4 w-4`) e gap muito grande (`gap-2`)
- **Solução**:
  - Reduzir padding para `py-1.5 px-2`
  - Reduzir ícones para `h-3.5 w-3.5`
  - Usar fundo sutil `bg-muted/30`
  - Reduzir gap para `gap-1.5`

### 4. Problemas de Responsividade
- **Problema**: Layout quebra no mobile, cards muito largos ou estreitos
- **Causa**: Padding do card (`p-4 sm:p-5`) muito grande no mobile, max-width não definido corretamente
- **Solução**:
  - Reduzir padding do card para `p-3` no mobile
  - Garantir `max-w-xs` ou `max-w-sm` adequado
  - Verificar navegação do carrossel

## Checklist de Correções

### Imagens
- [ ] Aumentar max-height para `220px` mobile, `260px` desktop
- [ ] Adicionar padding adequado no container da imagem
- [ ] Garantir `object-contain` funcione corretamente

### Textos
- [ ] Título: `text-base sm:text-lg md:text-xl`
- [ ] Facilitador: `text-xs sm:text-sm`
- [ ] Descrição: limitar a 2 linhas
- [ ] Espaçamentos: `mb-2`, `gap-2`

### Tags de Info
- [ ] Padding: `py-1.5 px-2`
- [ ] Ícones: `h-3.5 w-3.5`
- [ ] Fundo: `bg-muted/30`
- [ ] Gap: `gap-1.5`

### Responsividade
- [ ] Card padding: `p-3` mobile
- [ ] Max-width: `max-w-xs` ou `max-w-sm`
- [ ] Navegação carrossel funcionando

## Arquivos para Modificar
- `src/components/CoursesCarousel.tsx`
