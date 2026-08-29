# Transferência técnica — APK_TV Cliente e Gestor

**Data do documento:** 29 de agosto de 2026  
**Objetivo:** permitir que outra inteligência artificial assuma o diagnóstico e a correção do projeto sem modificar o repositório original `imvitoroliveira/watch-wish-play` nem o ambiente Lovable.

> Este repositório é uma cópia de trabalho independente. O GitHub original é somente referência e não deve ser alterado.

## 1. Resumo executivo

O produto original é uma aplicação React/Vite com Supabase para gerenciamento de clientes IPTV, catálogo de filmes e séries, canais ao vivo, agenda esportiva, pagamentos e renovação. Foram criadas duas cópias locais com Capacitor para gerar dois APKs Android distintos: o APK Cliente, pacote `com.clientestoptv.meustream`, e o APK Gestor, pacote `com.clientestoptv.meustream.manager`.

O backend foi migrado para o projeto Supabase `dwuzlbvhnfuynglsbemo`. O login administrativo e o login de clientes foram corrigidos e validados. O upload do Gestor foi ajustado para converter as colunas `Usuario`, `Senha` e `Expiração` para os campos internos `u`, `p` e `e`. O Gestor também foi validado com uma conta administrativa real.

A falha crítica ainda aberta é a reprodução de mídia. O catálogo, banners, logos, login e navegação carregam, mas filmes e canais ao vivo falharam no vídeo de homologação com a mensagem: `Formato incompatível ou acesso bloqueado pelo servidor (CORS/403). Todas as rotas falharam.` A reprodução ainda não foi comprovada com sucesso em Android. A Agenda VIP também apresentou um placar congelado no intervalo para Levante x Real Betis; a causa de cache foi identificada e corrigida localmente, mas precisa ser publicada e validada.

## 2. Componentes do repositório

| Caminho | Conteúdo |
|---|---|
| `apps/client` | Cópia do APK Cliente, React/Vite/Capacitor, pacote `com.clientestoptv.meustream` |
| `apps/manager` | Cópia do APK Gestor, React/Vite/Capacitor, pacote `com.clientestoptv.meustream.manager` |
| `artifacts/apks` | APKs debug mais recentes com correção do player interno |
| `artifacts/APK_TV_backend_updates.zip` | Funções Edge atualizadas para substituir no projeto usado pelo deploy |
| `artifacts/diagnostics` | Auditoria funcional, análise do vídeo e registros do estado do backend |
| `docs` | Este documento e instruções de transferência |

Os diretórios `node_modules`, `dist`, `.env`, credenciais e valores de secrets não foram incluídos de propósito.

## 3. Backend e secrets

O projeto Supabase novo é:

```text
https://dwuzlbvhnfuynglsbemo.supabase.co
```

A chave pública usada no frontend foi configurada nas cópias locais por meio de `.env`, mas os arquivos `.env` não foram copiados para este repositório por segurança. A configuração deve ser recriada localmente com base no `.env.example` de cada aplicativo.

As secrets administrativas que funcionam são `ADMIN_USER` e `ADMIN_PASS`. As secrets de integração incluem `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET` e `NATV_API_TOKEN`. Para TMDB, o usuário criou duas secrets com os nomes exatos `TMDB_API_TOKEN_v1` e `TMDB_API_TOKEN_v2`. O proxy precisa ler essas duas variáveis e tentar a segunda quando a primeira falhar por 401, 403, 429 ou erro temporário.

Funções Edge relevantes:

| Função | Papel |
|---|---|
| `admin-login` | Login do Gestor usando `ADMIN_USER` e `ADMIN_PASS` |
| `client-login` | Login do cliente e validação de expiração/status |
| `manage-clients` | Listagem, alteração e controle de clientes |
| `parse-m3u` | Importação e processamento do catálogo M3U |
| `tmdb-proxy` | Capas, busca, detalhes e metadados TMDB |
| `stream-proxy` | Proxy HTTP para streams, suporte a Range e playlists HLS |
| `stream-lookup` | Busca de URL por título no M3U |
| `series-lookup` | Resolução de temporadas e episódios via Xtream/M3U |
| `xtream-proxy` | Acesso a categorias e streams da API Xtream |
| `football-matches` | Atualização de jogos, placares e status da Agenda VIP |
| `match-reminders` | Lembretes de jogos |
| `content-alerts` | Alertas de novos conteúdos |
| `app-settings` | Configurações gerais e billing |
| `abacatepay-webhook` | Confirmação de pagamento e ativação NATV |

## 4. Correções já realizadas

### 4.1 Separação Cliente/Gestor

O `App.tsx` utiliza `VITE_APP_ROLE`. O APK Cliente usa o papel `client`; o APK Gestor usa `manager`. A ausência dessa variável fez uma versão anterior do Gestor abrir o fluxo de cliente e mostrar o botão legado `Acessar área do gestor`, que retornava 404. Isso foi corrigido com `VITE_APP_ROLE=manager` no Gestor.

### 4.2 Login administrativo

A função publicada inicialmente retornava `Hello undefined!`, indicando que o endpoint publicado não correspondia ao código correto. A função `admin-login` foi republicada. Depois, as secrets `ADMIN_USER` e `ADMIN_PASS` foram corrigidas porque tinham o mesmo digest, indicando que provavelmente o mesmo valor havia sido cadastrado nas duas. Após a correção, o endpoint respondeu HTTP 200 com `success: true`.

A função `manage-clients` também estava retornando HTTP 500 e foi republicada. Após isso, respondeu HTTP 200 e autorizou a sessão administrativa.

### 4.3 Login do cliente e planilha

O importador e o backend trabalham internamente com `u`, `p`, `e` e `t`. A planilha real usa `Usuario`, `Senha`, `Expiração` e, conforme o caso, `Status`. O Gestor foi alterado para normalizar esses títulos, remover espaços acidentais e gravar os campos esperados. O login do cliente foi validado com um registro importado.

### 4.4 TMDB

A versão inicial do proxy escolhia uma chave aleatória, o que não constituía failover. O proxy local foi alterado para ler `TMDB_API_TOKEN_v1` e `TMDB_API_TOKEN_v2`, tentar as chaves em sequência e avançar em falhas 401, 403, 429 e 5xx. O código também mantém compatibilidade com `TMDB_API_KEYS` e `TMDB_API_TOKEN` antigos.

O deploy de `tmdb-proxy` foi executado no PowerShell com sucesso, conforme captura do usuário. Antes da adaptação aos nomes v1/v2, o endpoint ainda retornava HTTP 500 porque procurava nomes diferentes. É necessário confirmar novamente após publicar o pacote final.

### 4.5 Agenda VIP

O frontend faz polling a cada 5 segundos, mas a função `football-matches` retornava as linhas existentes de `jogos_ativos` sem consultar as fontes externas. Um jogo marcado como `intervalo` podia permanecer congelado indefinidamente. A função foi alterada para considerar dados ao vivo envelhecidos após 60 segundos e iniciar uma nova busca, sem consultar as fontes externas em todos os polls de 5 segundos.

### 4.6 Player Android

O `VideoContext` tinha comportamento V1 baseado em `window.open`. No WebView Android, isso não é confiável. O código local foi alterado para usar o `GlobalPlayer` interno quando o aplicativo roda nativamente, mesmo que uma preferência antiga `msc_app_version=v1` esteja salva.

O `GlobalPlayer` usa HLS.js, mpegts.js e vídeo nativo, com tentativas para HLS, MPEG-TS, MP4, MKV e proxy Supabase. A URL do proxy foi alterada para incluir a chave pública `apikey` na URL, pois o elemento `<video>` não envia automaticamente os mesmos headers que uma chamada `supabase.functions.invoke`.

## 5. Evidência do vídeo de homologação

O vídeo está resumido em `artifacts/diagnostics/video_analysis.md`. A jornada observada foi:

1. Login do cliente `vitor.camila` realizado com sucesso.
2. Catálogo, banners e títulos carregaram.
3. O filme `Obsessão` abriu detalhes e sinopse.
4. Ao clicar em `Assistir Agora`, o player apresentou `Formato incompatível ou acesso bloqueado pelo servidor (CORS/403). Todas as rotas falharam.`
5. O usuário tentou o canal `PREMIERE CLUBES FHD` e recebeu a mesma falha.
6. O Gestor mostrou `vitor.camila` como ativo, com expiração em 21/09/2026.
7. A fonte individual exibida no Gestor era uma URL HTTP do servidor IPTV, com catálogo de 12.960 filmes, 5.812 séries e 988 canais.
8. A Agenda exibiu Levante 2 x 2 Real Betis, mas o placar estava parado no intervalo.

A conclusão visual é importante: a falha não está no login nem no carregamento básico do catálogo. O problema está entre a URL de stream, o proxy, a autenticação do servidor IPTV, headers, formato/codec, HLS e o player dentro do WebView.

## 6. Hipóteses prioritárias para a falha de reprodução

A próxima IA deve testar as hipóteses nesta ordem, registrando o status HTTP real de cada tentativa:

| Prioridade | Hipótese | Como verificar |
|---:|---|---|
| 1 | A URL construída para filme/canal não corresponde ao formato aceito pelo servidor | Comparar a URL gerada com a URL que funciona em VLC usando a mesma conta |
| 2 | O servidor IPTV exige credenciais/headers específicos ou rejeita o proxy | Testar a URL original com `curl -I`, VLC e o `stream-proxy`; comparar status e headers |
| 3 | O upstream retorna 403 ao User-Agent VLC ou exige Referer/Origin | Verificar logs do `stream-proxy` e testar User-Agents/headers permitidos pelo provedor |
| 4 | A resposta é TS/MKV/codec não suportado pelo WebView | Capturar `Content-Type`, primeiros bytes e codec; validar com MP4/HLS compatível |
| 5 | HLS tem playlists relativas, URI de chave ou sub-playlists não reescritas | Testar `.m3u8` e verificar `EXT-X-KEY`, `EXT-X-MAP` e `EXT-X-STREAM-INF` |
| 6 | A função Edge não está recebendo Range ou o upstream não suporta seek | Observar `206`, `Content-Range` e `Accept-Ranges` |
| 7 | O player marca uma tentativa como carregada antes de haver reprodução real | Revisar eventos `canplay`, `playing`, `timeupdate`, `stalled` e timeouts |
| 8 | O cliente está usando uma cópia antiga do APK ou dados antigos no WebView | Limpar dados/desinstalar, reinstalar APK novo e confirmar o hash |

Não considerar encerrado com base apenas na mensagem genérica do player. A função deve devolver/logar o status da origem sem expor usuário, senha ou URL completa.

## 7. Como reproduzir o diagnóstico

Usar uma conta de homologação ativa e uma fonte M3U real. Não utilizar dados de clientes finais. Após login no Gestor, confirmar que o cliente tem M3U individual configurado e reimportar uma planilha controlada.

Testar um filme, um episódio e um canal. No APK, registrar o horário, o título, o tipo de conteúdo e a mensagem. No Supabase, verificar os logs de `stream-proxy`, `stream-lookup` e `series-lookup`. O diagnóstico deve guardar somente domínio, caminho sem credenciais, status HTTP, Content-Type, Content-Length, Content-Range e erro do player.

Para a Agenda, observar a mesma partida durante mais de 60 segundos e confirmar mudança em `jogos_ativos.atualizado_em`, `status`, `elapsed`, `placar_casa` e `placar_fora`. A função não deve confiar somente no polling do frontend.

## 8. Deploy no Windows

O executável global `supabase` não está no PATH. O comando que funcionou é:

```powershell
cd C:\APK_TV_backend
npx.cmd --yes supabase@latest functions deploy NOME_DA_FUNCAO --project-ref dwuzlbvhnfuynglsbemo
```

Após substituir os arquivos do pacote backend, publicar pelo menos:

```powershell
npx.cmd --yes supabase@latest functions deploy tmdb-proxy --project-ref dwuzlbvhnfuynglsbemo
npx.cmd --yes supabase@latest functions deploy app-settings --project-ref dwuzlbvhnfuynglsbemo
npx.cmd --yes supabase@latest functions deploy stream-proxy --project-ref dwuzlbvhnfuynglsbemo
npx.cmd --yes supabase@latest functions deploy stream-lookup --project-ref dwuzlbvhnfuynglsbemo
npx.cmd --yes supabase@latest functions deploy series-lookup --project-ref dwuzlbvhnfuynglsbemo
npx.cmd --yes supabase@latest functions deploy football-matches --project-ref dwuzlbvhnfuynglsbemo
```

O aviso `Docker is not running` apareceu no terminal, mas não impediu o deploy remoto das funções. O comando `supabase --version` falhou porque o CLI não está instalado globalmente; isso não impede o uso de `npx.cmd`.

## 9. APKs atuais

Os APKs em `artifacts/apks` são builds debug. Eles têm os seguintes IDs:

| APK | Application ID |
|---|---|
| Cliente | `com.clientestoptv.meustream` |
| Gestor | `com.clientestoptv.meustream.manager` |

Eles incluem o player interno Android, a resolução por M3U individual e as correções de UI/roteamento acumuladas. Ainda são versões de homologação, não builds de produção assinadas.

## 10. Critério para considerar reprodução corrigida

A reprodução só deve ser considerada corrigida quando uma conta de homologação conseguir, no Android, abrir com imagem e áudio pelo menos um canal ao vivo, um filme e um episódio de série. O teste deve sobreviver a uma reconexão de live, permitir pausa/retomada quando suportado e mostrar erro específico quando a origem rejeitar a solicitação.

Além disso, a Agenda VIP deve atualizar uma partida ao vivo sem fechar a tela, e TMDB deve devolver dados de catálogo sem revelar as chaves. Até esses critérios serem cumpridos, a entrega deve ser descrita como **homologação parcial**, não como versão pronta para clientes.

## 11. Restrições e cuidados

Não modificar `imvitoroliveira/watch-wish-play`. Não modificar Lovable. Não incluir `.env`, tokens, senhas, URLs M3U completas ou dados de clientes no novo repositório. Não usar uma URL de cliente real em testes públicos. Os APKs debug não devem ser distribuídos a clientes finais antes da validação e assinatura de release.

## 12. Próximo trabalho recomendado

A próxima IA deve primeiro confirmar que o pacote `artifacts/APK_TV_backend_updates.zip` foi substituído no diretório de deploy e publicar `stream-proxy`, `stream-lookup`, `series-lookup` e `football-matches`. Depois deve acrescentar logs seguros de diagnóstico no proxy, instalar o APK Cliente mais recente, testar um filme e coletar o status real da origem. Só depois de corrigir o primeiro erro específico deve avançar para séries e canais ao vivo.

A hipótese mais relevante levantada pelo vídeo é que o app consegue resolver catálogo e autenticar o cliente, mas a solicitação de mídia chega ao proxy ou ao servidor IPTV em uma forma que ele rejeita. O diagnóstico deve começar pela URL efetiva e pelo status HTTP da primeira tentativa, não por mudanças cosméticas no layout.
