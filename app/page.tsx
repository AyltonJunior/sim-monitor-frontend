'use client'

import { StatusBadge } from '../components/ui/status-badge'
import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, remove } from 'firebase/database'

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

export default function Home() {
  const [stores, setStores] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showRestartConfirm, setShowRestartConfirm] = useState<string | null>(null)

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

  // Função para verificar e atualizar status localmente
  const checkAndUpdateStatus = () => {
    const now = new Date()
    
    setStores(currentStores => 
      currentStores.map(store => {
        const lastUpdate = new Date(store.timestamp)
        const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60)
        
        if (diffMinutes > 1 && store.app_status !== 'down') {
          console.log(` Servidor ${store.store_id} está offline! Última atualização: ${lastUpdate.toLocaleString()}`)
          console.log(` Tempo sem atualização: ${Math.floor(diffMinutes)} minutos`)
          
          // Tenta atualizar no Firebase, mas não espera pela resposta
          set(ref(database, `lojas/${store.id}`), {
            ...store,
            app_status: 'down',
            timestamp: now.toISOString()
          }).catch(() => {
            console.log(' Não foi possível atualizar o Firebase, mas o status foi alterado localmente')
          })
          
          // Retorna store com status atualizado localmente
          return {
            ...store,
            app_status: 'down',
            timestamp: now.toISOString()
          }
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
  const getStatusDisplay = (store: any) => {
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
  const getTVStatus = (store: any) => {
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

  // Filtrar lojas baseado na pesquisa e status
  const filteredStores = stores.filter(store => {
    const matchesSearch = store.store_id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || store.app_status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calcular o resumo dos status apenas para as lojas filtradas
  const statusSummary = filteredStores.reduce((acc, store) => {
    acc[store.app_status] = (acc[store.app_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Função para obter a mensagem de status detalhada
  const getDetailedStatus = (store: any) => {
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Título e Status Overview */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Monitor SIM</h1>
        <p className="mt-1 text-sm text-gray-500">Sistema Integrado de Monitoramento</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { status: 'running', label: 'Rodando', count: statusSummary.running || 0 },
          { status: 'down', label: 'Desligado', count: statusSummary.down || 0 },
          { status: 'error', label: 'Com Erro', count: statusSummary.error || 0 },
          { status: 'restarting', label: 'Reiniciando', count: statusSummary.restarting || 0 }
        ].map(({ status, label, count }) => (
          <div key={status} className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{count}</div>
          </div>
        ))}
      </div>

      {/* Barra de Pesquisa e Filtro de Status */}
      <div className="mb-6 flex gap-4">
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

      {/* Grid de Servidores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Nenhum servidor encontrado
          </div>
        ) : (
          filteredStores.map((store) => (
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
          ))
        )}
      </div>

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
    </div>
  )
}