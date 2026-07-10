import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, TextInput, TouchableOpacity } from 'react-native';

export default function ScannerScreen({ onBack }: { onBack?: () => void }) {
  const [barcode, setBarcode] = useState('');

  const handleScanMock = () => {
    // Aqui no futuro entra o expo-camera / react-native-vision-camera
    setBarcode('7891010101010');
    alert('Código Bipado: 7891010101010');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Leitor de Código de Barras</Text>
      
      <View style={styles.cameraBox}>
        <Text style={{ color: '#fff' }}>[ Câmera / Leitor Físico ]</Text>
      </View>

      <Button title="Simular Leitura" onPress={handleScanMock} />

      <TextInput
        style={styles.input}
        placeholder="Ou digite o código"
        value={barcode}
        onChangeText={setBarcode}
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
  cameraBox: {
    width: 300,
    height: 300,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 10,
  },
  input: {
    marginTop: 20,
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
