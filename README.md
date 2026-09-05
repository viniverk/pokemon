# Registro de cartas

Controle de coleção e investimento em cartas de TCG. Arquivo único em HTML, sem build, sem dependência de framework. Os dados ficam no Firestore, protegidos por login, e a página é servida pelo GitHub Pages.

Acompanha custo real de aquisição, valor de mercado, resultado não realizado e resultado líquido das vendas já feitas. Todos os valores em real.

---

## O que faz

- Cadastro de cartas avulsas e produtos lacrados, com quantidade por registro
- Custo real da compra, incluindo frete e taxas rateados no lote
- Valor de mercado por unidade, com data da última consulta
- Marcação automática de cotações vencidas (padrão: 90 dias)
- Aba dedicada para atualizar cotações em série, da mais antiga para a mais recente
- Registro de venda com taxa de marketplace e frete, gerando o resultado líquido
- Busca automática de carta pela base pública do pokemontcg.io, preenchendo nome, coleção, número, raridade e imagem
- Miniatura da carta na listagem
- Separação por grupo: acervo, giro e bulk
- Campo de localização física, para achar a carta no binder ou na caixa
- Resumo por idioma, grupo, coleção e maiores posições
- Exportação em CSV e backup em JSON, com restauração

---

## Configuração

### 1. Firebase

Crie um projeto no [console do Firebase](https://console.firebase.google.com) ou reaproveite um existente.

**Firestore.** Crie o banco em modo de produção. Não é preciso criar coleção nenhuma — ela nasce no primeiro registro salvo.

**Authentication.** Em *Sign-in method*, ative "E-mail/senha". Depois, em *Users → Add user*, crie sua conta com o e-mail e a senha que você vai usar.

Não existe tela de cadastro no app. A conta é criada pelo console, de propósito: assim ninguém se registra sozinho.

**Regras do Firestore.** Em *Firestore → Rules*, adicione:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /usuarios/{dono}/cartas/{doc} {
      allow read, write: if request.auth != null && request.auth.uid == dono;
    }

  }
}
```

> Se o projeto já for usado por outra aplicação, **adicione** o bloco `match` junto dos que já existem, dentro do mesmo `match /databases/{database}/documents`. Substituir o arquivo inteiro derruba o acesso das outras aplicações.

### 2. Config no código

No topo do bloco `<script>` do `index.html`, troque os `"COLE_AQUI"` pelos dados do seu projeto, disponíveis em *Configurações do projeto → Seus apps → Configuração do SDK*:

```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Essa config não é segredo. Ela identifica o projeto, não autoriza nada. Quem protege os dados é a regra do Firestore acima — sem um token válido, o servidor recusa leitura e escrita.

### 3. GitHub Pages

Suba estes arquivos na raiz do repositório:

```
index.html
manifest.json
sw.js
icon-192.png
icon-512.png
```

Em *Settings → Pages*, escolha a branch e a pasta raiz. Em um ou dois minutos a página fica no ar.

Depois disso, volte ao Firebase em *Authentication → Settings → Authorized domains* e adicione o domínio do Pages (`seu-usuario.github.io`). Sem isso o login é recusado.

---

## Instalação no celular

O app é um PWA. No Android, o Chrome mostra uma faixa de instalação assim que a página carrega — instalado, ganha ícone próprio e abre em tela cheia. No iPhone, o Safari não oferece o botão: use Compartilhar → Adicionar à Tela de Início. A faixa dentro do app lembra disso.

O `sw.js` guarda os arquivos do app em cache com estratégia de rede primeiro, então uma edição no `index.html` aparece na abertura seguinte. Se quiser forçar a atualização em todos os aparelhos, suba o número em `const VERSAO` dentro do `sw.js`.

Os dados nunca saem do Firestore para o cache. Sem internet, o app abre mas não carrega o acervo.

---

## Ajustes disponíveis

Constantes no topo do `<script>`:

| Constante | Padrão | Para que serve |
|---|---|---|
| `RAIZ` | `usuarios` | Coleção raiz, uma pasta por conta |
| `COLECAO` | `cartas` | Subcoleção com os registros |
| `TAXA_PAD` | `13` | Taxa média de marketplace, em %, usada no cálculo do líquido |
| `VALIDADE_COTACAO` | `90` | Dias até uma cotação ser marcada como antiga |

---

## Como os números são calculados

**Custo** — preço pago por unidade multiplicado pela quantidade, mais o frete e as taxas da compra. O frete entra uma vez por registro, não por unidade.

**Valor de mercado** — valor unitário informado multiplicado pela quantidade. É o número otimista: ignora o que você perde para vender.

**Líquido se vender hoje** — valor de mercado menos a taxa de marketplace. É o número realista.

**Resultado realizado** — só entram itens marcados como vendidos. Preço de venda menos taxa, menos frete pago por você, menos o custo. É o único número que representa dinheiro que existe de fato.

---

## Modelo de dados

Cada documento em `usuarios/{uid}/cartas`:

| Campo | Tipo | Observação |
|---|---|---|
| `tipo` | string | `avulsa` ou `lacrado` |
| `nome`, `set`, `numero` | string | Identificação |
| `idioma` | string | `PT`, `EN` ou `JP` |
| `raridade`, `condicao` | string | Só para avulsas |
| `gradEmpresa`, `gradNota` | string | Vazio se não gradeada |
| `qtd` | número | Unidades no registro |
| `precoPago` | número | Por unidade |
| `custoExtra` | número | Frete e taxas, total do registro |
| `dataCompra`, `fonte` | string | Procedência |
| `valorMercado` | número | Por unidade |
| `dataCotacao` | string | Data da última consulta |
| `balde` | string | `acervo`, `giro` ou `bulk` |
| `local` | string | Onde a carta está guardada |
| `img` | string | Link da imagem |
| `status` | string | `ativo` ou `vendido` |
| `vPreco`, `vData`, `vTaxa`, `vFrete` | número/string | Só quando vendido |
| `obs` | string | Livre |

---

## Catálogo de cartas

Usa a [API da TCGdex](https://tcgdex.dev), gratuita e sem chave, com base em `https://api.tcgdex.net/v2/{idioma}/`. Cobre cartas em português, inglês e japonês, entre outros idiomas, com imagens hospedadas em `assets.tcgdex.net`.

O catálogo aparece em dois lugares:

**No cadastro.** Escolha o idioma e a coleção, filtre pelo nome ou número, clique na miniatura. Preenche nome, coleção, número, raridade e imagem no idioma certo, e grava o vínculo com o catálogo.

**Na aba Coleções.** Navegue uma coleção inteira e veja quais cartas já estão no seu acervo. O botão *Converter cartas já cadastradas* pareia registros antigos com a versão de outro idioma, pelo número, com conferência visual antes de aplicar.

Nenhum preço é importado. Os campos de dinheiro ficam vazios de propósito, para você preencher em real com a cotação do mercado nacional.

---

## Modo demonstração

Enquanto a config do Firebase estiver com `"COLE_AQUI"`, o app roda sem login, com registros de exemplo guardados apenas na memória. Serve para testar a interface. Nada é salvo e nada é sincronizado.

---

## Backup

O botão *Backup* baixa um JSON com todos os registros. *Restaurar* lê esse arquivo e **acrescenta** os registros aos existentes — não substitui. Restaurar duas vezes duplica tudo.

Vale exportar de tempos em tempos. O Firestore é confiável, mas um backup local custa um clique.

---

## Onde as coisas quebram

**Login recusado no GitHub Pages.** Domínio não autorizado no Firebase. Adicione em *Authentication → Settings → Authorized domains*.

**"O Firestore recusou a leitura".** Regra de segurança. Confira se o bloco `match` está publicado e se o caminho bate com `RAIZ` e `COLECAO`.

**Senha esquecida.** Redefina pelo console, em *Authentication → Users*.

**Versões divergentes.** O arquivo publicado no GitHub é a fonte da verdade. Edite sempre a partir dele, nunca de uma cópia local antiga.
