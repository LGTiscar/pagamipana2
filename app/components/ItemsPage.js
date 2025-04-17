import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';

export default function ItemsPage({ navigation }) {
  const [items, setItems] = useState([
    { name: 'Item 1', quantity: 1, unitPrice: 10 },
    { name: 'Item 2', quantity: 2, unitPrice: 20 },
  ]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Assign Items</Text>
      <FlatList
        data={items}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text>Quantity: {item.quantity}</Text>
            <Text>Unit Price: ${item.unitPrice}</Text>
          </View>
        )}
      />
      <Button title="Finish" onPress={() => navigation.navigate('UploadBill')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  itemContainer: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  itemName: { fontSize: 18, fontWeight: 'bold' },
});