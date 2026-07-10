import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useSyncStore } from '../store/syncStore';

export default function LinkLocationScreen({ onBack }: { onBack?: () => void }) {
  const { addPendingSync, pendingSync } = useSyncStore();
  const [locationBarcode, setLocationBarcode] = useState('');
  const [productBarcode, setProductBarcode] = useState('');

  const handleSaveLink = () => {
    if (!locationBarcode || !productBarcode) return;
    
    // Adiciona ao estado local (Zustand) para sincronizar quando houver internet
    addPendingSync({
      type: 'LINK_LOCATION',
      locationBarcode,
      productBarcode,
      timestamp: new Date().toISOString()
    });
    
    setProductBarcode('');
    alert('Vínculo salvo offline!');
  };

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.title}>Vincular Local</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Código do Local (Prateleira/Gôndola)"
        value={locationBarcode}
        onChangeText={setLocationBarcode}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Código do Produto"
        value={productBarcode}
        onChangeText={setProductBarcode}
      />

      <View style={{ marginTop: 20, width: '100%' }}>
        <Button title="Vincular" onPress={handleSaveLink} color="#17a2b8" />
      </View>

      <Text style={styles.subtitle}>Itens na fila de sincronização: {pendingSync.length}</Text>
      <FlatList
        data={pendingSync}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({item}) => {
          if (item.type === 'LINK_LOCATION') {
            return <Text style={{ marginTop: 10 }}>Local: {item.locationBarcode} - Prod: {item.productBarcode}</Text>;
          }
          return null;
        }}
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
