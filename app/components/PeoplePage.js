import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PeoplePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [people, setPeople] = useState([]);
  const [personName, setPersonName] = useState('');
  const [paidBy, setPaidBy] = useState(null);
  
  // Parse items from route params
  const items = params.items ? JSON.parse(params.items) : [];

  const addPerson = () => {
    if (personName.trim()) {
      // Generate a random color
      const colors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', 
                     '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      const newPerson = {
        id: Date.now().toString(),
        name: personName.trim(),
        initial: personName.trim()[0].toUpperCase(),
        color: randomColor,
        paidBill: false
      };
      
      // Update people and set first added person as the bill payer
      const newPeople = [...people, newPerson];
      setPeople(newPeople);
      
      // If this is the first person added, set them as the default payer
      if (people.length === 0) {
        setPaidBy(newPerson.id);
      }
      
      setPersonName('');
    }
  };

  const removePerson = (id) => {
    const filteredPeople = people.filter(person => person.id !== id);
    setPeople(filteredPeople);
    
    // If we removed the person who paid, select another person if available
    if (paidBy === id) {
      if (filteredPeople.length > 0) {
        setPaidBy(filteredPeople[0].id);
      } else {
        setPaidBy(null);
      }
    }
  };

  const handlePaidBySelection = (id) => {
    setPaidBy(id);
    
    // Update the paidBill status for all people
    setPeople(people.map(person => ({
      ...person,
      paidBill: person.id === id
    })));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: '50%' }]} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/')}>
            <Text style={styles.tabText}>Upload Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>Add People</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/ItemsPage')}>
            <Text style={styles.tabText}>Assign Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/SummaryPage')}>
            <Text style={styles.tabText}>Summary</Text>
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>Step 2: Add People to Split With</Text>
        <Text style={styles.subtitle}>Add everyone who's splitting the bill</Text>

        {/* Add Person Input (moved to the top since there are no initial people) */}
        <View style={styles.addPersonContainer}>
          <TextInput
            style={styles.input}
            placeholder="Add person's name"
            value={personName}
            onChangeText={setPersonName}
            onSubmitEditing={addPerson}
          />
          <TouchableOpacity style={styles.addButton} onPress={addPerson}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* People List */}
        {people.length > 0 ? (
          people.map((person) => (
            <View key={person.id} style={styles.personCard}>
              <View style={styles.personInfo}>
                <View style={[styles.avatar, { backgroundColor: person.color }]}>
                  <Text style={styles.avatarText}>{person.initial}</Text>
                </View>
                <Text style={styles.personName}>{person.name}</Text>
                {person.paidBill && (
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Paid the bill</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => removePerson(person.id)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Add people who are splitting the bill
            </Text>
          </View>
        )}

        {/* Who Paid the Bill Section - only shown if there are people */}
        {people.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Who Paid the Bill?</Text>
            <View style={styles.payerContainer}>
              {people.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={styles.payerOption}
                  onPress={() => handlePaidBySelection(person.id)}
                >
                  <View style={[styles.radioButton, paidBy === person.id && styles.radioButtonSelected]}>
                    <View style={styles.innerCircle}>
                      {paidBy === person.id && <View style={styles.selectedDot} />}
                    </View>
                  </View>
                  <View style={[styles.smallAvatar, { backgroundColor: person.color }]}>
                    <Text style={styles.smallAvatarText}>{person.initial}</Text>
                  </View>
                  <Text style={styles.payerName}>{person.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Next Step Instructions */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>Next step:</Text>
          <Text style={styles.instructionsText}>
            After adding everyone, you'll assign bill items to each person in the next step.
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.nextButton, people.length === 0 && styles.disabledButton]}
            disabled={people.length === 0}
            onPress={() => {
              if (people.length > 0) {
                // Use router.push instead of navigation.navigate
                router.push({
                  pathname: '/components/ItemsPage',
                  params: {
                    items: params.items,
                    people: JSON.stringify(people),
                    paidBy
                  }
                });
              }
            }}
          >
            <Text style={styles.nextButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F5E9', // Match the container background
  },
  container: {
    flex: 1,
    // backgroundColor is now handled by SafeAreaView
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40, // Keep bottom padding for scroll content
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#C8E6C9',
    borderRadius: 5,
    marginBottom: 15,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#C8E6C9',
    borderRadius: 8,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  tabText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 20,
    textAlign: 'center',
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  personName: {
    fontSize: 16,
    color: '#333',
  },
  paidBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  paidBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  removeButton: {
    fontSize: 18,
    color: '#B0BEC5',
    padding: 5,
  },
  addPersonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#424242',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    height: 46,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2E7D32',
  },
  payerContainer: {
    marginBottom: 20,
  },
  payerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioButton: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioButtonSelected: {
    backgroundColor: '#FFFFFF',
  },
  innerCircle: {
    height: 14,
    width: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  smallAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  payerName: {
    fontSize: 16,
    color: '#424242',
  },
  instructionsBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1976D2',
  },
  instructionsText: {
    color: '#455A64',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 30,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#78909C',
    backgroundColor: 'white',
  },
  backButtonText: {
    color: '#455A64',
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  emptyState: {
    padding: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyStateText: {
    color: '#757575',
    fontSize: 16,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
});