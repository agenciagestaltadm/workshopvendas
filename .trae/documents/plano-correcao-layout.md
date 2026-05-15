# Plano de Correção de Layout e Responsividade

## Resumo
Este plano aborda as correções solicitadas para a logo, os cards de cursos, a seção de CTA e a responsividade mobile.

## Análise do Estado Atual e Problemas Identificados
1. **Logo no HeroSection**: A logo com texto branco está invisível devido ao fundo claro.
2. **Cards de Cursos**: Os textos estão muito grandes, os paddings excessivos, e os cards estão ocupando muito espaço vertical. A navegação do carrossel no mobile está empilhada verticalmente (flex-col).
3. **CTA Section**: A ordem dos elementos no mobile está invertida (benefícios aparecendo antes do título). As cores dos elementos de benefício estão usando `bg-secondary/40`, o que pode gerar conflitos visuais dependendo da cor secundária escolhida pelo admin.

## Mudanças Propostas

### 1. Correção da Logo (HeroSection.tsx)
- **O que**: Adicionar um `drop-shadow` forte à imagem da logo e ajustar o fundo do container.
- **Por que**: Um `drop-shadow` (ex: `drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`) garantirá que logos brancas fiquem visíveis mesmo em fundos claros, e logos escuras em fundos escuros, sem descaracterizar a imagem.
- **Como**: Atualizar as classes Tailwind da tag `<img>` e do seu container.

### 2. Ajuste dos Cards de Cursos (CoursesCarousel.tsx)
- **O que**: Reduzir paddings, tamanhos de fonte e corrigir a navegação mobile.
- **Por que**: Os cards estão desproporcionais. A navegação empilhada quebra a usabilidade.
- **Como**:
  - Mudar padding do conteúdo do card de `p-4 sm:p-6 md:p-8` para `p-4 sm:p-5`.
  - Reduzir título de `text-xl sm:text-2xl` para `text-lg sm:text-xl`.
  - Ajustar botões de navegação: remover `flex-col` e usar `flex-row` sempre.

### 3. Correções na CTASection (CTASection.tsx)
- **O que**: Corrigir a ordem dos elementos no mobile e neutralizar as cores de fundo dos itens.
- **Por que**: O título deve vir antes dos benefícios no mobile. Cores dependentes de `secondary` podem gerar combinações ruins; usar cores semânticas de fundo (`bg-background` ou `bg-card`) é mais seguro.
- **Como**:
  - Remover as classes `order-1` e `order-2`.
  - Mudar `bg-secondary/40` para `bg-background` ou `bg-muted/50`.

## Validação
- Verificar se a logo está legível.
- Confirmar que os cards de curso estão mais compactos e harmônicos.
- Testar a navegação do carrossel no mobile (botões lado a lado).
- Verificar a ordem e as cores da CTASection no mobile e desktop.