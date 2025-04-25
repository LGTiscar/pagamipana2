import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ItemsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse data from params
  const receivedItems = params.items ? JSON.parse(params.items) : [];
  const people = params.people ? JSON.parse(params.people) : [];
  const paidBy = params.paidBy || null;
  
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState({});

  useEffect(() => {
    // Initialize items from received data or use defaults if empty
    if (receivedItems.length > 0) {
      setItems(receivedItems);
      
      // Initialize assignments - all items initially unassigned
      const initialAssignments = {};
      receivedItems.forEach((item, index) => {
        initialAssignments[index] = [];
      });
      setAssignments(initialAssignments);
    }
  }, [receivedItems]);

  const togglePersonForItem = (itemIndex, personId) => {
    setAssignments(prevAssignments => {
      const currentAssignment = prevAssignments[itemIndex] || [];
      
      // If person already assigned, remove them
      if (currentAssignment.includes(personId)) {
        return {
          ...prevAssignments,
          [itemIndex]: currentAssignment.filter(id => id !== personId)
        };
      } 
      // Otherwise add them
      else {
        return {
          ...prevAssignments,
          [itemIndex]: [...currentAssignment, personId]
        };
      }
    });
  };

  const getPersonById = (id) => {
    return people.find(person => person.id === id) || null;
  };

  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      total += (item.unitPrice || 0) * (item.quantity || 1);
    });
    return total.toFixed(2);
  };

  const getItemTotal = (item) => {
    return ((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2);
  };

  const isAllItemsAssigned = () => {
    // Check if every item has at least one person assigned
    return items.length > 0 && items.every((item, index) => 
      assignments[index] && assignments[index].length > 0
    );
  };

  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>${getItemTotal(item)}</Text>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemQuantity}>Qty: {item.quantity || 1}</Text>
          <Text style={styles.itemUnitPrice}>@ ${item.unitPrice?.toFixed(2) || '0.00'}</Text>
        </View>

        <Text style={styles.assignLabel}>Assign to:</Text>
        <View style={styles.personAssignments}>
          {people.map(person => (
            <TouchableOpacity 
              key={person.id}
              style={[
                styles.personChip,
                (assignments[index] && assignments[index].includes(person.id)) 
                  ? { backgroundColor: person.color } 
                  : styles.unassignedChip
              ]}
              onPress={() => togglePersonForItem(index, person.id)}
            >
              <View style={[
                styles.miniAvatar, 
                { backgroundColor: person.color },
                !(assignments[index] && assignments[index].includes(person.id)) && styles.unassignedAvatar
              ]}>
                <Text style={styles.miniAvatarText}>{person.initial}</Text>
              </View>
              <Text style={[
                styles.personChipText,
                (assignments[index] && assignments[index].includes(person.id)) && styles.assignedChipText
              ]}>
                {person.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '75%' }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/')}>
          <Text style={styles.tabText}>Upload Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/PeoplePage')}>
          <Text style={styles.tabText}>Add People</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Assign Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/SummaryPage')}>
          <Text style={styles.tabText}>Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Title and Subtitle */}
      <Text style={styles.title}>Step 3: Assign Items</Text>
      <Text style={styles.subtitle}>Select who ordered each item</Text>

      {/* Bill Total */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Bill Total:</Text>
        <Text style={styles.totalAmount}>${calculateTotal()}</Text>
      </View>

      {/* Bill Items */}
      {items.length > 0 ? (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.itemsList}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No items found. Please go back to upload a bill.
          </Text>
        </View>
      )}

      {/* Instructions Box */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>Next step:</Text>
        <Text style={styles.instructionsText}>
          After assigning all items, you'll see the summary of what each person owes.
        </Text>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.nextButton, !isAllItemsAssigned() && styles.disabledButton]} 
          disabled={!isAllItemsAssigned()}
          onPress={() => {
            if (isAllItemsAssigned()) {
              router.push({
                pathname: '/components/SummaryPage',
                params: {
                  items: JSON.stringify(items),
                  people: params.people,
                  paidBy: paidBy,
                  assignments: JSON.stringify(assignments)
                }
              });
            }
          }}
        >
          <Text style={styles.nextButtonText}>Next →</Text>
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
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  itemsList: {
    width: '100%',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  itemDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#757575',
    marginRight: 10,
  },
  itemUnitPrice: {
    fontSize: 14,
    color: '#757575',
  },
  assignLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
  },
  personAssignments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8BC34A',
    borderRadius: 15,
    paddingRight: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  unassignedChip: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#8BC34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  unassignedAvatar: {
    opacity: 0.5,
  },
  miniAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  personChipText: {
    fontSize: 14,
  },
  assignedChipText: {
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
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
});