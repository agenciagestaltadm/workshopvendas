# Plano de Correção de Layout - Cards de Cursos v2

## Análise dos Problemas

### 1. Imagens Cortadas
- **Problema**: Imagens estão sendo cortadas e não aparecem completas
- **Causa**: `object-fit: cover` com aspect-ratio fixo ou container muito pequeno
- **Solução**: 
  - Mudar para `object-fit: contain` OU
  - Aumentar a altura máxima da imagem
  - Remover restrições de aspect-ratio que cortam a imagem

### 2. Textos Grandes e Desorganizados
- **Problema**: Textos ocupam muito espaço, títulos muito grandes
- **Causa**: Classes como `text-xl sm:text-2xl md:text-3xl` e espaçamentos excessivos
- **Solução**:
  - Reduzir para `text-base sm:text-lg md:text-xl`
  - Diminuir espaçamentos: `mb-2` em vez de `mb-3 sm:mb-4`
  - Usar `line-clamp` para limitar linhas

### 3. Elementos Passando dos Limites
- **Problema**: Tags de data/hora/local vazam do card
- **Causa**: Bordas grandes, padding excessivo, gap muito grande
- **Solução**:
  - Remover fundo colorido (bg-secondary/40)
  - Usar fundo transparente ou muito sutil
  - Reduzir padding: `py-1 px-2`
  - Ícones menores: `h-3 w-3`
  - Gap menor: `gap-1`

### 4. Responsividade Quebrada
- **Problema**: Layout não se adapta bem ao mobile
- **Causa**: Padding grande, fontes não escalam, elementos não cabem
- **Solução**:
  - Reduzir padding do card: `p-3` no mobile
  - Fontes fluidas com clamp
  - Garantir que elementos não estourem o container

## Implementação Detalhada

### Estrutura do Card
```
Card Container (max-w-sm, overflow-hidden)
├── Imagem Container (w-full, bg-muted)
│   └── Imagem (object-contain, max-h-[240px])
├── Conteúdo (p-3)
│   ├── Título (text-base, font-bold, line-clamp-2)
│   ├── Facilitador (text-xs, text-primary/80)
│   ├── Descrição (text-xs, line-clamp-2)
│   ├── Tags (gap-1)
│   │   ├── Data (text-xs, flex items-center gap-1)
│   │   ├── Hora (text-xs, flex items-center gap-1)
│   │   └── Local (text-xs, flex items-center gap-1)
│   └── Botão (w-full, py-2, text-sm)
```

### Classes CSS

**Container do Card:**
```
max-w-xs sm:max-w-sm mx-auto
rounded-xl overflow-hidden
border border-border/40 bg-card
shadow-sm
```

**Container da Imagem:**
```
w-full bg-muted/30
p-3 sm:p-4
flex items-center justify-center
```

**Imagem:**
```
w-full h-auto
max-h-[200px] sm:max-h-[220px] lg:max-h-[240px]
object-contain
mx-auto
```

**Conteúdo:**
```
p-3 sm:p-4
flex flex-col
```

**Título:**
```
text-base sm:text-lg
font-bold text-foreground
leading-snug
mb-1.5 sm:mb-2
line-clamp-2
```

**Facilitador:**
```
text-xs sm:text-sm
text-primary/80
flex items-center gap-1.5
mb-2 sm:mb-3
```

**Descrição:**
```
text-xs sm:text-sm
text-muted-foreground
leading-relaxed
mb-3 sm:mb-4
line-clamp-2
```

**Tags (Data/Hora/Local):**
```
flex flex-col gap-1.5

// Cada tag:
text-xs text-foreground/80
flex items-center gap-1.5

// Ícones:
h-3.5 w-3.5 text-primary/60
```

**Botão:**
```
w-full
py-2 sm:py-2.5
bg-primary text-primary-foreground
text-xs sm:text-sm font-medium
rounded-lg
hover:bg-primary/90
```

## Critérios de Aceitação

- [ ] Imagens aparecem completas sem corte
- [ ] Layout compacto e organizado
- [ ] Textos hierarquizados e legíveis
- [ ] Tags de info discretas e alinhadas
- [ ] Responsivo em mobile, tablet e desktop
- [ ] Botão acessível e visível
- [ ] Cards não estouram o container
