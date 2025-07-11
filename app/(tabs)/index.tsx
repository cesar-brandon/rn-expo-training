import { useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from '@/shared/hooks/api/useTodos';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const { data: todosResponse, isLoading, error } = useTodos({ user_id: '1' });
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const todos = todosResponse?.data || [];

  const handleCreateTodo = async () => {
    if (!newTodoTitle.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título para la tarea');
      return;
    }

    try {
      await createTodo.mutateAsync({
        user_id: '1',
        title: newTodoTitle.trim(),
        completed: false,
        priority: 'medium',
      });
      setNewTodoTitle('');
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la tarea');
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await updateTodo.mutateAsync({
        id,
        updates: { completed: !completed }
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo.mutateAsync(id);
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar la tarea');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📝 Mis Tareas</Text>
        <Text style={styles.subtitle}>
          Gestiona tus tareas con arquitectura local-first
        </Text>
      </View>

      {/* Formulario para crear nueva tarea */}
      <View style={styles.createForm}>
        <TextInput
          style={styles.input}
          placeholder="Nueva tarea..."
          value={newTodoTitle}
          onChangeText={setNewTodoTitle}
          onSubmitEditing={handleCreateTodo}
        />
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={handleCreateTodo}
          disabled={createTodo.isPending}
        >
          <Text style={styles.addButtonText}>
            {createTodo.isPending ? '⏳' : '➕'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de tareas */}
      <View style={styles.todosList}>
        {isLoading ? (
          <Text style={styles.loadingText}>Cargando tareas...</Text>
        ) : error ? (
          <Text style={styles.errorText}>Error cargando tareas</Text>
        ) : todos.length === 0 ? (
          <Text style={styles.emptyText}>
            No hay tareas. ¡Crea tu primera tarea!
          </Text>
        ) : (
          todos.map((todo: any) => (
            <View key={todo.id} style={styles.todoItem}>
              <TouchableOpacity
                style={styles.todoContent}
                onPress={() => handleToggleTodo(todo.id, todo.completed)}
              >
                <Text style={styles.todoCheckbox}>
                  {todo.completed ? '✅' : '⭕'}
                </Text>
                <Text style={[
                  styles.todoTitle,
                  todo.completed && styles.todoCompleted
                ]}>
                  {todo.title}
                </Text>
                <Text style={styles.todoPriority}>
                  {todo.priority === 'high' ? '🔴' : 
                   todo.priority === 'medium' ? '🟡' : '🟢'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTodo(todo.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Estadísticas */}
      <View style={styles.stats}>
        <Text style={styles.statsTitle}>📊 Estadísticas</Text>
        <Text style={styles.statsText}>
          Total: {todos.length} | 
          Completadas: {todos.filter((t: any) => t.completed).length} | 
          Pendientes: {todos.filter((t: any) => !t.completed).length}
        </Text>
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
    backgroundColor: '#007AFF',
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
    color: '#E3F2FD',
  },
  createForm: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonText: {
    fontSize: 20,
    color: 'white',
  },
  todosList: {
    paddingHorizontal: 16,
  },
  todoItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  todoCheckbox: {
    fontSize: 24,
    marginRight: 12,
  },
  todoTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  todoCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  todoPriority: {
    fontSize: 18,
    marginLeft: 8,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#ff4444',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    padding: 20,
    fontStyle: 'italic',
  },
  stats: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
});
