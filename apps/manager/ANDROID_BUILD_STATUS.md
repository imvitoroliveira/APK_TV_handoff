# Status do build Android — Meu Stream

Foi criada uma cópia independente do projeto em `/home/ubuntu/watch-wish-play-android-copy`, sem push ou alteração intencional no repositório original do GitHub.

## Primeiro artefato

- Formato: APK de debug/homologação
- Arquivo: `android/app/build/outputs/apk/debug/app-debug.apk`
- Application ID: `com.clientestoptv.meustream`
- Tamanho: 5.533.261 bytes
- SHA-256: `c2af42c03f55efcf18a6659911e45fcbb22e7040c537097aa9dc03a2191740f7`

## Alterações na cópia

O projeto web foi empacotado com Capacitor 8. Foram adicionados `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app` e `@capacitor/browser`. O modal de renovação foi adaptado para abrir o checkout via navegador nativo no Android, mantendo `window.location.assign` como fallback web.

## Limitações

Este APK é um artefato de homologação. O build compilou com sucesso, mas ainda não foi instalado em um celular ou TV Box reais nesta sessão. Login, reprodução de filmes, episódios, checkout e confirmação de renovação precisam ser validados com o ambiente Supabase e as fontes de mídia reais. O APK também está assinado com a chave de debug e não deve ser usado como versão de produção ou publicado na loja.

## Próxima etapa

Instalar o APK em um dispositivo Android, executar os fluxos de login, catálogo, filme, episódio, pagamento e retorno, registrar falhas e então implementar as correções necessárias na cópia antes de gerar uma versão release assinada.
