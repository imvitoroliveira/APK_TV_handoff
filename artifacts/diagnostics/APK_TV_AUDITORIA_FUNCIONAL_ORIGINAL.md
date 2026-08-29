# Auditoria funcional do produto original

## Escopo

O repositório original `/home/ubuntu/watch-wish-play` foi analisado somente para leitura. Nenhum arquivo do GitHub ou Lovable foi alterado.

## Jornada do Cliente

O cliente autentica pela Edge Function `client-login`, que consulta a última lista na tabela `clients_list`. A resposta sanitiza a senha antes de salvar o cliente em memória/local storage. O dashboard oferece as versões V1 clássica e V2 com player interno.

A navegação principal da V2 contém: Início, Categorias, Minha Lista, Cine-Roleta, Agenda Esportiva, Atualizações e Central de Ajuda. A busca ocorre no Início e consulta o catálogo TMDB; categorias consultam o catálogo M3U normalizado.

## Catálogo e experiência

O catálogo combina metadados do TMDB com títulos, IDs, categorias e tipo extraídos do M3U por Edge Functions. Há deduplicação por título/ID, carregamento inicial otimizado, busca completa no M3U, paginação adicional por gênero e indicação de disponibilidade.

O usuário pode abrir um modal de filme ou série, ver sinopse, capa, nota, trailer quando disponível, iniciar reprodução, marcar como favorito, marcar como assistido e configurar alerta de conteúdo. Séries exibem temporadas e episódios. Minha Lista persiste favoritos e assistidos localmente.

## Player

A V2 usa `VideoContext` e `GlobalPlayer`. O player é in-app, fullscreen e mini-player/Picture-in-Picture, com uma única tag de vídeo para evitar perda de buffer. Há suporte a HLS.js, vídeo nativo e MPEG-TS, com tentativas alternativas, reconexão para canais ao vivo, proxy de stream e fallback de formatos.

## Cliente e renovação

Há banner e popup para clientes próximos do vencimento. O sistema mantém heartbeat de presença, bloqueia excesso de sessões simultâneas e oferece renovação PIX via AbacatePay quando o billing está habilitado. A tela de expiração direciona o usuário à renovação.

## Recursos complementares

Cine-Roleta recomenda itens do catálogo. Cine Trailer Challenge registra trailer assistido. Agenda Esportiva usa dados de partidas. Atualizações mostra novidades do catálogo e usa badge de item não visto. Central de Ajuda usa tickets. Push notifications e alertas de conteúdo estão integrados ao código.

## Gestor

O painel administrativo possui login próprio, upload de lista JSON/HTML, validação/processamento de M3U, configuração de URL M3U/Xtream por cliente, busca e filtros de clientes, resumo de ativos/expirados, controle de billing, status online em tempo real, vencimentos e integração com Google Sheets. Há abas de testes de sistema e cobertura/diagnóstico.

## Edge Functions identificadas

`admin-login`, `client-login`, `manage-clients`, `app-settings`, `content-alerts`, `football-matches`, `google-sheets-sync`, `m3u-auto-refresh`, `match-reminders`, `n8n-proxy`, `parse-m3u`, `push-test`, `series-lookup`, `stream-lookup`, `stream-proxy`, `system-health-check`, `tmdb-proxy`, `trailer-challenge`, `user-presence`, `xtream-proxy` e `abacatepay-webhook`.

## Pontos críticos para o APK

A cópia Cliente mantém os arquivos centrais do produto original: `Dashboard`, `DashboardV2`, `LiveTV`, `MovieModal`, `GlobalPlayer`, `SupportTickets`, `RenewalModal`, `AuthContext`, `VideoContext` e `useMovieState`. A adaptação principal já realizada foi Capacitor/browser checkout e a configuração do backend novo.

A paridade funcional ainda precisa ser validada em aparelho Android para: catálogo M3U real, reprodução VOD/episódios/canais, URLs proxy, dados TMDB, favoritos/assistidos, alertas, agenda, tickets, renovação e carregamento de configurações do novo Supabase.

## Risco identificado

O importador originalmente informa JSON/HTML, não XLSX/CSV diretamente. A normalização atualizada do Gestor converte `Usuario`, `Senha`, `Expiração`, `Status` e próximo vencimento para os campos internos. Essa versão deve ser mantida como base para qualquer nova compilação do Gestor.

## Regra de segurança do desenvolvimento

Todas as próximas alterações devem ocorrer exclusivamente nas cópias locais dos APKs. O repositório original permanece somente como referência.

## Verificação do backend novo em 29/08/2026

A autenticação administrativa e de cliente responderam corretamente após as republicações. A lista importada continha 93 registros e apresentava os campos internos `u`, `p`, `e` e `t`.

Foram encontrados dois bloqueadores de integração que precisam ser tratados antes de considerar a paridade operacional concluída. A função `tmdb-proxy` responde `TMDB token not configured`, indicando que `TMDB_API_TOKEN` ou `TMDB_API_KEYS` ainda não foi configurada no Supabase novo. A função `app-settings` responde `Internal Server Error` em leitura, o que sugere que a linha `id = main` da tabela `app_settings` não foi criada corretamente ou que a função publicada ainda está desalinhada.

As funções `football-matches`, `match-reminders` e `content-alerts` responderam HTTP 200 em chamadas diagnósticas. Isso confirma apenas o contrato básico, não a disponibilidade completa dos dados externos.

Variáveis externas referenciadas pelo código: `TMDB_API_KEYS`/`TMDB_API_TOKEN`, `APIFOOTBALL_COM_KEY`/`APIFOOTBALL_COM_KEYS`, `PUSHALERT_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `NATV_API_TOKEN`, `NATV_API_BASE_URL`, além das secrets administrativas, AbacatePay e Supabase.

## Rotação TMDB

A implementação anterior escolhia uma chave aleatoriamente (`Simple random rotation`) e não fazia failover quando a chave retornava 401, 403, 429 ou erro temporário. Isso não garantia a rotação solicitada. As cópias locais foram atualizadas para tentar as chaves configuradas em sequência e avançar automaticamente para a próxima em falhas de autorização, limite ou indisponibilidade. Essa alteração precisa ser republicada como `tmdb-proxy` no Supabase antes de produzir uma versão final dos APKs.

O primeiro teste pós-cadastro ainda não confirmou catálogo TMDB no endpoint publicado; a função retornou HTTP 500 sem corpo legível. Portanto, a secret pode ainda não estar disponível para a função publicada ou o proxy publicado ainda é uma versão antiga. A republicação e um novo teste são obrigatórios.

## Matriz de reprodução preparada

| Tipo | Resolução de URL | Motor no player | Fallbacks | Estado |
|---|---|---|---|---|
| Canais ao vivo | `LiveTV` usa credenciais M3U/Xtream do cliente e constrói `/live/user/pass/id.m3u8`; sem credenciais tenta `stream-lookup` | HLS.js/MPEG-TS no Android e HLS nativo quando aplicável | TS, rota bruta, M3U8, proxy Supabase, reconexão controlada | Código preparado; requer stream real |
| Filmes | `MovieModal` usa ID e credenciais do cliente; sem ID usa `stream-lookup` com `source_url` individual | Vídeo nativo para MP4/MKV/TS e HLS quando necessário | URLs direta/proxy, MP4/MKV, HLS/MPEG-TS | Código preparado; requer stream real |
| Séries/episódios | `series-lookup` recebe `source_url` individual e usa Xtream `get_series_info`, busca por nome ou grep M3U | Vídeo nativo/HLS/MPEG-TS conforme URL do episódio | ID numérico, busca por nome, fallback M3U | Código preparado; requer stream real |

A função `stream-proxy` mantém User-Agent VLC, suporta Range/seek, reescreve playlists HLS para passar segmentos pelo proxy, evita cache em live e preserva conteúdo de VOD. A confirmação de reprodução depende de uma fonte M3U real com pelo menos um canal, um filme e uma série acessíveis pela conta de homologação.

## Evidência do vídeo de homologação — 29/08/2026

O vídeo mostra login bem-sucedido do cliente `vitor.camila`, catálogo e banners carregando normalmente, mas a seleção do filme `Obsessão` termina com: `Falha na Reprodução - Formato incompatível ou acesso bloqueado pelo servidor (CORS/403). Todas as rotas falharam.` A mesma mensagem ocorre ao abrir o canal ao vivo `PREMIERE CLUBES FHD`. O Gestor mostra a conta como ativa, expiração em 21/09/2026, fonte M3U individual em servidor HTTP e catálogo com 12.960 filmes, 5.812 séries e 988 canais.

A evidência descarta falha de login, TMDB visual e carregamento de catálogo como causa primária. O bloqueador está depois da resolução do conteúdo: URL de stream, autenticação no servidor IPTV, proxy `stream-proxy`, headers/CORS, formato/codec ou aplicação Android do player. A mensagem agregada não diferencia 401/403 de timeout, formato incompatível ou erro de codec; a próxima correção deve preservar o erro upstream e registrar a tentativa sem expor credenciais.
