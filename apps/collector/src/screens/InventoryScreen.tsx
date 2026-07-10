import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useSyncStore } from '../store/syncStore';

export default function InventoryScreen({ onBack }: { onBack?: () => void }) {
  const { addPendingSync, pendingSync } = useSyncStore();
  const [barcode, setBarcode] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleSaveCount = () => {
    if (!barcode || !quantity) return;
    
    // Adiciona ao estado local (Zustand) para sincronizar quando houver internet
    addPendingSync({
      type: 'INVENTORY_COUNT',
      barcode,
      quantity: Number(quantity),
      timestamp: new Date().toISOString()
    });
    
    setBarcode('');
    setQuantity('');
    alert('Contagem salva offline!');
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.title}>Inventário Físico</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Código do Produto"
        value={barcode}
        onChangeText={setBarcode}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Quantidade Contada"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />

      <View style={{ marginTop: 20, width: '100%' }}>
        <Button title="Salvar Contagem" onPress={handleSaveCount} color="#28a745" />
      </View>

      <Text style={styles.subtitle}>Itens na fila de sincronização: {pendingSync.length}</Text>
      <FlatList
        data={pendingSync}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({item}) => (
          <Text style={{ marginTop: 10 }}>{item.barcode} - Qtd: {item.quantity}</Text>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 30,
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    marginTop: 10,
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: '#ddd',
    borderRadius: 8,
  },
  backButtonText: {
    fontWeight: 'bold',
  }
});
