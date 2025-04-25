import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function SummaryPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse data from params
  const items = params.items ? JSON.parse(params.items) : [];
  const people = params.people ? JSON.parse(params.people) : [];
  const paidBy = params.paidBy || null;
  const assignments = params.assignments ? JSON.parse(params.assignments) : {};

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      total += (item.unitPrice || 0) * (item.quantity || 1);
    });
    return total.toFixed(2);
  };

  const getPersonById = (id) => {
    return people.find(person => person.id === id) || null;
  };

  const getPayer = () => {
    return getPersonById(paidBy);
  };

  const calculateOwes = () => {
    const owes = {};
    const payer = getPayer();
    
    // Initialize all people with 0
    people.forEach(person => {
      owes[person.id] = 0;
    });

    // Calculate what each person owes based on assignments
    Object.keys(assignments).forEach(itemIndex => {
      const item = items[itemIndex];
      if (!item) return;
      
      const totalPrice = (item.unitPrice || 0) * (item.quantity || 1);
      const assignedPeople = assignments[itemIndex] || [];
      
      if (assignedPeople.length > 0) {
        const pricePerPerson = totalPrice / assignedPeople.length;
        assignedPeople.forEach(personId => {
          owes[personId] = (owes[personId] || 0) + pricePerPerson;
        });
      }
    });

    // The person who paid should receive money, not pay
    if (payer) {
      owes[payer.id] = 0;
    }

    return owes;
  };

  const renderSummary = () => {
    if (people.length === 0 || items.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No data to display. Please go back and complete the previous steps.
          </Text>
        </View>
      );
    }

    const payer = getPayer();
    const owesData = calculateOwes();

    return (
      <View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Bill Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Bill:</Text>
            <Text style={styles.summaryValue}>${calculateTotal()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid by:</Text>
            <View style={styles.payerInfo}>
              <View style={[styles.miniAvatar, payer && { backgroundColor: payer.color }]}>
                <Text style={styles.miniAvatarText}>{payer ? payer.initial : "?"}</Text>
              </View>
              <Text style={styles.summaryValue}>{payer ? payer.name : "Unknown"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Who Owes What</Text>

        {people.map(person => {
          if (person.id === paidBy) return null; // Skip the payer
          
          const amount = owesData[person.id] || 0;
          if (amount <= 0) return null;
          
          return (
            <View key={person.id} style={styles.oweCard}>
              <View style={styles.personInfo}>
                <View style={[styles.avatar, { backgroundColor: person.color }]}>
                  <Text style={styles.avatarText}>{person.initial}</Text>
                </View>
                <Text style={styles.personName}>{person.name}</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.oweAmount}>${amount.toFixed(2)}</Text>
                <Text style={styles.oweLabel}>to {payer ? payer.name : "payer"}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '100%' }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/')}>
          <Text style={styles.tabText}>Upload Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/PeoplePage')}>
          <Text style={styles.tabText}>Add People</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/ItemsPage')}>
          <Text style={styles.tabText}>Assign Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Title and Subtitle */}
      <Text style={styles.title}>Step 4: Summary</Text>
      <Text style={styles.subtitle}>See who owes what to whom</Text>

      {renderSummary()}

      {/* Instructions Box */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>All done!</Text>
        <Text style={styles.instructionsText}>
          Everyone can now settle up with the person who paid the bill.
        </Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/')}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#424242',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  payerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  miniAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 5,
    color: '#2E7D32',
  },
  oweCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
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
    color: '#424242',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  oweAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  oweLabel: {
    fontSize: 12,
    color: '#757575',
  },
  instructionsBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginVertical: 20,
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
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  doneButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});