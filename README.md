# SIM Monitor - Frontend

Interface web para o Sistema de Monitoramento da Lavanderia 60 Minutos (SIM).

## Funcionalidades

- Dashboard em tempo real do status das lojas
- Monitoramento de dispositivos (lavadoras, secadoras, dosadoras)
- Controle de reinicialização remota
- Visualização de métricas do sistema (CPU, memória, disco)
- Interface responsiva e moderna

## Tecnologias

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Firebase Realtime Database
- Material-UI (MUI)

## Pré-requisitos

- Node.js 18.17 ou superior
- npm ou yarn
- Configurações do Firebase (apiKey, authDomain, etc)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/sim-monitor-frontend.git
cd sim-monitor-frontend
```

2. Instale as dependências:
```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` com as seguintes variáveis:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
NEXT_PUBLIC_FIREBASE_DATABASE_URL=sua_database_url
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
# ou
yarn dev
```

O aplicativo estará disponível em [http://localhost:3000](http://localhost:3000)

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria a build de produção
- `npm run start` - Inicia o servidor de produção
- `npm run lint` - Executa o linter

## Estrutura do Projeto

```
frontend/
├── app/                # Páginas e componentes da aplicação
├── components/         # Componentes reutilizáveis
├── lib/               # Utilitários e configurações
├── public/            # Arquivos estáticos
└── styles/            # Estilos globais e temas
```

## Integração com Firebase

O frontend se conecta ao Firebase Realtime Database para:
- Monitorar status das lojas em tempo real
- Controlar reinicializações remotas
- Visualizar métricas e logs
- Gerenciar configurações das lojas

## Deploy

Para fazer deploy em produção:

1. Crie a build de produção:
```bash
npm run build
```

2. Inicie o servidor de produção:
```bash
npm run start
```

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
