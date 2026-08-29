# APK TV — Cliente e Gestor

Repositório independente para os aplicativos Android Cliente e Gestor derivados do produto IPTV original. O repositório original `imvitoroliveira/watch-wish-play` permanece somente como referência e não foi alterado.

## Estrutura

- `apps/client`: aplicativo Cliente Capacitor, `com.clientestoptv.meustream`.
- `apps/manager`: aplicativo Gestor Capacitor, `com.clientestoptv.meustream.manager`.
- `artifacts/apks`: APKs debug de homologação mais recentes.
- `artifacts/APK_TV_backend_updates.zip`: funções Edge atualizadas para publicação no Supabase.
- `docs/TRANSFERENCIA_TECNICA_PARA_IA.md`: diagnóstico completo para outra inteligência artificial assumir o trabalho.
- `artifacts/diagnostics`: auditoria funcional e análise do vídeo de homologação.

## Estado atual

Login Cliente e Gestor, importação de planilhas, banners, logos, catálogo e navegação básica estão funcionais. A reprodução de canais ao vivo, filmes e séries continua sendo o bloqueador principal e ainda exige homologação com uma fonte M3U real. A Agenda VIP recebeu uma correção local para não permanecer presa a placares antigos.

Leia primeiro `docs/TRANSFERENCIA_TECNICA_PARA_IA.md`. O documento registra as tentativas que falharam, o comportamento observado no vídeo, as funções publicadas, os APKs gerados e a ordem recomendada para continuar o diagnóstico.

## Backend

Projeto Supabase:

```text
https://dwuzlbvhnfuynglsbemo.supabase.co
```

Não coloque tokens, senhas, URLs M3U ou dados de clientes neste repositório. Recrie o `.env` a partir do `.env.example` e mantenha secrets somente no Supabase Edge Functions → Secrets.

## Compilação local

Dentro de cada aplicativo:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

## Deploy das funções

O CLI global não precisa estar no PATH. No PowerShell, usando a pasta que contém `supabase/functions`:

```powershell
npx.cmd --yes supabase@latest functions deploy NOME_DA_FUNCAO --project-ref dwuzlbvhnfuynglsbemo
```

A ordem e o diagnóstico estão no documento de transferência. O deploy não deve ser feito antes de substituir os arquivos pelo pacote mais recente em `artifacts/APK_TV_backend_updates.zip`.

## Segurança

Este repositório foi preparado para transferência técnica. Os APKs são builds debug e não devem ser distribuídos a clientes finais antes da homologação real, assinatura release e revisão das regras de acesso.
