import { useTodoStats } from '@/shared/hooks/api/useTodos';
import { networkService } from '@/shared/services/network';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ExploreScreen() {
  const { data: statsResponse } = useTodoStats('1');
  const [networkState, setNetworkState] = useState({
    isConnected: false,
    isInternetReachable: null as boolean | null,
    type: null as string | null,
  });

  const stats = statsResponse?.data;

  useEffect(() => {
    // Obtener estado inicial de red
    const updateNetworkState = () => {
      setNetworkState({
        isConnected: networkService.isConnected(),
        isInternetReachable: networkService.hasInternetAccess(),
        type: 'unknown', // networkService podría tener más detalles
      });
    };

    updateNetworkState();

    // Suscribirse a cambios de red
    const unsubscribe = networkService.subscribe(updateNetworkState);
    
    return unsubscribe;
  }, []);

  const handleTestAPI = async () => {
    try {
      const response = await fetch('/api/todos?limit=1');
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('✅ API Test', 'API funcionando correctamente');
      } else {
        Alert.alert('❌ API Test', 'API retornó error: ' + data.error);
      }
    } catch (error) {
      Alert.alert('❌ API Test', 'Error conectando con API: ' + (error as Error).message);
    }
  };

  const handleTestLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'password123'
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('✅ Login Test', `Login exitoso para: ${data.data.user.name}`);
      } else {
        Alert.alert('❌ Login Test', 'Login falló: ' + data.error);
      }
    } catch (error) {
      Alert.alert('❌ Login Test', 'Error en login: ' + (error as Error).message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Explorar</Text>
        <Text style={styles.subtitle}>
          Estado del sistema y herramientas de desarrollo
        </Text>
      </View>

      {/* Estado de la red */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 Estado de Red</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Conectado:</Text>
            <Text style={[styles.statusValue, { color: networkState.isConnected ? '#4CAF50' : '#F44336' }]}>
              {networkState.isConnected ? '✅ Sí' : '❌ No'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Internet:</Text>
            <Text style={[styles.statusValue, { color: networkState.isInternetReachable ? '#4CAF50' : '#F44336' }]}>
              {networkState.isInternetReachable ? '✅ Disponible' : '❌ No disponible'}
            </Text>
          </View>
        </View>
      </View>

      {/* Estadísticas */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estadísticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.total_todos}</Text>
              <Text style={styles.statLabel}>Total Tareas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.completed_todos}</Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pending_todos}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#F44336' }]}>{stats.overdue_todos}</Text>
              <Text style={styles.statLabel}>Vencidas</Text>
            </View>
          </View>
          
          <View style={styles.prioritySection}>
            <Text style={styles.sectionTitle}>🎯 Por Prioridad</Text>
            <View style={styles.priorityRow}>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityIcon}>🔴</Text>
                <Text style={styles.priorityText}>Alta: {stats.todos_by_priority.high}</Text>
              </View>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityIcon}>🟡</Text>
                <Text style={styles.priorityText}>Media: {stats.todos_by_priority.medium}</Text>
              </View>
              <View style={styles.priorityItem}>
                <Text style={styles.priorityIcon}>🟢</Text>
                <Text style={styles.priorityText}>Baja: {stats.todos_by_priority.low}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Herramientas de desarrollo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Herramientas</Text>
        <TouchableOpacity style={styles.toolButton} onPress={handleTestAPI}>
          <Text style={styles.toolButtonText}>🔧 Probar API de Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={handleTestLogin}>
          <Text style={styles.toolButtonText}>🔐 Probar Login</Text>
        </TouchableOpacity>
      </View>

      {/* Información de la arquitectura */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏗️ Arquitectura</Text>
        <View style={styles.archCard}>
          <Text style={styles.archTitle}>✅ Local-First</Text>
          <Text style={styles.archDescription}>
            Datos almacenados localmente con SQLite + MMKV
          </Text>
          
          <Text style={styles.archTitle}>⚡ React Query</Text>
          <Text style={styles.archDescription}>
            Cache inteligente que funciona online/offline
          </Text>
          
          <Text style={styles.archTitle}>🌐 Expo API Routes</Text>
          <Text style={styles.archDescription}>
            Backend integrado con endpoints automáticos
          </Text>
          
          <Text style={styles.archTitle}>🔄 Sincronización</Text>
          <Text style={styles.archDescription}>
            Sync automático cuando hay conexión
          </Text>
        </View>
      </View>

      {/* Credenciales de prueba */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Credenciales de Prueba</Text>
        <View style={styles.credentialsCard}>
          <Text style={styles.credentialLabel}>Email:</Text>
          <Text style={styles.credentialValue}>admin@example.com</Text>
          <Text style={styles.credentialLabel}>Contraseña:</Text>
          <Text style={styles.credentialValue}>password123</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#673AB7',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E1BEE7',
  },
  section: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  statusCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  prioritySection: {
    marginTop: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priorityItem: {
    alignItems: 'center',
  },
  priorityIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
  },
  toolButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  toolButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  archCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  archTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  archDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  credentialsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  credentialLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  credentialValue: {
    fontSize: 14,
    color: '#007AFF',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
