import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ItemsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [paidBy, setPaidBy] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [sharedItems, setSharedItems] = useState({});
  const [personItemQuantities, setPersonItemQuantities] = useState({});

  // Parse params safely using useEffect to prevent render loops
  useEffect(() => {
    try {
      // Only parse and update if we have data and it's different
      if (params.items) {
        const parsedItems = JSON.parse(params.items);
        setItems(parsedItems);
      }
      
      if (params.people) {
        const parsedPeople = JSON.parse(params.people);
        setPeople(parsedPeople);
      }
      
      if (params.paidBy) {
        setPaidBy(params.paidBy);
      }
    } catch (error) {
      console.error('Error parsing params:', error);
    }
  }, [params.items, params.people, params.paidBy]);
  
  // Initialize assignments separately after items are loaded
  useEffect(() => {
    if (items.length > 0) {
      // Only initialize assignments if they don't exist yet
      const initialAssignments = {};
      const initialSharedItems = {};
      
      items.forEach((item, index) => {
        if (!assignments[index]) {
          initialAssignments[index] = [];
        }
        if (sharedItems[index] === undefined) {
          initialSharedItems[index] = false; // Default shared status is OFF
        }
      });
      
      // Only update if there are new assignments to add
      if (Object.keys(initialAssignments).length > 0) {
        setAssignments(prev => ({...prev, ...initialAssignments}));
      }
      
      // Only update if there are new shared statuses to add
      if (Object.keys(initialSharedItems).length > 0) {
        setSharedItems(prev => ({...prev, ...initialSharedItems}));
      }
    }
  }, [items]);

  // Initialize person-item quantities when items or people change
  useEffect(() => {
    if (items.length > 0 && people.length > 0) {
      const initialQuantities = {};
      
      // For each item
      items.forEach((item, itemIndex) => {
        initialQuantities[itemIndex] = {};
        
        // For each person, initialize quantity to 0
        people.forEach(person => {
          initialQuantities[itemIndex][person.id] = 0;
        });
      });
      
      // Only set if we don't already have values
      setPersonItemQuantities(prev => {
        const newQuantities = { ...prev };
        
        // Merge only missing values
        Object.keys(initialQuantities).forEach(itemIndex => {
          if (!newQuantities[itemIndex]) {
            newQuantities[itemIndex] = {};
          }
          
          Object.keys(initialQuantities[itemIndex]).forEach(personId => {
            if (newQuantities[itemIndex][personId] === undefined) {
              newQuantities[itemIndex][personId] = initialQuantities[itemIndex][personId];
            }
          });
        });
        
        return newQuantities;
      });
    }
  }, [items, people]);

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

  // Simple toggle function without any special behavior for now
  const toggleSharedItem = (itemIndex) => {
    setSharedItems(prev => ({
      ...prev,
      [itemIndex]: !prev[itemIndex]
    }));
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

  // Function to increase the quantity for a person-item pair
  const increaseQuantity = (itemIndex, personId) => {
    setPersonItemQuantities(prev => {
      const newQuantities = { ...prev };
      if (!newQuantities[itemIndex]) {
        newQuantities[itemIndex] = {};
      }
      
      // Make sure the person is also assigned to this item
      if (!assignments[itemIndex]?.includes(personId)) {
        togglePersonForItem(itemIndex, personId);
      }
      
      // Increase the quantity
      const currentQty = newQuantities[itemIndex][personId] || 0;
      newQuantities[itemIndex][personId] = currentQty + 1;
      
      return newQuantities;
    });
  };
  
  // Function to decrease the quantity for a person-item pair
  const decreaseQuantity = (itemIndex, personId) => {
    setPersonItemQuantities(prev => {
      const newQuantities = { ...prev };
      if (!newQuantities[itemIndex]) {
        newQuantities[itemIndex] = {};
      }
      
      // Decrease the quantity (minimum 0)
      const currentQty = newQuantities[itemIndex][personId] || 0;
      newQuantities[itemIndex][personId] = Math.max(0, currentQty - 1);
      
      // If quantity reaches 0, unassign the person
      if (newQuantities[itemIndex][personId] === 0) {
        const currentAssignment = assignments[itemIndex] || [];
        if (currentAssignment.includes(personId)) {
          togglePersonForItem(itemIndex, personId);
        }
      }
      
      return newQuantities;
    });
  };

  const renderItem = ({ item, index }) => {
    const itemQuantity = item.quantity || 1;
    const showQuantityControls = itemQuantity > 1;
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>${getItemTotal(item)}</Text>
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.itemQuantityPrice}>
            {showQuantityControls ? (
              <View style={styles.quantityControlContainer}>
                <Text style={styles.quantityLabel}>Quantity:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity style={styles.quantityButton}>
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.quantityValue}>{itemQuantity}</Text>
                  
                  <TouchableOpacity style={styles.quantityButton}>
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.itemQuantity}>Qty: {itemQuantity} @ ${item.unitPrice?.toFixed(2) || '0.00'}</Text>
            )}
          </View>
          
          {/* Shared Switch */}
          <View style={styles.sharedContainer}>
            <Text style={styles.sharedLabel}>Shared</Text>
            <Switch
              trackColor={{ false: "#E0E0E0", true: "#A5D6A7" }}
              thumbColor={sharedItems[index] ? "#4CAF50" : "#BDBDBD"}
              ios_backgroundColor="#E0E0E0"
              onValueChange={() => toggleSharedItem(index)}
              value={sharedItems[index] || false}
            />
          </View>
        </View>

        {showQuantityControls && (
          <View style={styles.unitPriceContainer}>
            <Text style={styles.itemUnitPrice}>@ ${item.unitPrice?.toFixed(2) || '0.00'} each</Text>
          </View>
        )}

        {/* Show the person assignment section regardless of shared status */}
        <View style={styles.assignmentSection}>
          <Text style={styles.assignLabel}>Who participated in this item?</Text>
          <View style={styles.personAssignments}>
            {people.map(person => {
              // Get the person's quantity for this item
              const personQuantity = personItemQuantities[index]?.[person.id] || 0;
              const isAssigned = assignments[index]?.includes(person.id);
              
              return (
                <View key={person.id} style={styles.personQuantityContainer}>
                  {/* Make the whole bubble clickable for both quantity=1 and quantity>1 cases */}
                  <TouchableOpacity 
                    onPress={() => togglePersonForItem(index, person.id)}
                    style={[
                      styles.personBubble,
                      isAssigned ? { borderColor: person.color } : styles.unassignedBubble
                    ]}
                  >
                    {/* Avatar with initial */}
                    <View style={[
                      styles.miniAvatar, 
                      { backgroundColor: person.color }
                    ]}>
                      <Text style={styles.miniAvatarText}>{person.initial}</Text>
                    </View>
                    
                    {/* Minus Button - only for quantity > 1 */}
                    {showQuantityControls && (
                      <TouchableOpacity 
                        style={styles.inlineMinus}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent parent touchable from firing
                          decreaseQuantity(index, person.id);
                        }}
                      >
                        <Text style={styles.inlineButtonText}>−</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Person name */}
                    <Text style={styles.personBubbleText}>
                      {person.name}
                    </Text>
                    
                    {/* Quantity Value - only for quantity > 1 */}
                    {showQuantityControls && (
                      <Text style={styles.inlineQuantity}>{personQuantity}</Text>
                    )}
                    
                    {/* Plus Button - only for quantity > 1 */}
                    {showQuantityControls && (
                      <TouchableOpacity 
                        style={styles.inlinePlus}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent parent touchable from firing
                          increaseQuantity(index, person.id);
                        }}
                      >
                        <Text style={styles.inlineButtonText}>+</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
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
                  people: JSON.stringify(people),
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemQuantityPrice: {
    flexDirection: 'row',
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
  sharedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedLabel: {
    fontSize: 14,
    color: '#424242',
    marginRight: 8,
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
  sharedByAll: {
    marginTop: 8,
  },
  sharedByAllText: {
    fontSize: 14,
    color: '#2E7D32',
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
  quantityControlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#424242',
  },
  quantityValue: {
    fontSize: 16,
    color: '#424242',
    marginHorizontal: 10,
  },
  unitPriceContainer: {
    marginTop: 8,
  },
  assignmentSection: {
    marginTop: 12,
  },
  personQuantityContainer: {
    marginBottom: 10,
    marginRight: 8,
  },
  personQuantityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingRight: 10,
    marginRight: 8,
    borderWidth: 1,
  },
  personItemQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  smallQuantityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallQuantityButtonText: {
    fontSize: 14,
    color: '#424242',
  },
  personItemQtyValue: {
    fontSize: 14,
    color: '#424242',
    marginHorizontal: 5,
  },
  personRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  personBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  unassignedBubble: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  personBubbleText: {
    fontSize: 14,
    marginHorizontal: 8,
    color: '#424242',
  },
  inlineMinus: {
    marginLeft: 8,
    padding: 3,
  },
  inlinePlus: {
    marginLeft: 8,
    padding: 3,
  },
  inlineButtonText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  inlineQuantity: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 8,
    width: 18,
    textAlign: 'center',
  },
});