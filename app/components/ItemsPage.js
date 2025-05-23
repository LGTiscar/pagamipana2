import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppContext } from '../context/AppContext';
import Tooltip from 'react-native-walkthrough-tooltip';

function ItemsPage(props) {
  const router = useRouter();
  
  // Use global context instead of local state
  const { 
    items, setItems,
    people, setPeople,
    paidBy, setPaidBy,
    assignments, setAssignments,
    sharedItems, setSharedItems,
    personItemQuantities, setPersonItemQuantities,
    portionAssignments, setPortionAssignments, // IMPORTANTE: Usar el contexto global en lugar de estado local
    translate, // Get translation function
    currencySymbol // Get currency symbol
  } = useAppContext();
  
  // Add modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [tempAssignments, setTempAssignments] = useState({});
  
  // ELIMINAR esta línea - no necesitamos un estado local para portionAssignments
  // const [portionAssignments, setPortionAssignments] = useState({});
  
  // Tooltip state for walkthrough
  const [showSwitchTooltip, setShowSwitchTooltip] = useState(true); // Show on first load

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
    const newSharedStatus = !sharedItems[itemIndex];
    
    // If turning shared ON, show the modal for individual assignments
    if (newSharedStatus) {
      // Initialize temporary assignments based on current assignments
      const item = items[itemIndex];
      const itemQuantity = item.quantity || 1;
      const initialTempAssignments = {};
      
      // Create entries for each portion
      for (let i = 0; i < itemQuantity; i++) {
        initialTempAssignments[i] = [];
      }
      
      // Set up the modal with current item index and initial assignments
      setModalItemIndex(itemIndex);
      setTempAssignments(initialTempAssignments);
      setModalVisible(true);
      
      // Don't update shared status yet - we'll do it when the user confirms in the modal
      return;
    }
    
    // Original logic for turning shared OFF
    setSharedItems(prev => {
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
          
          // Show an alert explaining what happened - translated
          Alert.alert(
            translate("Counters Reset"),
            translate("Shared mode turned off. All counters have been reset to 0."),
            [{ text: "OK" }]
          );
        }
      }
      
      return { ...prev, [itemIndex]: newSharedStatus };
    });
  };
  
  // Handle toggling a person in the modal for a specific portion
  const togglePersonForPortion = (portionIndex, personId) => {
    setTempAssignments(prevAssignments => {
      const updatedAssignments = { ...prevAssignments };
      const currentPortionAssignment = [...(updatedAssignments[portionIndex] || [])];
      
      // Toggle the person for this portion
      if (currentPortionAssignment.includes(personId)) {
        updatedAssignments[portionIndex] = currentPortionAssignment.filter(id => id !== personId);
      } else {
        updatedAssignments[portionIndex] = [...currentPortionAssignment, personId];
      }
      
      return updatedAssignments;
    });
  };
  
  // Add the missing getPersonNamesByIds function
  const getPersonNamesByIds = (personIds) => {
    if (!personIds) return [];
    return personIds
      .map(id => {
        const person = people.find(p => p.id === id);
        return person ? person.name : '';
      })
      .filter(name => name !== '');
  };
  
  // Save assignments from modal and turn on shared mode
  const saveModalAssignments = () => {
    if (modalItemIndex === null) {
      setModalVisible(false);
      return;
    }
    
    // First enable shared mode for this item
    setSharedItems(prev => ({
      ...prev,
      [modalItemIndex]: true
    }));
    
    console.log("=== GUARDANDO ASIGNACIONES POR UNIDADES EN CONTEXTO GLOBAL ===");
    console.log("Item Index:", modalItemIndex);
    console.log("Temp Assignments:", JSON.stringify(tempAssignments));
    
    // Store the portion-specific assignments in the GLOBAL context
    setPortionAssignments(prev => {
      const newAssignments = {
        ...prev,
        [modalItemIndex]: { ...tempAssignments }
      };
      
      console.log("Nuevas asignaciones por unidades (contexto global):", JSON.stringify(newAssignments));
      return newAssignments;
    });
    
    // También actualizar las asignaciones generales para este item
    // para que se muestre como asignado en la lista principal
    const allAssignedPeople = new Set();
    Object.values(tempAssignments).forEach(peopleForUnit => {
      if (peopleForUnit && peopleForUnit.length) {
        peopleForUnit.forEach(personId => allAssignedPeople.add(personId));
      }
    });
    
    setAssignments(prev => ({
      ...prev,
      [modalItemIndex]: Array.from(allAssignedPeople)
    }));
    
    // Close the modal
    setModalVisible(false);
    setModalItemIndex(null);
  };
  
  // Cancel modal without saving
  const cancelModal = () => {
    setModalVisible(false);
    setModalItemIndex(null);
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
    // We no longer require all items to be assigned
    // Instead, if an item has no assignments, it will be shared equally by default
    return items.length > 0; // Just check that we have items to split
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
        // Show alert that maximum quantity per person is reached - translated
        Alert.alert(
          translate("Maximum Quantity Reached"),
          translate(`You cannot assign more than ${itemQuantity} portions of this item per person when shared.`),
          [{ text: "OK" }]
        );
        return;
      }
    } else {
      // SHARED is OFF: Total assigned cannot exceed item quantity
      if (currentAssignedQuantity >= itemQuantity) {
        // Show alert that maximum quantity is reached - translated
        Alert.alert(
          translate("Maximum Quantity Reached"),
          translate(`You cannot assign more than ${itemQuantity} portions for this item.`),
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
              translate("Assignments Reset"),
              translate(`Item quantity reduced. Assignments for "${newItems[index].name}" have been reset as assigned portions exceeded the new quantity.`),
              [{ text: "OK" }]
            );
          }
        }
      }
      return newItems;
    });
  };

  // Add useEffect to initialize portion assignments from storage
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        // We would load from AsyncStorage here in a real app
        console.log("Loaded portion assignments from storage");
      } catch (error) {
        console.error("Error loading portion assignments:", error);
      }
    };
    
    loadAssignments();
  }, []);

  // Añadir un useEffect para mostrar información de depuración sobre las asignaciones
  useEffect(() => {
    if (Object.keys(portionAssignments).length > 0) {
      console.log("=== ASIGNACIONES POR UNIDADES ACTUALES (CONTEXTO) ===");
      console.log(JSON.stringify(portionAssignments));
    }
  }, [portionAssignments]);

  // Textos en español directamente en vez de usar translate para asegurar castellano
  const SPANISH_TEXTS = {
    "Assign Portions Individually": "Asignar Unidades Individualmente",
    "Portion": "Unidad",
    "Cancel": "Cancelar",
    "Save": "Guardar",
    "Edit Portions": "Editar Unidades",
    "Equal split": "División Igual",
    "each": "cada uno",
    "Full amount": "Importe completo",
    "Shared": "Compartido",
    "units": "unidades",
    "unit price": "precio unitario",
    "Who participated in this item?": "¿Quién participó en este artículo?",
    "If no one is selected, this will be split equally among everyone": "Si no se selecciona a nadie, se dividirá equitativamente entre todos",
    "portion remaining to assign": "unidad restante por asignar",
    "portions remaining to assign": "unidades restantes por asignar",
    "portion OVER assigned": "unidad asignada EN EXCESO",
    "portions OVER assigned": "unidades asignadas EN EXCESO",
    "Quantity:": "Cantidad:"
  };

  const renderItem = ({ item, index }) => {
    // Use the quantity from the state
    const itemQuantity = items[index]?.quantity || 1;
    // Show controls if original quantity > 1 OR current state quantity > 1
    const showQuantityControls = (item.quantity || 1) > 1 || itemQuantity > 1;
    const currentTotalAssigned = calculateTotalAssignedQuantity(index);
    // Calculate remaining based on the current state quantity
    const remainingQuantity = itemQuantity - currentTotalAssigned;
    
    // Check if this item has portion assignments
    const hasPortionAssignments = portionAssignments && 
                                portionAssignments[index] && 
                                Object.keys(portionAssignments[index]).length > 0 &&
                                // Check if at least one portion has people assigned
                                Object.values(portionAssignments[index]).some(portion => 
                                  portion && portion.length > 0
                                );
    
    // Include this debugging line
    console.log(`Item ${item.name} has portion assignments: ${hasPortionAssignments}`, 
                portionAssignments && portionAssignments[index] ? 
                JSON.stringify(portionAssignments[index]) : "none");
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>{currencySymbol}{getItemTotal(item)}</Text>
        </View>
        
        <View style={styles.itemDetails}>
          <View style={styles.itemQuantityPrice}>
            {showQuantityControls ? (
              <View style={styles.quantityControlContainer}>
                <Text style={styles.quantityLabel}>{translate("Quantity:")}</Text>
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
              <Text style={styles.itemQuantity}>Qty: {itemQuantity} @ {currencySymbol}{item.unitPrice?.toFixed(2) || '0.00'}</Text>
            )}
          </View>
          
          {/* Shared Switch - walkthrough only for first item */}
          {index === 0 ? (
            <Tooltip
              isVisible={showSwitchTooltip}
              content={<Text>Pulsa aquí para activar el modo "Compartido" y asignar unidades individuales de este ítem.</Text>}
              placement="bottom"
              onClose={() => setShowSwitchTooltip(false)}
              showChildInTooltip={false}
            >
              <View style={styles.sharedContainer}>
                <Text style={styles.sharedLabel}>{SPANISH_TEXTS["Shared"]}</Text>
                <Switch
                  trackColor={{ false: "#E0E0E0", true: "#A5D6A7" }}
                  thumbColor={sharedItems[index] ? "#4CAF50" : "#BDBDBD"}
                  ios_backgroundColor="#E0E0E0"
                  onValueChange={() => toggleSharedItem(index)}
                  value={sharedItems[index] || false}
                />
              </View>
            </Tooltip>
          ) : (
            <View style={styles.sharedContainer}>
              <Text style={styles.sharedLabel}>{SPANISH_TEXTS["Shared"]}</Text>
              <Switch
                trackColor={{ false: "#E0E0E0", true: "#A5D6A7" }}
                thumbColor={sharedItems[index] ? "#4CAF50" : "#BDBDBD"}
                ios_backgroundColor="#E0E0E0"
                onValueChange={() => toggleSharedItem(index)}
                value={sharedItems[index] || false}
              />
            </View>
          )}
        </View>

        {/* Unit Price Display (adjust based on state quantity) */}
        {showQuantityControls && (
          <View style={styles.unitPriceContainer}>
             {/* Use items[index] to get potentially updated unit price */}
             <Text style={styles.itemUnitPrice}>@ {currencySymbol}{(items[index]?.unitPrice || 0).toFixed(2)} {translate("each")}</Text>
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
                ? `${Math.abs(remainingQuantity)} ${Math.abs(remainingQuantity) === 1 ? 
                    translate("portion OVER assigned") : 
                    translate("portions OVER assigned")}`
                : `${remainingQuantity} ${remainingQuantity === 1 ? 
                    translate("portion remaining to assign") : 
                    translate("portions remaining to assign")}`}
            </Text>
          </View>
        )}

        {/* Show the person assignment section - modified for shared items */}
        <View style={styles.assignmentSection}>
          <View style={styles.assignLabelContainer}>
            <Text style={styles.assignLabel}>{translate("Who participated in this item?")}</Text>
            {(assignments[index]?.length === 0 || !assignments[index]) && (
              <Text style={styles.unassignedNote}>
                ({translate("If no one is selected, this will be split equally among everyone")})
              </Text>
            )}
          </View>
          
          {/* For shared items with portion assignments, show portion details */}
          {sharedItems[index] && hasPortionAssignments ? (
            <View style={styles.portionDetails}>
              {Object.keys(portionAssignments[index]).map((portionIdx) => {
                const portionPeopleIds = portionAssignments[index][portionIdx];
                if (portionPeopleIds.length === 0) return null;
                
                const peopleNames = getPersonNamesByIds(portionPeopleIds);
                
                return (
                  <View key={`portion-${portionIdx}`} style={styles.portionRow}>
                    <Text style={styles.portionLabel}>
                      {translate("Portion")} {parseInt(portionIdx) + 1}:
                    </Text>
                    <Text style={styles.portionPeople}>
                      {peopleNames.join(', ')}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            // Original people bubbles for non-shared or shared items without portion assignments
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
                      
                      {/* Minus Button - only for quantity > 1 and not shared */}
                      {showQuantityControls && !sharedItems[index] && (
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
                      
                      {/* Quantity Value - only for quantity > 1 and not shared */}
                      {showQuantityControls && !sharedItems[index] && (
                        <Text style={styles.inlineQuantity}>{personQuantity}</Text>
                      )}
                      
                      {/* Plus Button - only for quantity > 1 and not shared */}
                      {showQuantityControls && !sharedItems[index] && (
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
          )}
          
          {/* Edit button for shared items with portion assignments */}
          {sharedItems[index] && hasPortionAssignments && (
            <TouchableOpacity 
              style={styles.editPortionsButton}
              onPress={() => {
                // Initialize temporary assignments with current portion assignments
                setTempAssignments({...portionAssignments[index]});
                setModalItemIndex(index);
                setModalVisible(true);
              }}
            >
              <Text style={styles.editPortionsText}>
                {SPANISH_TEXTS["Edit Portions"]}
              </Text>
            </TouchableOpacity>
          )}
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
            <Text style={styles.tabText}>{translate("Upload Bill")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/PeoplePage')}>
            <Text style={styles.tabText}>{translate("Add People")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>{translate("Assign Items")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/SummaryPage')}>
            <Text style={styles.tabText}>{translate("Summary")}</Text>
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>{translate("Step 3: Assign Items")}</Text>
        <Text style={styles.subtitle}>{translate("Select who ordered each item")}</Text>

        {/* Bill Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>{translate("Bill Total:")}</Text>
          <Text style={styles.totalAmount}>{currencySymbol}{calculateTotal()}</Text>
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
              {translate("No items found. Please go back to upload a bill.")}
            </Text>
          </View>
        )}

        {/* Instructions Box */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>{translate("Next step:")}</Text>
          <Text style={styles.instructionsText}>
            {translate("After assigning items, you'll see the summary of what each person owes.")}
            {" "}
            {translate("Items without assignments will be split equally among everyone.")}
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{translate("Back")}</Text>
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
            <Text style={styles.nextButtonText}>{translate("Next")}</Text>
          </TouchableOpacity>
        </View>

        {/* Shared Item Assignment Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={cancelModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {SPANISH_TEXTS["Assign Portions Individually"]}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {modalItemIndex !== null && items[modalItemIndex] ? 
                    `${items[modalItemIndex].name}` : ''}
                </Text>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {modalItemIndex !== null && items[modalItemIndex] && 
                  Array.from({ length: items[modalItemIndex].quantity || 1 }).map((_, portionIndex) => (
                    <View key={portionIndex} style={styles.portionSection}>
                      <Text style={styles.portionTitle}>
                        {SPANISH_TEXTS["Portion"]} {portionIndex + 1}
                      </Text>
                      
                      <View style={styles.portionPeopleList}>
                        {people.map(person => {
                          const isAssigned = tempAssignments[portionIndex]?.includes(person.id);
                          
                          return (
                            <View key={`${portionIndex}-${person.id}`} style={styles.personQuantityContainer}>
                              <TouchableOpacity 
                                onPress={() => togglePersonForPortion(portionIndex, person.id)}
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
                                
                                {/* Person name */}
                                <Text style={styles.personBubbleText}>
                                  {person.name}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                }
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={cancelModal}
                >
                  <Text style={styles.modalCancelText}>{SPANISH_TEXTS["Cancel"]}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSaveButton}
                  onPress={saveModalAssignments}
                >
                  <Text style={styles.modalSaveText}>{SPANISH_TEXTS["Save"]}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ItemsPage;

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
    fontSize: 16,
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
  assignLabelContainer: {
    marginBottom: 8,
  },
  unassignedNote: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#424242',
  },
  modalContent: {
    maxHeight: '70%',
  },
  portionSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  portionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 10,
  },
  portionPeopleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 12,
  },
  highlightedAvatar: {
    borderWidth: 2,
    borderColor: '#FF5252',  // Red border for selected people
  },
  modalPersonContainer: {
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 16,
    width: 60,
  },
  modalPersonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalPersonInitial: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalPersonName: {
    fontSize: 12,
    color: '#424242',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    marginRight: 12,
  },
  modalCancelText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  modalSaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  modalSaveText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  
  // New styles for portion details display
  portionDetails: {
    marginTop: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
  },
  portionRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  portionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
    marginRight: 8,
    width: 80,
  },
  portionPeople: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  editPortionsButton: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  editPortionsText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
});