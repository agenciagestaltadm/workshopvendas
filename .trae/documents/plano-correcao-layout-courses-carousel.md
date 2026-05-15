# Plano de Correção de Layout - CoursesCarousel

## Problemas Identificados

### 1. Imagens Cortadas e Exibição
- **Problema**: As imagens estão sendo cortadas devido ao `aspect-ratio` e `object-cover`
- **Impacto**: As imagens dos cursos não aparecem completas

### 2. Textos Desorganizados e Grandes
- **Problema**: Títulos muito grandes (`text-xl sm:text-2xl`), espaçamentos excessivos
- **Impacto**: Visual poluído, informações não hierarquizadas corretamente

### 3. Elementos Passando do Layout
- **Problema**: Tags de data/hora/local com bordas muito grandes e cores conflitantes
- **Impacto**: Elementos ultrapassando os limites do card

### 4. Problemas de Responsividade
- **Problema**: Layout quebra em telas menores, textos não se ajustam
- **Impacto**: Usabilidade ruim no mobile

## Soluções Propostas

### 1. Correção das Imagens
```
- Remover aspect-ratio fixo
- Usar object-contain em vez de object-cover
- Adicionar max-height adequado
- Garantir que a imagem não estoure o container
```

### 2. Organização dos Textos
```
- Reduzir tamanhos: título text-lg (mobile), text-xl (desktop)
- Diminuir espaçamentos: mb-2, gap-2
- Melhorar hierarquia: facilitador em texto menor
- Limitar descrição a 2 linhas no mobile
```

### 3. Correção das Tags de Info
```
- Remover fundo colorido (bg-secondary/40)
- Usar fundo transparente ou muito sutil
- Reduzir bordas: border-0 ou border-border/20
- Diminuir padding: py-1.5 px-2
- Ícones menores: h-3.5 w-3.5
```

### 4. Melhorias de Responsividade
```
- Cards com max-width definido
- Grid ajustável: 1 coluna mobile, 2 tablet, 3 desktop
- Fontes fluidas usando clamp() ou classes responsivas
- Botões com tamanhos adequados para touch (min 44px)
```

## Implementação

### Arquivos a Modificar
- `src/components/CoursesCarousel.tsx` - Principal arquivo de correção

### Estratégia de Teste
1. Verificar em mobile (375px)
2. Verificar em tablet (768px)
3. Verificar em desktop (1440px)
4. Testar com imagens de diferentes proporções
5. Validar contraste e legibilidade

## Critérios de Aceite
- [ ] Imagens aparecem completas sem corte
- [ ] Textos organizados hierarquicamente
- [ ] Elementos não ultrapassam os limites do card
- [ ] Layout responsivo funciona em todas as telas
- [ ] Cores harmonizam com o tema do site
- [ ] Botões e links facilmente clicáveis no mobile
