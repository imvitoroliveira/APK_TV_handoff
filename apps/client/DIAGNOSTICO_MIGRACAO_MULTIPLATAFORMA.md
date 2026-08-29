# Diagnóstico de migração multiplataforma — Watch Wish Play

**Projeto analisado:** [imvitoroliveira/watch-wish-play](https://github.com/imvitoroliveira/watch-wish-play)  
**Data da análise:** 27 de agosto de 2026  
**Autor:** Manus AI

## 1. Conclusão executiva

A migração é **tecnicamente viável** e as principais regras de negócio podem ser preservadas. O projeto já possui uma separação razoável entre interface React, backend serverless no Supabase e lógica de catálogo/player. Portanto, não é necessário reescrever todo o produto para gerar um aplicativo Android.

A rota mais adequada para a primeira etapa é transformar o build atual em um aplicativo híbrido com **Capacitor**, mantendo React, TypeScript, Supabase Edge Functions e PostgreSQL. Essa abordagem aproveita grande parte da interface existente e gera um projeto Android nativo que pode produzir APK/AAB. Ela também mantém uma porta aberta para iOS, porque o Capacitor possui runtimes nativos para Android e iOS [1].

Contudo, há uma distinção importante: **APK é um formato Android**. Ele não é instalável diretamente em computadores Windows/macOS/Linux nem em iPhones. Para computadores, o produto deve continuar disponível como web/PWA ou receber um empacotamento próprio, como Electron ou Tauri. Para iOS, será necessário gerar um projeto iOS e publicar um IPA pela cadeia de distribuição da Apple; isso exige uma adaptação do player, notificações, armazenamento e revisão da App Store.

Minha recomendação é uma arquitetura em três superfícies: **Android móvel e TV Box usando a mesma base Capacitor, web/PWA para computadores e iOS como alvo posterior**, condicionado à normalização dos streams para formatos compatíveis com AVPlayer e à verificação de direitos de distribuição do conteúdo.

## 2. O que existe hoje no repositório

O repositório é uma aplicação React 18 + TypeScript + Vite, estilizada com TailwindCSS/shadcn/ui, usando React Router, TanStack Query, Framer Motion e Supabase. O backend contém **21 Edge Functions** e o código analisado possui aproximadamente **22,7 mil linhas** entre frontend e funções serverless.

| Área | Implementação atual | Impacto na migração |
|---|---|---|
| Login de cliente e administrador | Edge Functions `client-login` e `admin-login`, com estado em `localStorage`/`sessionStorage` | Reutilizável; deve trocar armazenamento frágil por armazenamento seguro no dispositivo |
| Catálogo | Parser M3U no backend, catálogo otimizado por ID e busca sob demanda | Reutilizável; excelente para evitar baixar listas grandes no dispositivo |
| Filmes e séries | TMDB via proxy, cards, detalhes, trailers e temporadas | Reutilizável via HTTP; telas precisam de adaptação para toque e TV |
| Reprodução | `GlobalPlayer`, `VideoPlayer`, HLS.js, mpegts.js, `<video>`, proxy Cloudflare/Supabase | Principal risco técnico; exige validação nativa por plataforma |
| TV ao vivo | `LiveTV`, lookup/proxy de streams e reconexão | Viável, mas requer player nativo e testes em TV Box de baixo desempenho |
| Esportes | API de futebol, jogos ativos e lembretes | Reutilizável; notificações precisam de implementação nativa |
| Suporte | Tickets e central de ajuda | Reutilizável via Supabase |
| Administração | CRUD de clientes, catálogo, status online, testes e configurações | Pode permanecer web responsivo; não precisa necessariamente ir para TV |
| Pagamentos | Webhooks Cakto e AbacatePay no backend | Reutilizável no backend; o fluxo de compra no app deve ser revisado para Android/iOS |
| Notificações | PushAlert e APIs de Notification do navegador | Android exige integração nativa; iOS exige APNs e consentimento adequado |
| PWA | `manifest.json`, service worker e prompts de instalação | Mantido para web; substituído/complementado por recursos nativos no app |
| Versões V1/V2 | Seleção persistida por `localStorage` | Reutilizável, com migração para armazenamento nativo |

O README e a documentação do projeto descrevem corretamente uma arquitetura em que o dispositivo consulta Supabase, o backend resolve IDs e o player passa por proxies para lidar com CORS, User-Agent, Range e fontes IPTV. Essa decisão reduz a carga no aparelho, mas faz com que a disponibilidade e o comportamento do serviço dependam fortemente das Edge Functions, do Worker Cloudflare e dos servidores de origem.

## 3. Resultado da validação local

O build de produção foi executado depois da instalação das dependências e **concluiu com sucesso**. Foram observados dois avisos: o bundle JavaScript principal é grande, com aproximadamente 1,7 MB antes de gzip, e existe uma combinação de importação dinâmica e estática de `use-toast.ts` que reduz a eficácia do code splitting. Esses pontos não impedem a geração do APK, mas afetam tempo de inicialização e memória, sobretudo em TV Boxes simples.

A instalação limpa via `npm ci` não foi possível porque o `package-lock.json` não está sincronizado com o `package.json`; o npm reportou dependências ausentes no lockfile. A instalação comum conseguiu reconciliar o ambiente local, mas o lockfile deve ser corrigido e versionado antes de configurar CI/CD.

Os testes apresentaram **61 aprovados e 195 falhos em 256**, distribuídos em 4 arquivos aprovados e 23 falhos. As falhas observadas foram de integração externa: os testes tentaram acessar um hostname Supabase que não resolveu no ambiente de auditoria. Portanto, esse resultado não deve ser interpretado automaticamente como 195 bugs do frontend; é necessário executar os testes contra o projeto Supabase real ou um ambiente de staging configurado. Ainda assim, a suíte atual mistura testes unitários com testes que dependem de serviços online, o que dificulta validar a migração.

Há também um ponto de segurança prioritário: o arquivo `.env` aparece rastreado pelo Git. Mesmo que contenha apenas URL e chave pública do Supabase, isso contraria a própria documentação do projeto e deve ser corrigido antes de distribuir o código. Deve-se remover o arquivo do histórico quando necessário, rotacionar qualquer segredo que tenha sido exposto e manter credenciais administrativas exclusivamente nas variáveis das Edge Functions.

## 4. Avaliação das três vias possíveis

### Via A — Capacitor, recomendada para a primeira versão

O Capacitor adiciona um runtime nativo ao aplicativo web e permite criar projetos Android e iOS, mantendo a maior parte da UI web e oferecendo ponte para APIs nativas [1] [2]. No seu caso, essa via permite reaproveitar páginas, componentes, chamadas Supabase, regras de autenticação, catálogo e painel administrativo.

A ressalva é que o Capacitor não transforma automaticamente um player web problemático em um player nativo perfeito. Para filmes, séries e TV ao vivo, eu recomendaria manter a interface de seleção em React, mas delegar a reprodução a um player nativo Android/iOS quando o stream exigir estabilidade, seek, fullscreen, áudio em segundo plano ou suporte a formatos que o WebView não reproduza bem.

### Via B — React Native/Expo, adequada se a experiência nativa for prioridade

Uma reimplementação em React Native daria melhor controle sobre navegação, foco de controle remoto, armazenamento seguro, notificações e players nativos. No entanto, as telas atuais em Tailwind para web não são reaproveitáveis diretamente: elementos HTML, CSS, Radix UI, `<video>`, `window`, `document`, `localStorage` e APIs de navegador precisariam ser substituídos por componentes React Native.

Essa via é possível, mas representa uma migração substancial. Ela é justificável se o objetivo for um produto com UX realmente nativa, forte uso de TV Box, múltiplas telas de configurações do dispositivo, downloads/offline ou controle avançado de áudio e vídeo. Não é a melhor primeira etapa se a prioridade é obter rapidamente um APK sem perder a aplicação web funcional.

### Via C — WebView simples, TWA ou wrapper mínimo

Uma Trusted Web Activity ou WebView simples é a alternativa de menor esforço. Ela pode ser útil para validar distribuição interna, mas não resolve adequadamente problemas de player, notificações, armazenamento seguro, integração com controle remoto ou diferenças entre TV Boxes. Também mantém o produto dependente da qualidade do navegador/WebView instalado.

Essa via só deve ser escolhida como protótipo ou distribuição temporária. Para um produto comercial, Capacitor com plugins nativos oferece uma base mais controlável.

| Critério | Capacitor | React Native/Expo | WebView/TWA simples |
|---|---:|---:|---:|
| Reaproveitamento do código atual | Alto | Baixo a médio | Muito alto |
| Velocidade para gerar Android | Alta | Média/baixa | Muito alta |
| Controle de player nativo | Alto com plugin | Alto | Baixo |
| Adequação a TV Box | Média, com trabalho de foco | Alta, se feito para TV | Baixa/média |
| Caminho para iOS | Bom | Bom | Limitado |
| Manutenção de duas UIs | Baixa | Média/alta | Baixa |
| Risco de reescrita | Baixo/médio | Alto | Baixo |
| Recomendação | **Primeira etapa** | Segunda etapa se necessário | Apenas protótipo |

## 5. Compatibilidade por plataforma

### Android celular

A compatibilidade é **alta**. O app atual é uma SPA e seu backend é acessado por HTTPS, portanto login, catálogo, TMDB, suporte, agenda, renovação e administração podem continuar funcionando. O que precisa ser adaptado é o ciclo de vida do app, o armazenamento de sessão, push, tratamento de links externos, orientação de tela, fullscreen e reprodução em diferentes codecs.

O APK deve ser produzido para testes internos, mas a distribuição comercial deve priorizar **AAB** na Google Play. Também será necessário configurar nome do pacote, assinatura, ícone, splash screen, permissões, política de privacidade e comportamento quando o dispositivo fica offline.

### Android TV e TV Box

A compatibilidade é **viável, mas não automática**. A documentação oficial do Android TV prevê uma arquitetura de apps para TV e possui orientações próprias para criar navegação, tratar controles, construir UIs adaptativas e publicar para Android TV [3] [4].

A interface atual foi pensada principalmente para mouse/toque e utiliza grids, modais, busca, tabs e controles de vídeo. Em TV, cada item precisa ser alcançável pelo D-pad, ter foco visual evidente, aceitar Enter/Back e respeitar zonas seguras da tela. A navegação não pode depender de hover, gesto, scroll fino ou teclado virtual de celular.

O app deve ter um modo TV explícito, preferencialmente com layout em paisagem, cards maiores, menos informação por tela, foco controlado e botões de reprodução adequados ao controle remoto. O painel de administrador não deve ser uma prioridade para TV; ele pode ficar restrito a web/desktop.

Também será necessário testar uma matriz de TV Boxes reais, pois “Android TV Box” inclui aparelhos com versões antigas, WebViews diferentes, memória limitada, resoluções variadas e, em alguns casos, Android genérico sem certificação Google. A compatibilidade de 32/64 bits e a exigência futura de 64 bits para dispositivos Google TV/Android TV devem ser consideradas no empacotamento [5].

### Computadores

Um APK não é a solução para computadores. A versão web atual já é a melhor superfície para desktop, especialmente para o painel administrativo. Se for desejável um instalável, há duas opções: manter a web/PWA como produto oficial para computadores ou criar um wrapper Electron/Tauri. A segunda opção adiciona uma matriz de empacotamento, atualizações, assinatura e segurança sem trazer grande benefício para um sistema cujo backend já é remoto.

A recomendação é **não criar um “APK para computador”**. Deve-se manter o domínio web/PWA e, caso usuários exijam um ícone instalável, oferecer um aplicativo desktop em uma etapa posterior.

### iPhone e iPad

A compatibilidade é **possível, porém condicionada**, e não deve ser prometida como cópia integral do comportamento Android. O Capacitor oferece caminho de iOS, mas o build depende do ecossistema Xcode/CocoaPods e das exigências atuais do SDK [6].

O maior bloqueio é o player. A Apple documenta HLS como tecnologia própria para entrega de áudio e vídeo em seus dispositivos, com suporte por AVKit, AVFoundation e WebKit [7]. Por isso, o backend deveria fornecer HLS bem formado, preferencialmente com codecs e contêineres amplamente compatíveis, em vez de depender de MKV bruto, conversão improvisada de Content-Type ou injeção de cabeçalhos concebida para navegador.

O uso atual de `.mkv`, `.ts`, HLS.js, mpegts.js, MediaSource e proxies com User-Agent VLC pode funcionar em alguns navegadores Android, mas não constitui garantia para AVPlayer/iOS. A solução robusta seria um endpoint de playback que resolva o conteúdo e entregue HLS/fMP4 de forma legítima e estável. Se a origem só fornecer formatos incompatíveis, será necessário transcodificar no servidor ou limitar a reprodução no iOS.

A publicação na App Store também depende de revisão de segurança, privacidade, APIs públicas, conteúdo, pagamentos e direitos. As diretrizes da Apple determinam que apps usem APIs públicas, estejam atualizados para o sistema vigente, protejam informações do usuário e observem regras de conteúdo e negócio [8]. Como o próprio projeto descreve conteúdo IPTV de servidores de terceiros, a empresa precisa comprovar que possui autorização para distribuir e reproduzir esse conteúdo. Nenhuma decisão técnica elimina esse requisito.

## 6. O que pode ser preservado e o que precisa ser refeito

| Grupo | Preservação esperada | Trabalho necessário |
|---|---|---|
| Regras de login, expiração e seleção V1/V2 | Muito alta | Adaptar persistência e ciclo de vida |
| Supabase, Edge Functions e banco | Muito alta | Configurar ambientes, CORS, tokens e observabilidade |
| Catálogo por Universal ID | Muito alta | Manter; é uma boa decisão para dispositivos limitados |
| TMDB e futebol | Alta | Validar rede, cache e estados offline |
| Dashboard e componentes de negócio | Alta no Capacitor | Ajustar responsividade, safe areas e navegação |
| Admin | Alta na web; média no app | Definir se será mobile, desktop ou apenas web |
| Player VOD/Live | Média | Criar camada de abstração e player nativo por plataforma |
| MKV e TS | Baixa no iOS; variável no Android | Normalizar formato ou implementar transcodificação |
| PushAlert/browser Notification | Baixa como implementação atual | Migrar para push nativo, com FCM e APNs quando aplicável |
| PWA/service worker | Mantida na web | Não deve ser a base das garantias nativas |
| Pagamentos e webhooks | Alta no backend | Revisar checkout e regras de loja por plataforma |
| Controle remoto de TV | Não existe integralmente hoje | Criar navegação por foco/D-pad e modo TV |

## 7. Arquitetura recomendada

A arquitetura sugerida é manter uma única camada de domínio e três adaptadores de apresentação/reprodução:

```text
                    Supabase/PostgreSQL
                            |
                   21 Edge Functions
                            |
        +-------------------+-------------------+
        |                   |                   |
    Web/PWA            Android/TV            iOS
 React atual         Capacitor + TV mode   Capacitor + native player
        |                   |                   |
 HTML video        ExoPlayer/Media3       AVPlayer/HLS
        |                   |                   |
        +-------- Playback API estável --------+
```

A camada compartilhada deve conter tipos, autenticação, catálogo, chamadas de API, regras de expiração, títulos, TMDB, futebol, tickets e telemetria. A camada de plataforma deve conter armazenamento seguro, push, fullscreen, orientação, deep links, foco de TV, media session e reprodução.

O `GlobalPlayer` deve ser refatorado para depender de uma interface, por exemplo `PlaybackAdapter`, em vez de decidir diretamente entre `<video>`, HLS.js, mpegts.js e proxies. A implementação web pode preservar o comportamento atual; a Android pode usar Media3/ExoPlayer, cuja documentação oficial lista suporte a HLS e contêineres condicionados aos codecs presentes [9]; a iOS pode usar AVPlayer, priorizando HLS.

## 8. Plano recomendado de execução

**Fase 0 — Higienização e baseline.** Remover `.env` do controle de versão, rotacionar segredos expostos, corrigir o lockfile, separar testes unitários de testes de integração, criar um ambiente Supabase de staging e registrar uma matriz real de URLs/formats de stream autorizados.

**Fase 1 — Android com Capacitor.** Adicionar Capacitor ao Vite, gerar o projeto Android, configurar identidade visual e assinatura, migrar armazenamento para uma solução segura, integrar notificações Android e validar login, catálogo, suporte e renovação. O APK inicial deve ser uma versão de homologação, não ainda a versão final de TV.

**Fase 2 — Player robusto.** Implementar a abstração de reprodução. Medir separadamente VOD MP4, HLS, TS e MKV, além de seek, retomada, fullscreen, troca de áudio, interrupção de rede e retorno do app ao foreground. Onde necessário, substituir o pipeline de navegador por player nativo.

**Fase 3 — Modo TV Box.** Criar layout de TV, navegação D-pad, estados de foco, botão Back, paisagem, cards maiores, controles remotos e testes em aparelhos reais. Declarar suporte a TV somente depois de validar aparelhos de baixo desempenho e diferentes resoluções.

**Fase 4 — iOS.** Só iniciar depois de a API de playback entregar HLS/fMP4 compatível. Criar projeto iOS, integrar APNs, revisar consentimentos, armazenamento, privacidade, compras/renovações e preparar a documentação de direitos de conteúdo exigida para revisão.

**Fase 5 — Desktop opcional.** Manter web/PWA como primeira opção. Criar Electron/Tauri apenas se houver necessidade comprovada de instalador, integração local ou política comercial específica.

## 9. Veredito final

**Sim, as lógicas e funcionalidades cabem na nova etapa**, especialmente usando Capacitor. Login, expiração, catálogo, filmes, séries, agenda, roleta, quiz, suporte, presença, painel administrativo, Supabase e webhooks podem ser preservados com pouca ou média adaptação.

**Não é seguro afirmar que o player atual será integralmente portável sem mudanças.** A reprodução é o núcleo de risco, principalmente por combinar fontes IPTV, CORS bypass, User-Agent, Range, HLS.js, mpegts.js, TS e MKV. Para Android, há boa perspectiva de sucesso com player nativo. Para iOS, a viabilidade depende da entrega de HLS/fMP4 compatível e da aprovação da Apple.

**A TV Box exige uma experiência própria, não apenas o mesmo APK de celular.** O binário pode ser compartilhado em boa parte, mas a navegação, o foco, o controle remoto, a orientação e o desempenho precisam de um modo TV dedicado.

A decisão recomendada é: **começar pelo Android/TV com Capacitor, conservar a web para computadores e preparar iOS após estabilizar o pipeline de mídia**. Essa rota reduz retrabalho, preserva o investimento existente e evita transformar uma migração de distribuição em uma reescrita completa do produto.

## Referências

[1]: https://capacitorjs.com/docs — Capacitor Documentation: Cross-platform Native Runtime for Web Apps.

[2]: https://capacitorjs.com/docs/android — Capacitor Android Documentation.

[3]: https://developer.android.com/training/tv — Android TV overview, Android Developers.

[4]: https://developer.android.com/training/tv/get-started — Get started with TV apps, Android Developers.

[5]: https://android-developers.googleblog.com/2025/08/64-bit-app-compatibility-for-google-tv-and-android-tv.html — 64-bit app compatibility for Google TV and Android TV.

[6]: https://capacitorjs.com/docs/ios — Capacitor iOS Documentation.

[7]: https://developer.apple.com/documentation/http-live-streaming — HTTP Live Streaming, Apple Developer Documentation.

[8]: https://developer.apple.com/app-store/review/guidelines/ — App Review Guidelines, Apple Developer.

[9]: https://developer.android.com/media/media3/exoplayer/supported-formats — Supported formats, Android Media3/ExoPlayer.
