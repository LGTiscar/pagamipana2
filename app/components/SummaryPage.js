import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppContext } from '../context/AppContext';

export default function SummaryPage() {
  const router = useRouter();
  
  // Get all necessary data from context
  const { 
    items, 
    people,
    paidBy,
    assignments,
    personItemQuantities,
    sharedItems
  } = useAppContext();

  // Get the person who paid
  const getPayer = () => {
    return people.find(person => person.id === paidBy) || null;
  };
  
  // Calculate the total bill amount
  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      total += (item.unitPrice || 0) * (item.quantity || 1);
    });
    return total.toFixed(2);
  };

  // Calculate who owes what
  const calculateSplitAmounts = () => {
    console.log('--------- DEBUGGING BILL SPLIT ---------');
    console.log('Items:', JSON.stringify(items.map(item => ({
      name: item.name,
      price: item.price,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      total: (item.unitPrice || 0) * (item.quantity || 1)
    }))));
    console.log('Assignments:', JSON.stringify(assignments));
    console.log('Person Item Quantities:', JSON.stringify(personItemQuantities));
    console.log('Shared Items:', JSON.stringify(sharedItems));
    console.log('People:', JSON.stringify(people.map(p => ({ id: p.id, name: p.name }))));
    
    // Step 1: Calculate total bill amount
    let totalBillAmount = 0;
    items.forEach(item => {
      totalBillAmount += (item.unitPrice || 0) * (item.quantity || 1);
    });
    console.log(`Total Bill Amount: $${totalBillAmount.toFixed(2)}`);
    
    // Step 2: Calculate what each person owes for their items
    const owes = {};
    people.forEach(person => {
      owes[person.id] = 0;
    });
    
    // Process each item
    items.forEach((item, index) => {
      const itemIndex = index.toString();
      const unitPrice = item.unitPrice || 0;
      const isShared = sharedItems[itemIndex] || false;
      const itemQuantity = item.quantity || 1;
      const totalItemPrice = unitPrice * itemQuantity;
      
      // Get people assigned to this item - check both assignments and quantities
      let peopleAssigned = assignments[itemIndex] || [];
      
      // Also check personItemQuantities to find anyone with quantity > 0
      if (personItemQuantities[itemIndex]) {
        Object.entries(personItemQuantities[itemIndex]).forEach(([personId, qty]) => {
          if (qty > 0 && !peopleAssigned.includes(personId)) {
            peopleAssigned.push(personId);
          }
        });
      }
      
      console.log(`Item ${index}: ${item.name} - Unit Price: $${unitPrice} x ${itemQuantity} units = $${totalItemPrice} - Assigned to ${peopleAssigned.length} people - Shared: ${isShared}`);
      
      // If no one is assigned to this item, split equally among all people
      if (peopleAssigned.length === 0) {
        console.log(`  No specific assignment for ${item.name} - splitting equally among all ${people.length} people`);
        
        const pricePerPerson = totalItemPrice / people.length;
        
        people.forEach(person => {
          owes[person.id] = (owes[person.id] || 0) + pricePerPerson;
          console.log(`  ${person.name} (${person.id}) now owes: $${owes[person.id].toFixed(2)} (equal split)`);
        });
        
        return; // Skip the rest of the processing for this item
      }
      
      // Different splitting logic based on shared status and quantity
      if (isShared && itemQuantity > 1 && personItemQuantities[itemIndex]) {
        // CASE: Shared item with quantity > 1
        // In this case, we handle each unit of the item separately
        
        // Loop through each unit of the item
        for (let unitIndex = 0; unitIndex < itemQuantity; unitIndex++) {
          // For each unit, find who participated in it
          const participantsForThisUnit = [];
          
          peopleAssigned.forEach(personId => {
            const personParticipationCount = personItemQuantities[itemIndex]?.[personId] || 0;
            // If person participated in at least this many units, include them for this unit
            if (personParticipationCount > unitIndex) {
              participantsForThisUnit.push(personId);
            }
          });
          
          // If no one participated in this unit, split it equally among all assigned people
          if (participantsForThisUnit.length === 0) {
            console.log(`  No specific assignments for unit ${unitIndex + 1} of ${item.name} - splitting among all assigned people`);
            
            const costPerPersonForThisUnit = unitPrice / peopleAssigned.length;
            
            peopleAssigned.forEach(personId => {
              owes[personId] = (owes[personId] || 0) + costPerPersonForThisUnit;
              const personName = people.find(p => p.id === personId)?.name;
              console.log(`    ${personName} (${personId}) now owes: $${owes[personId].toFixed(2)} (unit split)`);
            });
            
            continue;
          }
          
          // Split this unit's cost equally among its participants
          const costPerPersonForThisUnit = unitPrice / participantsForThisUnit.length;
          
          console.log(`  Unit ${unitIndex + 1}: $${unitPrice} split among ${participantsForThisUnit.length} people = $${costPerPersonForThisUnit.toFixed(2)} per person`);
          
          participantsForThisUnit.forEach(personId => {
            owes[personId] = (owes[personId] || 0) + costPerPersonForThisUnit;
            const personName = people.find(p => p.id === personId)?.name;
            console.log(`    ${personName} (${personId}) now owes: $${owes[personId].toFixed(2)}`);
          });
        }
      } else {
        // CASE: Regular item or quantity=1 or shared=false
        // Use equal split among assigned people
        const pricePerPerson = totalItemPrice / peopleAssigned.length;
        console.log(`  Regular item, price per person (equal split): $${pricePerPerson}`);
        
        peopleAssigned.forEach(personId => {
          owes[personId] = (owes[personId] || 0) + pricePerPerson;
          const personName = people.find(p => p.id === personId)?.name;
          console.log(`  ${personName} (${personId}) now owes: $${owes[personId].toFixed(2)}`);
        });
      }
    });
    
    // The person who paid should receive money, not pay
    if (paidBy) {
      owes[paidBy] = 0;
      console.log(`Payer ${paidBy} reset to $0.00`);
    }
    
    // Log final amounts
    console.log('Final amounts owed:', JSON.stringify(owes));
    console.log('--------- END DEBUGGING ---------');
    
    return owes;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

        {/* Bill Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>Bill Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Bill:</Text>
            <Text style={styles.summaryValue}>${calculateTotal()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid by:</Text>
            <View style={styles.payerInfo}>
              {paidBy ? (
                <>
                  <View style={[styles.miniAvatar, { backgroundColor: getPayer()?.color || '#BDBDBD' }]}>
                    <Text style={styles.miniAvatarText}>{getPayer()?.initial || '?'}</Text>
                  </View>
                  <Text style={styles.summaryValue}>{getPayer()?.name || 'Unknown'}</Text>
                </>
              ) : (
                <Text style={styles.summaryValue}>Not specified</Text>
              )}
            </View>
          </View>
        </View>

        {/* Who Owes What Section */}
        <Text style={styles.sectionTitle}>Who Owes What</Text>
        
        {people.length > 0 ? (
          people.map(person => {
            // Skip the person who paid
            if (person.id === paidBy) return null;
            
            const amount = calculateSplitAmounts()[person.id] || 0;
            
            // Only show if they owe money
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
                  <Text style={styles.oweLabel}>to {getPayer()?.name || 'payer'}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No people added yet. Go back to add people who participated in the bill.
            </Text>
          </View>
        )}

        {/* Instructions Box */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>All done!</Text>
          <Text style={styles.instructionsText}>
            Everyone can now settle up with the person who paid the bill.
            {'\n\n'}
            Items with no specific assignments were split equally among all participants.
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  container: {
    flex: 1,
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