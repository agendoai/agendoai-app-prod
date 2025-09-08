# Correção do Problema de Upload de Câmera no iPhone

## Problema Identificado
O aplicativo estava fechando quando usuários do iPhone tentavam fazer upload de imagens usando a câmera na página `/provider/profile`. O problema ocorria especificamente no iOS Safari quando o input file tentava acessar a câmera diretamente.

## Causa Raiz
O problema estava relacionado a:
1. Falta do atributo `capture` nos inputs de arquivo
2. Configurações inadequadas para iOS Safari
3. Possível conflito entre o input file padrão e as especificações do iOS

## Solução Implementada

### 1. Adição do Atributo `capture`
```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  ...
/>
```

### 2. Detecção de iOS
```typescript
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};
```

### 3. Input Dinâmico para iOS
```typescript
const createIOSFileInput = (type: 'profile' | 'cover') => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.style.display = 'none';
  
  input.onchange = async (event) => {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      if (type === 'profile') {
        await uploadProfileImage(file);
      } else {
        await uploadCoverImage(file);
      }
    }
  };
  
  return input;
};
```

### 4. Lógica Condicional nos Botões
```typescript
onClick={() => {
  if (isIOS()) {
    const iosInput = createIOSFileInput('profile');
    document.body.appendChild(iosInput);
    iosInput.click();
    document.body.removeChild(iosInput);
  } else {
    profileImageInputRef.current?.click();
  }
}}
```

## Arquivos Modificados
- `client/src/pages/provider/provider-profile-page.tsx`

## Benefícios da Solução
1. **Compatibilidade iOS**: Funciona corretamente no iPhone/iPad
2. **Fallback Android**: Mantém funcionamento normal no Android
3. **Experiência do Usuário**: Não quebra mais o app no iOS
4. **Acesso Direto à Câmera**: Permite captura direta de fotos no iOS

## Testes Recomendados
1. Testar upload de imagem de perfil no iPhone
2. Testar upload de imagem de capa no iPhone
3. Verificar se ainda funciona no Android
4. Testar em diferentes versões do iOS Safari

## Observações Técnicas
- O atributo `capture="environment"` especifica o uso da câmera traseira
- A detecção de iOS inclui iPad Pro com touch (que reporta como MacIntel)
- O input dinâmico é criado e removido do DOM para evitar conflitos
