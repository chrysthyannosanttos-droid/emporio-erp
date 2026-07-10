import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import ScannerScreen from './src/screens/ScannerScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import PriceCheckScreen from './src/screens/PriceCheckScreen';
import LinkLocationScreen from './src/screens/LinkLocationScreen';
import { useSyncStore } from './src/store/syncStore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Home');
  const { isOffline, pendingSync } = useSyncStore();

  if (currentScreen === 'Scanner') return <ScannerScreen onBack={() => setCurrentScreen('Home')} />;
  if (currentScreen === 'Inventory') return <InventoryScreen onBack={() => setCurrentScreen('Home')} />;
  if (currentScreen === 'PriceCheck') return <PriceCheckScreen onBack={() => setCurrentScreen('Home')} />;
  if (currentScreen === 'LinkLocation') return <LinkLocationScreen onBack={() => setCurrentScreen('Home')} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emporio Coletor</Text>
      <Text style={styles.subtitle}>Status: {isOffline ? '🔴 Offline' : '🟢 Online'}</Text>
      <Text style={styles.subtitle}>Sync Fila: {pendingSync.length}</Text>
      
      <View style={{ marginTop: 40, width: '80%' }}>
        <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('Scanner')}>
          <Text style={styles.buttonText}>Ler Código (Scanner)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => setCurrentScreen('Inventory')}>
          <Text style={styles.buttonText}>Inventário / Contagem</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#17a2b8' }]} onPress={() => setCurrentScreen('LinkLocation')}>
          <Text style={styles.buttonText}>Vincular Local</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: '#4f46e5' }]} onPress={() => setCurrentScreen('PriceCheck')}>
          <Text style={styles.buttonText}>Consulta de Preço (Totem)</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666' },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
