'use client'

import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, remove } from 'firebase/database'
import { Toaster, toast } from 'react-hot-toast'

const firebaseConfig = {
  apiKey: "AIzaSyAl5ZbgWviD4vf-3BjOZB9uQGhxPQT7Dy0",
  authDomain: "lav60-sim.firebaseapp.com",
  databaseURL: "https://lav60-sim-default-rtdb.firebaseio.com",
  projectId: "lav60-sim",
  storageBucket: "lav60-sim.firebasestorage.app",
  messagingSenderId: "76967549738",
  appId: "1:76967549738:web:005e2522cbd495a8491c53"
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

interface Store {
  id: string;
  store_id: string;
  app_status: string;
  tv_status: string;
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  port_3000: boolean;
  devices: {
    dosadoras: Array<{ name: string; online: boolean }>;
    lavadoras: Array<{ name: string; online: boolean }>;
    secadoras: Array<{ name: string; online: boolean }>;
    outros: Array<{ name: string; online: boolean }>;
  };
  machine_name: string;
  restart_message?: string;
  restart_status?: string;
}

interface RegionMap {
  [key: string]: string;
}

interface GroupedStores {
  [region: string]: {
    [state: string]: Store[];
  };
}

interface StatusSummary {
  [key: string]: number;
}

export default function Home() {
  const [stores, setStores] = useState<Store[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showRestartConfirm, setShowRestartConfirm] = useState<string | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<{[key: string]: boolean}>({
    'Norte': true,
    'Nordeste': true,
    'Centro-Oeste': true,
    'Sudeste': true,
    'Sul': true,
    'Outras': true
  })
  
  const [expandedStates, setExpandedStates] = useState<{[key: string]: boolean}>({})
  const [showRegionRestartConfirm, setShowRegionRestartConfirm] = useState<string | null>(null)
  const [showStateRestartConfirm, setShowStateRestartConfirm] = useState<{region: string, state: string} | null>(null)
  const [playedOfflineAlerts, setPlayedOfflineAlerts] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    // Verifica o status a cada 5 segundos
    const timer = setInterval(checkAndUpdateStatus, 5000)
    
    console.log(' Conectando ao Firebase...')
    const storesRef = ref(database, 'lojas')
    
    const unsubscribe = onValue(storesRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        console.log(' Dados recebidos do Firebase:', new Date().toLocaleString())
        const storesList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value, // Todos os dados já estão no nível da loja
          store_id: id // Mantendo o ID da loja para referência
        }))
        setStores(storesList)
      } else {
        setStores([]) // Se não houver dados, limpa a lista
      }
    })

    return () => {
      clearInterval(timer)
      unsubscribe()
    }
  }, [])

  // Função para tocar o som de alerta offline
  const playOfflineAlert = () => {
    const audio = new Audio('/notification-offline.mp3')
    audio.play().catch(error => console.log('Erro ao tocar áudio offline:', error))
  }

  // Função para tocar o som de alerta online
  const playOnlineAlert = () => {
    const audio = new Audio('/notification-online.mp3')
    audio.play().catch(error => console.log('Erro ao tocar áudio online:', error))
  }

  // Função para verificar e atualizar status localmente
  const checkAndUpdateStatus = () => {
    const now = new Date()
    
    setStores(currentStores => 
      currentStores.map(store => {
        const lastUpdate = new Date(store.timestamp)
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)
        
        // Verifica se a loja ficou offline
        if (diffMinutes > 5 && store.app_status !== 'down' && !playedOfflineAlerts[store.store_id]) {
          console.log(` Servidor ${store.store_id} está offline! Última atualização: ${lastUpdate.toLocaleString()}`)
          console.log(` Tempo sem atualização: ${Math.floor(diffMinutes)} minutos`)
          
          // Tocar som e mostrar notificação de offline
          playOfflineAlert()
          toast.error(`Loja ${store.store_id} está offline!`, {
            duration: 5000,
            position: 'bottom-right',
            icon: '🔴',
            style: {
              background: '#FEE2E2',
              color: '#991B1B',
              border: '1px solid #FCA5A5',
            },
          })

          // Marcar que já tocamos o alerta para esta loja
          setPlayedOfflineAlerts(prev => ({ ...prev, [store.store_id]: true }))
          
          // Tenta atualizar no Firebase
          set(ref(database, `lojas/${store.id}`), {
            ...store,
            app_status: 'down',
            timestamp: now.toISOString()
          }).catch(() => {
            console.log(' Não foi possível atualizar o Firebase, mas o status foi alterado localmente')
          })
          
          return {
            ...store,
            app_status: 'down',
            timestamp: now.toISOString()
          }
        }

        // Verifica se a loja voltou a ficar online
        if (store.app_status === 'running' && playedOfflineAlerts[store.store_id]) {
          console.log(` Servidor ${store.store_id} está online novamente!`)
          
          // Tocar som e mostrar notificação de online
          playOnlineAlert()
          toast.success(`Loja ${store.store_id} está online novamente!`, {
            duration: 5000,
            position: 'bottom-right',
            icon: '🟢',
            style: {
              background: '#ECFDF5',
              color: '#065F46',
              border: '1px solid #A7F3D0',
            },
          })

          // Resetar o alerta para esta loja
          setPlayedOfflineAlerts(prev => {
            const newState = { ...prev }
            delete newState[store.store_id]
            return newState
          })
        }

        return store
      })
    )
  }

  // Função para excluir loja
  const handleDelete = async (storeId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Evita abrir o modal ao clicar no botão de excluir
    setShowDeleteConfirm(storeId)
  }

  // Função para confirmar exclusão
  const confirmDelete = async (storeId: string) => {
    try {
      await remove(ref(database, `lojas/${storeId}`))
      setShowDeleteConfirm(null)
      console.log(`Loja ${storeId} excluída com sucesso`)
    } catch (error) {
      console.error('Erro ao excluir loja:', error)
    }
  }

  // Função para reiniciar uma loja
  const handleRestart = async (storeId: string) => {
    try {
      await set(ref(database, `lojas/${storeId}/restart`), true)
      console.log(`Solicitação de restart enviada para loja ${storeId}`)
      setShowRestartConfirm(null) // Fecha o modal após confirmar
      setSelectedStore(null) // Fecha o modal de detalhes
    } catch (error) {
      console.error('Erro ao solicitar restart:', error)
    }
  }

  // Função para obter o status geral da loja
  const getStatusDisplay = (store: Store) => {
    // Verifica se está inativo por mais de 5 minutos
    const lastUpdate = new Date(store.timestamp).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000 // 5 minutos em milissegundos
    const isInactiveTooLong = (now - lastUpdate) > fiveMinutes

    // Se estiver inativo por muito tempo, mostra como desligado
    if (isInactiveTooLong) {
      return {
        text: 'Desligado',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      }
    }

    // Se estiver rodando normalmente
    if (store.app_status === 'running' && store.restart_status !== 'accepted') {
      return {
        text: 'Rodando',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800'
      }
    }

    // Para qualquer outro estado (reiniciando, erro, build, etc)
    return {
      text: 'Reiniciando',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800'
    }
  }

  // Função para obter o status da TV
  const getTVStatus = (store: Store) => {
    const now = new Date()
    const lastUpdate = new Date(store.timestamp)
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)

    // Se o sistema estiver offline por mais de 1 minuto, a TV também estará
    if (diffMinutes > 1 || store.app_status === 'down') {
      return {
        text: 'Offline',
        textColor: 'text-red-600'
      }
    }

    return {
      text: store.tv_status === 'running' ? 'Online' : 'Offline',
      textColor: store.tv_status === 'running' ? 'text-green-600' : 'text-red-600'
    }
  }

  // Função para determinar a região baseada no ID da loja
  const getRegionFromStoreId = (storeId: string): string => {
    const stateCode = storeId.substring(0, 2);
    
    const regions: RegionMap = {
      // Norte
      'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
      // Nordeste
      'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste',
      'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
      // Centro-Oeste
      'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste',
      // Sudeste
      'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
      // Sul
      'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };

    return regions[stateCode] || 'Outras';
  };

  // Função para agrupar lojas por região e estado
  const groupStoresByRegionAndState = (stores: Store[]): GroupedStores => {
    const grouped = stores.reduce((acc: GroupedStores, store) => {
      const stateCode = store.store_id.substring(0, 2);
      const region = getRegionFromStoreId(store.store_id);
      
      if (!acc[region]) {
        acc[region] = {};
      }
      if (!acc[region][stateCode]) {
        acc[region][stateCode] = [];
      }
      acc[region][stateCode].push(store);
      return acc;
    }, {});

    // Ordenar regiões em uma ordem específica
    const regionOrder = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Outras'];
    return regionOrder.reduce((acc: GroupedStores, region) => {
      if (grouped[region] && Object.keys(grouped[region]).length > 0) {
        acc[region] = grouped[region];
      }
      return acc;
    }, {});
  };

  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => ({
      ...prev,
      [region]: !prev[region]
    }))
  }

  const toggleState = (stateCode: string) => {
    setExpandedStates(prev => ({
      ...prev,
      [stateCode]: !prev[stateCode]
    }))
  }

  // Filtrar e agrupar lojas
  const filteredAndGroupedStores = groupStoresByRegionAndState(
    stores.filter(store => {
      const matchesSearch = store.store_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || store.app_status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  );

  // Calcular o resumo dos status apenas para as lojas filtradas
  const statusSummary = Object.values(filteredAndGroupedStores)
    .flatMap(states => Object.values(states))
    .flat()
    .reduce((acc: StatusSummary, store: Store) => {
      acc[store.app_status] = (acc[store.app_status] || 0) + 1;
      return acc;
    }, {} as StatusSummary);

  // Função para obter a mensagem de status detalhada
  const getDetailedStatus = (store: Store) => {
    const lastUpdate = new Date(store.timestamp).getTime()
    const now = new Date().getTime()
    const fiveMinutes = 5 * 60 * 1000
    const isInactiveTooLong = (now - lastUpdate) > fiveMinutes

    // Se estiver inativo por muito tempo
    if (isInactiveTooLong) {
      const minutesInactive = Math.floor((now - lastUpdate) / (60 * 1000))
      return {
        steps: [
          { label: `Última atualização: ${minutesInactive} minutos atrás`, error: true },
          { label: 'Sistema possivelmente desligado', error: true },
          { label: 'Verificar conexão com a loja', error: true }
        ],
        message: 'Sistema Desligado'
      }
    }

    // Se não estiver rodando, mostra os passos de reinicialização
    if (store.app_status !== 'running' || store.restart_status === 'accepted') {
      return {
        steps: [
          { label: '1. Parando aplicação atual', done: true },
          { label: '2. Verificando processos', done: true },
          { label: '3. Instalando dependências', status: 'current' },
          { label: '4. Executando build', pending: true },
          { label: '5. Iniciando aplicação', pending: true }
        ],
        message: 'Reiniciando aplicação...'
      }
    }
    
    return null
  }

  // Função para obter o resumo de status das lojas de um estado
  const getStateStatusSummary = (stores: Store[]) => {
    const summary = stores.reduce((acc: {[key: string]: number}, store) => {
      const status = store.app_status === 'running' ? 'active' : 
                    store.app_status === 'down' ? 'inactive' : 'restarting';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return summary;
  };

  // Função para reiniciar todas as lojas de uma região
  const handleRegionRestart = async (region: string) => {
    try {
      const storesInRegion = Object.values(filteredAndGroupedStores[region])
        .flat()
        .filter(store => store.app_status !== 'restarting');

      await Promise.all(
        storesInRegion.map(store => 
          set(ref(database, `lojas/${store.id}/restart`), true)
        )
      );

      console.log(`Solicitação de restart enviada para todas as lojas da região ${region}`);
      setShowRegionRestartConfirm(null);
    } catch (error) {
      console.error('Erro ao solicitar restart em massa:', error);
    }
  };

  // Função para reiniciar todas as lojas de um estado
  const handleStateRestart = async (region: string, stateCode: string) => {
    try {
      const storesInState = filteredAndGroupedStores[region][stateCode]
        .filter(store => store.app_status !== 'restarting');

      await Promise.all(
        storesInState.map(store => 
          set(ref(database, `lojas/${store.id}/restart`), true)
        )
      );

      console.log(`Solicitação de restart enviada para todas as lojas do estado ${stateCode}`);
      setShowStateRestartConfirm(null);
    } catch (error) {
      console.error('Erro ao solicitar restart em massa:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Toaster />
      {/* Título e Status Overview */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Monitor SIM</h1>
            <p className="mt-2 text-blue-100">Sistema Integrado de Monitoramento</p>
          </div>
          <div className="flex space-x-4">
            <a
              href="/devices"
              className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2 shadow-lg"
            >
              <span>🔌</span>
              <span>Monitor de Dispositivos</span>
            </a>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { status: 'running', label: 'Rodando', count: statusSummary.running || 0, color: 'bg-green-500' },
          { status: 'down', label: 'Desligado', count: statusSummary.down || 0, color: 'bg-red-500' },
          { status: 'error', label: 'Com Erro', count: statusSummary.error || 0, color: 'bg-yellow-500' },
          { status: 'restarting', label: 'Reiniciando', count: statusSummary.restarting || 0, color: 'bg-blue-500' }
        ].map(({ status, label, count, color }) => (
          <div key={status} className={`${color} p-4 rounded-lg shadow-md text-white`}>
            <div className="text-sm opacity-90">{label}</div>
            <div className="mt-1 text-2xl font-bold">{count}</div>
          </div>
        ))}
      </div>

      {/* Barra de Pesquisa e Filtro de Status */}
      <div className="mb-6 flex gap-4 bg-white p-4 rounded-lg shadow-sm">
        <input
          type="text"
          placeholder="Pesquisar loja..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="all">Todos os Status</option>
          <option value="running">Rodando</option>
          <option value="down">Desligado</option>
          <option value="error">Com Erro</option>
          <option value="restarting">Reiniciando</option>
        </select>
      </div>

      {/* Grid de Servidores por Região e Estado */}
      {Object.entries(filteredAndGroupedStores).length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Nenhum servidor encontrado
          </div>
        ) : (
        Object.entries(filteredAndGroupedStores).map(([region, states]) => (
          <div key={region} className="mb-8">
            {/* Cabeçalho da Região */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-lg shadow-md">
              <div 
                className="flex items-center cursor-pointer"
                onClick={() => toggleRegion(region)}
              >
                <span className={`w-6 h-6 flex items-center justify-center text-white transition-transform duration-200 ${
                  expandedRegions[region] ? 'transform rotate-90' : ''
                }`}>
                  ▶
                </span>
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <span className="w-2 h-8 bg-white rounded mr-3"></span>
                  Região {region}
                  <span className="ml-2 text-sm text-blue-100">
                    ({Object.values(states).flat().length} lojas)
                  </span>
                </h2>
              </div>

              {/* Botão de Reinicialização em Massa da Região */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRegionRestartConfirm(region);
                }}
                className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2"
              >
                <span>⟳</span>
                <span>Reiniciar Região</span>
              </button>
            </div>

            {/* Estados dentro da Região */}
            <div className={`pl-8 transition-all duration-300 ${
              expandedRegions[region] 
                ? 'opacity-100 max-h-[10000px]' 
                : 'opacity-0 max-h-0 overflow-hidden'
            }`}>
              {Object.entries(states).map(([stateCode, storesList]) => (
                <div key={stateCode} className="mt-4">
                  {/* Cabeçalho do Estado */}
                  <div 
                    className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center cursor-pointer" onClick={() => toggleState(stateCode)}>
                      <span className={`w-5 h-5 flex items-center justify-center text-gray-500 transition-transform duration-200 ${
                        expandedStates[stateCode] ? 'transform rotate-90' : ''
                      }`}>
                        ▶
                      </span>
                      <h3 className="text-lg font-medium text-gray-700 flex items-center">
                        <span className="w-1 h-6 bg-gray-300 rounded mr-3"></span>
                        {stateCode}
                        <span className="ml-2 text-sm text-gray-500">
                          ({storesList.length} lojas)
                        </span>
                      </h3>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Status Summary */}
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const summary = getStateStatusSummary(storesList);
                          return (
                            <>
                              {summary.active > 0 && (
                                <div className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                                  <span className="text-sm text-green-600">{summary.active}</span>
                                </div>
                              )}
                              {summary.inactive > 0 && (
                                <div className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                                  <span className="text-sm text-red-600">{summary.inactive}</span>
                                </div>
                              )}
                              {summary.restarting > 0 && (
                                <div className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-1"></span>
                                  <span className="text-sm text-blue-600">{summary.restarting}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Botão de Reinicialização em Massa do Estado */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStateRestartConfirm({ region, state: stateCode });
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200 flex items-center space-x-1 text-sm"
                      >
                        <span>⟳</span>
                        <span>Reiniciar Estado</span>
                      </button>
                    </div>
                  </div>

                  {/* Cards das Lojas do Estado */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pl-8 transition-all duration-300 ${
                    expandedStates[stateCode] 
                      ? 'opacity-100 max-h-[5000px]' 
                      : 'opacity-0 max-h-0 overflow-hidden'
                  }`}>
                    {storesList.map((store: Store) => (
            <div 
              key={store.id} 
                        className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-gray-100"
              onClick={() => setSelectedStore(store)}
            >
                        {/* Header with Status */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              store.app_status === 'running' ? 'bg-green-500' : 'bg-red-500'
                            } animate-pulse`}></div>
                            <h3 className="text-lg font-semibold text-gray-900">Loja {store.store_id}</h3>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              store.app_status === 'running' 
                                ? 'bg-green-50 text-green-700 border border-green-100' 
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {store.app_status === 'running' ? 'Ativo' : 'Inativo'}
                </span>
                          </div>
              </div>

                        {/* Restart Status Message */}
                        {store.restart_message && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium">
                              <span className="mr-2">⟳</span>
                              {store.restart_message}
                            </p>
                          </div>
                        )}

                        {/* Machine Info & TV Status */}
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-sm text-gray-600 font-medium">{store.machine_name}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">TV:</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (new Date().getTime() - new Date(store.timestamp).getTime()) / (1000 * 60) > 1 || store.app_status === 'down'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : store.tv_status === 'running' 
                                  ? 'bg-green-50 text-green-700 border border-green-100' 
                                  : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {(new Date().getTime() - new Date(store.timestamp).getTime()) / (1000 * 60) > 1 || store.app_status === 'down'
                                ? 'Offline'
                                : store.tv_status === 'running' ? 'Online' : 'Offline'}
                </span>
                          </div>
              </div>

                        {/* System Metrics */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">CPU</div>
                            <div className={`text-sm font-semibold ${
                              store.cpu_usage > 90 ? 'text-red-600' :
                              store.cpu_usage > 70 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {store.cpu_usage}%
                </div>
                </div>
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">RAM</div>
                            <div className={`text-sm font-semibold ${
                              store.memory_usage > 90 ? 'text-red-600' :
                              store.memory_usage > 70 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {store.memory_usage}%
                            </div>
                          </div>
                          <div className="p-2 bg-gray-50 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">HD</div>
                            <div className={`text-sm font-semibold ${
                              store.disk_usage > 90 ? 'text-red-600' :
                              store.disk_usage > 70 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {store.disk_usage}%
                            </div>
                </div>
              </div>

                        {/* Port Status */}
                        <div className="mb-4">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${store.port_3000 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm text-gray-600">
                              Porta 3000: {store.port_3000 ? 'Ativa' : 'Inativa'}
                    </span>
                          </div>
                        </div>

                        {/* Devices Status */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Dosadoras</div>
                            <div className="flex space-x-1">
                              {store.devices?.dosadoras?.map((device: any, i: number) => (
                                <span key={device.name} className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`} 
                                      title={device.name}></span>
                  ))}
                </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Lavadoras</div>
                            <div className="flex space-x-1">
                  {store.devices?.lavadoras?.map((device: any, i: number) => (
                                <span key={device.name} className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}
                                      title={device.name}></span>
                  ))}
                </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Secadoras</div>
                            <div className="flex space-x-1">
                  {store.devices?.secadoras?.map((device: any, i: number) => (
                                <span key={device.name} className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}
                                      title={device.name}></span>
                  ))}
                </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Outros</div>
                            <div className="flex space-x-1">
                  {store.devices?.outros?.map((device: any, i: number) => (
                                <span key={device.name} className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}
                                      title={device.name}></span>
                  ))}
                </div>
                          </div>
                        </div>

                        {/* Last Update */}
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            Última atualização: {new Date(store.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              </div>
            </div>
          ))
        )}

      {/* Modal de Detalhes */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalhes da Loja {selectedStore.store_id}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(selectedStore.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="Excluir loja"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedStore(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Status do Sistema */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status do Sistema</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <span className="text-gray-500">Status da Aplicação:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.app_status === 'running' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedStore.app_status === 'running' ? 'Rodando' : 'Desligado'}
                    </span>
                  </div>
                  {selectedStore.restart_message && (
                    <div>
                      <span className="text-gray-500">Status de Reinicialização:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {selectedStore.restart_message}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Status da TV:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.tv_status === 'running' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedStore.tv_status === 'running' ? 'Rodando' : 'Desligada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Porta 3000:</span>
                    <span className={`ml-2 font-medium ${selectedStore.port_3000 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedStore.port_3000 ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">CPU:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.cpu_usage > 90 ? 'text-red-600' :
                      selectedStore.cpu_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.cpu_usage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Memória RAM:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.memory_usage > 90 ? 'text-red-600' :
                      selectedStore.memory_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.memory_usage}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">HD:</span>
                    <span className={`ml-2 font-medium ${
                      selectedStore.disk_usage > 90 ? 'text-red-600' :
                      selectedStore.disk_usage > 70 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedStore.disk_usage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Status dos Dispositivos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status dos Dispositivos</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  {/* Dosadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Dosadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.dosadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Lavadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Lavadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.lavadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Secadoras */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Secadoras</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.secadoras?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Outros */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Outros</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedStore.devices?.outros?.map((device: any) => (
                        <div key={device.name} className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${device.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm text-gray-600">{device.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Última atualização: {new Date(selectedStore.timestamp).toLocaleString()}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRestartConfirm(selectedStore.id);
                    }}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Reiniciar
                  </button>
                  <button
                    onClick={() => setSelectedStore(null)}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta loja? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmDelete(showDeleteConfirm);
                  setSelectedStore(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reinicialização */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Reinicialização</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja reiniciar o sistema desta loja? O processo pode levar alguns minutos.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRestartConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRestart(showRestartConfirm)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reinicialização em Massa da Região */}
      {showRegionRestartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Reinicialização em Massa</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja reiniciar todas as lojas da região {showRegionRestartConfirm}? 
              Esta ação afetará {Object.values(filteredAndGroupedStores[showRegionRestartConfirm]).flat().length} lojas.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRegionRestartConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRegionRestart(showRegionRestartConfirm)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirmar Reinicialização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reinicialização em Massa do Estado */}
      {showStateRestartConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Reinicialização em Massa</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja reiniciar todas as lojas do estado {showStateRestartConfirm.state}? 
              Esta ação afetará {filteredAndGroupedStores[showStateRestartConfirm.region][showStateRestartConfirm.state].length} lojas.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStateRestartConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleStateRestart(showStateRestartConfirm.region, showStateRestartConfirm.state)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirmar Reinicialização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}