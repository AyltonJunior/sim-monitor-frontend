'use client'

import { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue } from 'firebase/database'

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

interface Device {
  name: string
  online: boolean
}

interface Store {
  store_id: string
  devices: {
    dosadoras: Device[]
    lavadoras: Device[]
    secadoras: Device[]
    outros: Device[]
  }
}

interface OfflineDevices {
  dosadoras: string[]  // store_ids
  lavadoras: string[]
  secadoras: string[]
  reset: string[]
  arcondicionado: string[]
}

export default function DevicesPage() {
  const [offlineDevices, setOfflineDevices] = useState<OfflineDevices>({
    dosadoras: [],
    lavadoras: [],
    secadoras: [],
    reset: [],
    arcondicionado: []
  })
  const [expandedCards, setExpandedCards] = useState<{[key: string]: boolean}>({})
  const [deviceDetails, setDeviceDetails] = useState<{[key: string]: any}>({})

  useEffect(() => {
    const storesRef = ref(database, 'lojas')
    
    const unsubscribe = onValue(storesRef, (snapshot) => {
      const data = snapshot.val()
      if (!data) return

      const newOfflineDevices: OfflineDevices = {
        dosadoras: [],
        lavadoras: [],
        secadoras: [],
        reset: [],
        arcondicionado: []
      }

      const newDeviceDetails: {[key: string]: any} = {}

      // Processa cada loja
      Object.entries(data).forEach(([_, storeData]: [string, any]) => {
        const store = storeData as Store
        
        // Verifica dispositivos offline em cada categoria e guarda os detalhes
        const offlineDetails: any = {
          dosadoras: [],
          lavadoras: [],
          secadoras: [],
          reset: [],
          arcondicionado: []
        }

        store.devices?.dosadoras?.forEach(device => {
          if (!device.online) {
            if (!newOfflineDevices.dosadoras.includes(store.store_id)) {
              newOfflineDevices.dosadoras.push(store.store_id)
            }
            offlineDetails.dosadoras.push(device.name)
          }
        })

        store.devices?.lavadoras?.forEach(device => {
          if (!device.online) {
            if (!newOfflineDevices.lavadoras.includes(store.store_id)) {
              newOfflineDevices.lavadoras.push(store.store_id)
            }
            offlineDetails.lavadoras.push(device.name)
          }
        })

        store.devices?.secadoras?.forEach(device => {
          if (!device.online) {
            if (!newOfflineDevices.secadoras.includes(store.store_id)) {
              newOfflineDevices.secadoras.push(store.store_id)
            }
            offlineDetails.secadoras.push(device.name)
          }
        })

        store.devices?.outros?.forEach(device => {
          if (!device.online) {
            if (device.name.toUpperCase() === 'RST') {
              if (!newOfflineDevices.reset.includes(store.store_id)) {
                newOfflineDevices.reset.push(store.store_id)
              }
              offlineDetails.reset.push(device.name)
            } else if (device.name.toUpperCase() === 'AR') {
              if (!newOfflineDevices.arcondicionado.includes(store.store_id)) {
                newOfflineDevices.arcondicionado.push(store.store_id)
              }
              offlineDetails.arcondicionado.push(device.name)
            }
          }
        })

        if (Object.values(offlineDetails).some((arr): arr is any[] => Array.isArray(arr) && arr.length > 0)) {
          newDeviceDetails[store.store_id] = offlineDetails
        }
      })

      setOfflineDevices(newOfflineDevices)
      setDeviceDetails(newDeviceDetails)
    })

    return () => unsubscribe()
  }, [])

  const toggleCard = (storeId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [storeId]: !prev[storeId]
    }))
  }

  const deviceTypes = [
    { key: 'dosadoras', label: 'Dosadoras', color: 'bg-red-500' },
    { key: 'lavadoras', label: 'Lavadoras', color: 'bg-blue-500' },
    { key: 'secadoras', label: 'Secadoras', color: 'bg-yellow-500' },
    { key: 'reset', label: 'Reset', color: 'bg-orange-500' },
    { key: 'arcondicionado', label: 'Ar Condicionado', color: 'bg-emerald-500' }
  ]

  const getDeviceName = (deviceName: string, category: string) => {
    switch (category) {
      case 'reset':
        return 'RESET'
      case 'arcondicionado':
        return 'AR Condicionado'
      default:
        return deviceName
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Título */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Monitor de Dispositivos</h1>
            <p className="mt-2 text-blue-100">Visualização de dispositivos offline por categoria</p>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2 shadow-lg"
          >
            <span>🏠</span>
            <span>Voltar ao Início</span>
          </a>
        </div>
      </div>

      {/* Grid de Colunas em linha única */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {deviceTypes.map(({ key, label, color }) => (
          <div key={key} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Cabeçalho da Coluna */}
            <div className={`${color} p-4`}>
              <h2 className="text-lg font-semibold text-white flex items-center justify-between">
                {label}
                <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded">
                  {offlineDevices[key as keyof OfflineDevices].length}
                </span>
              </h2>
            </div>

            {/* Lista de Dispositivos Offline */}
            <div className="p-4">
              {offlineDevices[key as keyof OfflineDevices].length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Todos os dispositivos online
                </p>
              ) : (
                <div className="space-y-2">
                  {offlineDevices[key as keyof OfflineDevices].map((storeId) => (
                    <div
                      key={storeId}
                      className="bg-gray-50 rounded p-3 border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => toggleCard(storeId)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{storeId}</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {deviceDetails[storeId]?.[key]?.map((deviceName: string, index: number) => (
                              <span
                                key={`${deviceName}-${index}`}
                                className="w-2 h-2 rounded-full bg-red-500"
                                title={getDeviceName(deviceName, key)}
                              ></span>
                            ))}
                          </div>
                          <span className={`transform transition-transform duration-200 text-gray-400 ${
                            expandedCards[storeId] ? 'rotate-180' : ''
                          }`}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Detalhes Expandidos */}
                      <div className={`mt-2 transition-all duration-200 ${
                        expandedCards[storeId] 
                          ? 'max-h-40 opacity-100' 
                          : 'max-h-0 opacity-0 overflow-hidden'
                      }`}>
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <div className="space-y-1">
                            {deviceDetails[storeId]?.[key]?.map((deviceName: string, index: number) => (
                              <div key={`${deviceName}-${index}-detail`} className="flex items-center space-x-2 text-sm">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                <span className="text-gray-700">{getDeviceName(deviceName, key)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 