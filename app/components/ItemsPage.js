import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppContext } from '../context/AppContext';

export default function ItemsPage() {
  const router = useRouter();
  
  // Use global context instead of local state
  const { 
    items, setItems,
    people, setPeople,
    paidBy, setPaidBy,
    assignments, setAssignments,
    sharedItems, setSharedItems,
    personItemQuantities, setPersonItemQuantities
  } = useAppContext();
  
  // No need for useEffect to parse params as we're now using global context
  // All data is already available in context from previous pages

  const togglePersonForItem = (itemIndex, personId) => {
    const item = items[itemIndex];
    const itemQuantity = item?.quantity || 1;
    const personCurrentQuantity = personItemQuantities[itemIndex]?.[personId] || 0;

    setAssignments(prevAssignments => {
      const currentAssignment = prevAssignments[itemIndex] || [];
      const isCurrentlyAssigned = currentAssignment.includes(personId);

      // Logic for items with quantity > 1
      if (itemQuantity > 1) {
        // If person is not currently assigned and their quantity is 0,
        // clicking the bubble should do nothing. Assignment happens via '+' button.
        if (!isCurrentlyAssigned && personCurrentQuantity === 0) {
          return prevAssignments;
        }
        
        // If person is assigned and has quantity > 0, clicking bubble unassigns them and resets quantity to 0
        if (isCurrentlyAssigned) {
          // Also reset their quantity to 0 when unassigning via bubble click
          setPersonItemQuantities(prevQuantities => {
            const newQuantities = { ...prevQuantities };
            if (!newQuantities[itemIndex]) {
              newQuantities[itemIndex] = {};
            }
            newQuantities[itemIndex][personId] = 0;
            return newQuantities;
          });
          
          return {
            ...prevAssignments,
            [itemIndex]: currentAssignment.filter(id => id !== personId)
          };
        }
      } 
      // Logic for items with quantity === 1
      else {
        // Simply toggle assignment for quantity=1 items
        if (isCurrentlyAssigned) {
          return {
            ...prevAssignments,
            [itemIndex]: currentAssignment.filter(id => id !== personId)
          };
        } else {
          return {
            ...prevAssignments,
            [itemIndex]: [...currentAssignment, personId]
          };
        }
      }
      
      // If we reach here, no changes needed
      return prevAssignments;
    });
  };

  // Toggle shared status and reset counters when switching from ON to OFF
  const toggleSharedItem = (itemIndex) => {
    setSharedItems(prev => {
      const newSharedStatus = !prev[itemIndex];
      
      // If turning shared OFF, we need to reset counters
      if (!newSharedStatus) { // switching from ON to OFF
        const item = items[itemIndex];
        const itemQuantity = item.quantity || 1;
        const currentAssignedQuantity = calculateTotalAssignedQuantity(itemIndex);
        
        // If the assigned quantity exceeds what's allowed in non-shared mode
        if (currentAssignedQuantity > itemQuantity) {
          // Reset all counters for this item to zero
          setPersonItemQuantities(prevQuantities => {
            const newQuantities = { ...prevQuantities };
            
            // Get assigned people for this item
            const assignedPeople = assignments[itemIndex] || [];
            
            // Reset all counters to 0
            if (assignedPeople.length > 0) {
              // Create a new object for this item's quantities
              newQuantities[itemIndex] = {};
              
              // Set all assigned people's quantities to 0
              assignedPeople.forEach(personId => {
                newQuantities[itemIndex][personId] = 0;
              });
            }
            
            return newQuantities;
          });
          
          // Also reset assignments since all counters are now 0
          setAssignments(prev => {
            return {
              ...prev,
              [itemIndex]: []
            };
          });
          
          // Show an alert explaining what happened
          Alert.alert(
            "Counters Reset",
            "Shared mode turned off. All counters have been reset to 0.",
            [{ text: "OK" }]
          );
        }
      }
      
      return { ...prev, [itemIndex]: newSharedStatus };
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
    return items.length > 0 && items.every((item, index) => {
      // Check if there's a direct assignment in the assignments object
      const hasDirectAssignments = assignments[index] && assignments[index].length > 0;
      
      // Also check if any person has a quantity > 0 for this item
      const hasQuantityAssignments = Boolean(personItemQuantities[index] && 
        Object.values(personItemQuantities[index]).some(qty => qty > 0));
      
      // Return true if either condition is met
      return hasDirectAssignments || hasQuantityAssignments;
    });
  };

  // Helper function to calculate the sum of quantities for an item
  const calculateTotalAssignedQuantity = (itemIndex) => {
    if (!personItemQuantities[itemIndex]) return 0;
    
    return Object.values(personItemQuantities[itemIndex]).reduce(
      (sum, qty) => sum + qty, 
      0
    );
  };
  
  // Function to increase the quantity for a person-item pair
  const increaseQuantity = (itemIndex, personId) => {
    const item = items[itemIndex];
    const itemQuantity = item.quantity || 1;
    const currentAssignedQuantity = calculateTotalAssignedQuantity(itemIndex);
    const currentPersonQuantity = personItemQuantities[itemIndex]?.[personId] || 0;
    
    // Different behavior based on shared switch status
    if (sharedItems[itemIndex]) {
      // SHARED is ON: Each person can have up to item's total quantity
      if (currentPersonQuantity >= itemQuantity) {
        // Show alert that maximum quantity per person is reached
        Alert.alert(
          "Maximum Quantity Reached",
          `You cannot assign more than ${itemQuantity} portions of this item per person when shared.`,
          [{ text: "OK" }]
        );
        return;
      }
    } else {
      // SHARED is OFF: Total assigned cannot exceed item quantity
      if (currentAssignedQuantity >= itemQuantity) {
        // Show alert that maximum quantity is reached
        Alert.alert(
          "Maximum Quantity Reached",
          `You cannot assign more than ${itemQuantity} portions for this item.`,
          [{ text: "OK" }]
        );
        return;
      }
    }
    
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

  // Function to increase item quantity
  const increaseItemQuantity = (index) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const currentQuantity = newItems[index].quantity || 1;
      newItems[index] = { ...newItems[index], quantity: currentQuantity + 1 };
      // Recalculate unit price if quantity changes and total price exists
      if (newItems[index].price && !newItems[index].unitPrice) {
         newItems[index].unitPrice = newItems[index].price / newItems[index].quantity;
      }
      return newItems;
    });
  };

  // Function to decrease item quantity (minimum 1)
  const decreaseItemQuantity = (index) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      const currentQuantity = newItems[index].quantity || 1;
      if (currentQuantity > 1) {
        newItems[index] = { ...newItems[index], quantity: currentQuantity - 1 };
        // Recalculate unit price if quantity changes and total price exists
        if (newItems[index].price && !newItems[index].unitPrice) {
           newItems[index].unitPrice = newItems[index].price / newItems[index].quantity;
        }

        // Check if assigned quantity exceeds new item quantity when shared is OFF
        if (!sharedItems[index]) {
          const newQuantity = newItems[index].quantity;
          const totalAssigned = calculateTotalAssignedQuantity(index);
          if (totalAssigned > newQuantity) {
            // Reset assignments and quantities for this item
            setPersonItemQuantities(prevQuantities => {
              const resetQuantities = { ...prevQuantities, [index]: {} };
              people.forEach(person => {
                resetQuantities[index][person.id] = 0;
              });
              return resetQuantities;
            });
            setAssignments(prevAssignments => ({ ...prevAssignments, [index]: [] }));
            Alert.alert(
              "Assignments Reset",
              `Item quantity reduced. Assignments for "${newItems[index].name}" have been reset as assigned portions exceeded the new quantity.`,
              [{ text: "OK" }]
            );
          }
        }
      }
      return newItems;
    });
  };

  const renderItem = ({ item, index }) => {
    // Use the quantity from the state
    const itemQuantity = items[index]?.quantity || 1;
    // Show controls if original quantity > 1 OR current state quantity > 1
    const showQuantityControls = (item.quantity || 1) > 1 || itemQuantity > 1;
    const currentTotalAssigned = calculateTotalAssignedQuantity(index);
    // Calculate remaining based on the current state quantity
    const remainingQuantity = itemQuantity - currentTotalAssigned;
    
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
                  {/* Decrease Button */}
                  <TouchableOpacity
                    style={[styles.quantityButton, itemQuantity <= 1 && styles.disabledQuantityButton]}
                    onPress={() => decreaseItemQuantity(index)}
                    disabled={itemQuantity <= 1}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>

                  {/* Quantity Value */}
                  <Text style={styles.quantityValue}>{itemQuantity}</Text>

                  {/* Increase Button */}
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => increaseItemQuantity(index)}
                  >
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

        {/* Unit Price Display (adjust based on state quantity) */}
        {showQuantityControls && (
          <View style={styles.unitPriceContainer}>
             {/* Use items[index] to get potentially updated unit price */}
             <Text style={styles.itemUnitPrice}>@ ${(items[index]?.unitPrice || 0).toFixed(2)} each</Text>
          </View>
        )}
        
        {/* Remaining Portions Display (adjust based on state quantity) */}
        {showQuantityControls && !sharedItems[index] && (
          <View style={styles.remainingContainer}>
            <Text style={[
              styles.remainingText,
              remainingQuantity === 0 ? styles.remainingZero : null,
              remainingQuantity < 0 ? styles.remainingNegative : null // Style for negative remaining
            ]}>
              {remainingQuantity < 0
                ? `${Math.abs(remainingQuantity)} ${Math.abs(remainingQuantity) === 1 ? 'portion' : 'portions'} OVER assigned`
                : `${remainingQuantity} ${remainingQuantity === 1 ? 'portion' : 'portions'} remaining to assign`}
            </Text>
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
                        style={[
                          styles.inlinePlus,
                          // Different visual state based on shared status
                          (sharedItems[index]) 
                            // For shared items: disable only if this person has reached max quantity
                            ? (personItemQuantities[index]?.[person.id] >= itemQuantity ? styles.disabledButton : {})
                            // For non-shared items: disable if no remaining quantity and person has none
                            : (remainingQuantity <= 0 && personQuantity === 0) ? styles.disabledButton : {}
                        ]}
                        onPress={(e) => {
                          e.stopPropagation(); // Prevent parent touchable from firing
                          increaseQuantity(index, person.id);
                        }}
                      >
                        <Text style={[
                          styles.inlineButtonText,
                          // Different visual state based on shared status
                          (sharedItems[index]) 
                            // For shared items: disable text only if this person has reached max quantity
                            ? (personItemQuantities[index]?.[person.id] >= itemQuantity ? styles.disabledButtonText : {})
                            // For non-shared items: disable if no remaining quantity and person has none
                            : (remainingQuantity <= 0 && personQuantity === 0) ? styles.disabledButtonText : {}
                        ]}>+</Text>
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
    <SafeAreaView style={styles.safeArea}>
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
                router.push('/components/SummaryPage');
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
  remainingContainer: {
    marginTop: 8,
  },
  remainingText: {
    fontSize: 14,
    color: '#757575',
  },
  remainingZero: {
    color: '#D32F2F',
  },
  disabledQuantityButton: {
    backgroundColor: '#F5F5F5', // Lighter background for disabled
  },
  remainingNegative: {
    color: '#FF9800', // Orange color for over-assigned warning
    fontWeight: 'bold',
  },
});