import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import api from '../services/api'; // Onde sua chamada de API vive

export default function PriceCheckScreen({ onBack }: { onBack: () => void }) {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkPrice = async () => {
    if (!barcode) return;
    setLoading(true);
    try {
      // Usando seu endpoint genérico de produtos filtrando por barcode
      const res = await api.get(`/products?search=${barcode}`);
      const found = res.data.products?.find((p: any) => p.barcode === barcode);
      
      if (found) {
        setProduct(found);
      } else {
        setProduct(null);
        Alert.alert("Aviso", "Produto não encontrado no sistema.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível consultar o preço.");
    } finally {
      setLoading(false);
      setBarcode('');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Voltar</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Consulta de Preço (Totem)</Text>
      <Text style={styles.subtitle}>Passe o código de barras no leitor ou digite abaixo:</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Código de barras..."
          placeholderTextColor="#94a3b8"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          autoFocus
          onSubmitEditing={checkPrice}
        />
        <TouchableOpacity style={styles.scanButton} onPress={checkPrice} disabled={loading}>
          <Text style={styles.scanButtonText}>{loading ? '...' : 'Consultar'}</Text>
        </TouchableOpacity>
      </View>

      {product && (
        <View style={styles.resultCard}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productCode}>Código: {product.barcode}</Text>
          <Text style={styles.priceLabel}>Preço de Venda</Text>
          <Text style={styles.productPrice}>R$ {Number(product.price).toFixed(2).replace('.', ',')}</Text>
          <Text style={styles.unitText}>{product.unit}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
    justifyContent: 'center'
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: '#1e293b',
    borderRadius: 8
  },
  backButtonText: {
    color: '#94a3b8',
    fontWeight: 'bold'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 18,
  },
  scanButton: {
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  productCode: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginBottom: 30,
  },
  priceLabel: {
    fontSize: 14,
    color: '#4f46e5',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  productPrice: {
    fontSize: 48,
    fontWeight: '900',
    color: '#10b981',
    marginVertical: 5,
  },
  unitText: {
    fontSize: 16,
    color: '#94a3b8',
  }
});
