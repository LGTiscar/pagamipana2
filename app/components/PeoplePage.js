import React, { useState } from 'react';
import { View, Text, Button, TextInput, FlatList, StyleSheet } from 'react-native';

export default function PeoplePage({ navigation }) {
  const [people, setPeople] = useState([]);
  const [personName, setPersonName] = useState('');

  const addPerson = () => {
    if (personName.trim()) {
      setPeople([...people, personName]);
      setPersonName('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2: Add People</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter name"
        value={personName}
        onChangeText={setPersonName}
      />
      <Button title="Add Person" onPress={addPerson} />
      <FlatList
        data={people}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => <Text style={styles.person}>{item}</Text>}
      />
      <Button title="Next" onPress={() => navigation.navigate('Items')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10 },
  person: { fontSize: 18, marginVertical: 5 },
});