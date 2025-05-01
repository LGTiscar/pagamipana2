import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppContext } from '../context/AppContext';

export default function SummaryPage() {
  const router = useRouter();
  
  // Add state to track expanded person cards
  const [expandedPersons, setExpandedPersons] = useState({});
  
  // Get all necessary data from context
  const { 
    items, 
    people,
    paidBy,
    assignments,
    personItemQuantities,
    sharedItems,
    translate, // Get translation function
    currencySymbol // Get currency symbol
  } = useAppContext();

  // Get the person who paid
  const getPayer = () => {
    return people.find(person => person.id === paidBy) || null;
  };
  
  // Toggle expanded state of a person card
  const togglePersonDetails = (personId) => {
    setExpandedPersons(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }));
  };
  
  // Calculate the total bill amount
  const calculateTotal = () => {
    let total = 0;
    items.forEach(item => {
      total += (item.unitPrice || 0) * (item.quantity || 1);
    });
    return total.toFixed(2);
  };

  // Calculate who owes what and return detailed breakdown
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
    console.log(`Total Bill Amount: ${currencySymbol}${totalBillAmount.toFixed(2)}`);
    
    // Step 2: Calculate what each person owes for their items
    const owes = {};
    const itemBreakdowns = {}; // New object to track item breakdowns
    const personalSpending = {}; // Track personal spending before bill payment
    
    // Initialize for each person
    people.forEach(person => {
      owes[person.id] = 0;
      itemBreakdowns[person.id] = []; // Initialize empty array for each person's items
      personalSpending[person.id] = 0; // Initialize personal spending to 0
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
      
      console.log(`Item ${index}: ${item.name} - Unit Price: ${currencySymbol}${unitPrice} x ${itemQuantity} units = ${currencySymbol}${totalItemPrice} - Assigned to ${peopleAssigned.length} people - Shared: ${isShared}`);
      
      // If no one is assigned to this item, split equally among all people
      if (peopleAssigned.length === 0) {
        console.log(`  No specific assignment for ${item.name} - splitting equally among all ${people.length} people`);
        
        const pricePerPerson = totalItemPrice / people.length;
        
        people.forEach(person => {
          owes[person.id] = (owes[person.id] || 0) + pricePerPerson;
          
          // Add to item breakdown
          itemBreakdowns[person.id].push({
            name: item.name,
            amount: pricePerPerson.toFixed(2),
            details: translate("Equal split (unassigned item)"),
            quantity: 1,
            shared: true
          });
          
          console.log(`  ${person.name} (${person.id}) now owes: ${currencySymbol}${owes[person.id].toFixed(2)} (equal split)`);
        });
        
        // Also track personal spending for the payer
        if (paidBy) {
          personalSpending[paidBy] += pricePerPerson;
        }
        
        return; // Skip the rest of the processing for this item
      }
      
      // Different splitting logic based on shared status and quantity
      if (isShared && itemQuantity > 1 && personItemQuantities[itemIndex]) {
        // CASE: Shared item with quantity > 1
        // In this case, we handle each unit of the item separately
        
        // Create a map to track how much of each item a person is responsible for
        const personShares = {};
        peopleAssigned.forEach(personId => {
          personShares[personId] = 0;
        });
        
        // Loop through each unit of the item
        for (let unitIndex = 0; unitIndex < itemQuantity; unitIndex++) {
          // For each unit, find who participated in it
          const participantsForThisUnit = [];
          
          peopleAssigned.forEach(personId => {
            const personParticipationCount = personItemQuantities[itemIndex]?.[personId] || 0;
            // If person participated in at least this many units, include them for this unit
            if (personParticipationCount > unitIndex) {
              participantsForThisUnit.push(personId);
              personShares[personId] += 1 / participantsForThisUnit.length; // Add share for this unit
            }
          });
          
          // If no one participated in this unit, split it equally among all assigned people
          if (participantsForThisUnit.length === 0) {
            console.log(`  No specific assignments for unit ${unitIndex + 1} of ${item.name} - splitting among all assigned people`);
            
            const costPerPersonForThisUnit = unitPrice / peopleAssigned.length;
            
            peopleAssigned.forEach(personId => {
              owes[personId] = (owes[personId] || 0) + costPerPersonForThisUnit;
              personShares[personId] += 1 / peopleAssigned.length; // Add share for this unit
              
              const personName = people.find(p => p.id === personId)?.name;
              console.log(`    ${personName} (${personId}) now owes: ${currencySymbol}${owes[personId].toFixed(2)} (unit split)`);
            });
            
            continue;
          }
          
          // Split this unit's cost equally among its participants
          const costPerPersonForThisUnit = unitPrice / participantsForThisUnit.length;
          
          console.log(`  Unit ${unitIndex + 1}: ${currencySymbol}${unitPrice} split among ${participantsForThisUnit.length} people = ${currencySymbol}${costPerPersonForThisUnit.toFixed(2)} per person`);
          
          participantsForThisUnit.forEach(personId => {
            owes[personId] = (owes[personId] || 0) + costPerPersonForThisUnit;
            
            const personName = people.find(p => p.id === personId)?.name;
            console.log(`    ${personName} (${personId}) now owes: ${currencySymbol}${owes[personId].toFixed(2)}`);
          });
        }
        
        // Add to item breakdown for each person
        peopleAssigned.forEach(personId => {
          const personQty = personItemQuantities[itemIndex]?.[personId] || 0;
          const totalCost = personShares[personId] * unitPrice;
          
          if (totalCost > 0) {
            itemBreakdowns[personId].push({
              name: item.name,
              amount: totalCost.toFixed(2),
              details: `${personQty}/${itemQuantity} ${translate("units")}`,
              quantity: personQty,
              shared: true
            });
          }
        });
        
        // Track personal spending for the payer if they're assigned to this item
        if (paidBy && peopleAssigned.includes(paidBy)) {
          const payerQty = personItemQuantities[itemIndex]?.[paidBy] || 0;
          if (payerQty > 0) {
            // Calculate payer's portion based on their participation in each unit
            let payerCost = 0;
            // For each unit the payer participated in, add their share
            for (let unitIndex = 0; unitIndex < Math.min(payerQty, itemQuantity); unitIndex++) {
              // Find participants for this unit
              const participantsForThisUnit = [];
              peopleAssigned.forEach(personId => {
                const personParticipationCount = personItemQuantities[itemIndex]?.[personId] || 0;
                if (personParticipationCount > unitIndex) {
                  participantsForThisUnit.push(personId);
                }
              });
              
              // Add payer's share for this unit
              if (participantsForThisUnit.length > 0) {
                payerCost += unitPrice / participantsForThisUnit.length;
              }
            }
            personalSpending[paidBy] += payerCost;
          }
        }
        
      } else {
        // CASE: Regular item or quantity=1 or shared=false
        // Use equal split among assigned people
        const pricePerPerson = totalItemPrice / peopleAssigned.length;
        console.log(`  Regular item, price per person (equal split): ${currencySymbol}${pricePerPerson}`);
        
        peopleAssigned.forEach(personId => {
          owes[personId] = (owes[personId] || 0) + pricePerPerson;
          
          // Add to item breakdown
          itemBreakdowns[personId].push({
            name: item.name,
            amount: pricePerPerson.toFixed(2),
            details: peopleAssigned.length > 1 ? 
              `${translate("Split among")} ${peopleAssigned.length} ${translate("people")}` : 
              translate("Full amount"),
            quantity: personItemQuantities[itemIndex]?.[personId] || 1,
            shared: peopleAssigned.length > 1
          });
          
          const personName = people.find(p => p.id === personId)?.name;
          console.log(`  ${personName} (${personId}) now owes: ${currencySymbol}${owes[personId].toFixed(2)}`);
        });
        
        // Track personal spending for the payer if they're assigned to this item
        if (paidBy && peopleAssigned.includes(paidBy)) {
          personalSpending[paidBy] += pricePerPerson;
        }
      }
    });
    
    // The person who paid should receive money, not pay
    if (paidBy) {
      owes[paidBy] = 0;
      console.log(`Payer ${paidBy} reset to ${currencySymbol}0.00`);
    }
    
    // Log final amounts
    console.log('Final amounts owed:', JSON.stringify(owes));
    console.log('--------- END DEBUGGING ---------');
    
    return { owes, itemBreakdowns, personalSpending };
  };

  // Get all calculations at once
  const { owes, itemBreakdowns, personalSpending } = calculateSplitAmounts();

  // Calculate how much the payer will get back
  const getPayerRefund = () => {
    if (!paidBy) return 0;
    
    const totalBill = parseFloat(calculateTotal());
    const payerSpent = personalSpending[paidBy] || 0;
    
    return (totalBill - payerSpent).toFixed(2);
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
            <Text style={styles.tabText}>{translate("Upload Bill")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/PeoplePage')}>
            <Text style={styles.tabText}>{translate("Add People")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/ItemsPage')}>
            <Text style={styles.tabText}>{translate("Assign Items")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>{translate("Summary")}</Text>
          </TouchableOpacity>
        </View>

        {/* Title and Subtitle */}
        <Text style={styles.title}>{translate("Step 4: Summary")}</Text>
        <Text style={styles.subtitle}>{translate("See who owes what to whom")}</Text>

        {/* Bill Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardTitle}>{translate("Bill Summary")}</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{translate("Total Bill:")}</Text>
            <Text style={styles.summaryValue}>{currencySymbol}{calculateTotal()}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{translate("Paid by:")}</Text>
            <View style={styles.payerInfo}>
              {paidBy ? (
                <>
                  <View style={[styles.miniAvatar, { backgroundColor: getPayer()?.color || '#BDBDBD' }]}>
                    <Text style={styles.miniAvatarText}>{getPayer()?.initial || '?'}</Text>
                  </View>
                  <Text style={styles.summaryValue}>{getPayer()?.name || translate("Unknown")}</Text>
                </>
              ) : (
                <Text style={styles.summaryValue}>{translate("Not specified")}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Who Owes What Section */}
        <Text style={styles.sectionTitle}>{translate("Who Owes What")}</Text>
        
        {people.length > 0 ? (
          people.map(person => {
            const amount = owes[person.id] || 0;
            const isExpanded = expandedPersons[person.id] || false;
            const isPayer = person.id === paidBy;
            const personalAmount = personalSpending[person.id] || 0;
            
            return (
              <View key={person.id} style={[
                styles.oweCard, 
                isExpanded && styles.expandedCard,
                isPayer && styles.payerCard
              ]}>
                {/* Header section with person info and amount - always visible */}
                <TouchableOpacity 
                  style={styles.oweCardHeader}
                  onPress={() => togglePersonDetails(person.id)}
                >
                  <View style={styles.personInfo}>
                    <View style={[styles.avatar, { backgroundColor: person.color }]}>
                      <Text style={styles.avatarText}>{person.initial}</Text>
                    </View>
                    <Text style={styles.personName}>{person.name}</Text>
                    {isPayer && (
                      <View style={styles.payerBadge}>
                        <Text style={styles.payerBadgeText}>{translate("Paid the bill")}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.amountContainer}>
                    {isPayer ? (
                      <Text style={styles.payerAmount}>{currencySymbol}{calculateTotal()}</Text>
                    ) : (
                      <Text style={styles.oweAmount}>{currencySymbol}{amount.toFixed(2)}</Text>
                    )}
                    {!isPayer && (
                      <Text style={styles.oweLabel}>{translate("to")} {getPayer()?.name || translate("payer")}</Text>
                    )}
                    <Text style={styles.expandToggle}>{isExpanded ? translate("Hide details") : translate("Show details")}</Text>
                  </View>
                </TouchableOpacity>
                
                {/* Expandable section with breakdown */}
                {isExpanded && (
                  <View style={styles.breakdownContainer}>
                    <Text style={styles.breakdownTitle}>{translate("Item Breakdown:")}</Text>
                    
                    {isPayer ? (
                      <>
                        {/* Show payer's personal spending breakdown */}
                        {itemBreakdowns[person.id] && itemBreakdowns[person.id].length > 0 ? (
                          <>
                            {itemBreakdowns[person.id].map((item, index) => (
                              <View key={index} style={styles.breakdownItem}>
                                <View style={styles.breakdownItemLeft}>
                                  <Text style={styles.breakdownItemName}>{item.name}</Text>
                                  <Text style={styles.breakdownItemDetails}>
                                    {item.shared ? 
                                      `${item.details}` : 
                                      `${item.quantity} × ${translate("Full amount")}`}
                                  </Text>
                                </View>
                                <Text style={styles.breakdownItemAmount}>{currencySymbol}{item.amount}</Text>
                              </View>
                            ))}
                            
                            <View style={styles.breakdownSection}>
                              <View style={styles.breakdownTotal}>
                                <Text style={styles.breakdownTotalText}>{translate("Your consumption")}</Text>
                                <Text style={styles.breakdownTotalAmount}>{currencySymbol}{personalAmount.toFixed(2)}</Text>
                              </View>
                              
                              <View style={styles.breakdownTotal}>
                                <Text style={styles.breakdownTotalText}>{translate("Others owe you")}</Text>
                                <Text style={styles.payerRefundAmount}>{currencySymbol}{getPayerRefund()}</Text>
                              </View>
                              
                              <View style={[styles.breakdownTotal, styles.finalTotal]}>
                                <Text style={styles.finalTotalText}>{translate("Total paid")}</Text>
                                <Text style={styles.payerTotalAmount}>{currencySymbol}{calculateTotal()}</Text>
                              </View>
                            </View>
                          </>
                        ) : (
                          <>
                            <Text style={styles.payerBreakdownText}>
                              {translate("You paid the total bill amount and should collect from others.")}
                            </Text>
                            <View style={styles.breakdownTotal}>
                              <Text style={styles.breakdownTotalText}>{translate("Total Paid")}</Text>
                              <Text style={styles.payerTotalAmount}>{currencySymbol}{calculateTotal()}</Text>
                            </View>
                          </>
                        )}
                      </>
                    ) : itemBreakdowns[person.id] && itemBreakdowns[person.id].length > 0 ? (
                      <>
                        {itemBreakdowns[person.id].map((item, index) => (
                          <View key={index} style={styles.breakdownItem}>
                            <View style={styles.breakdownItemLeft}>
                              <Text style={styles.breakdownItemName}>{item.name}</Text>
                              <Text style={styles.breakdownItemDetails}>
                                {item.shared ? 
                                  `${item.details}` : 
                                  `${item.quantity} × ${translate("Full amount")}`}
                              </Text>
                            </View>
                            <Text style={styles.breakdownItemAmount}>{currencySymbol}{item.amount}</Text>
                          </View>
                        ))}
                        
                        <View style={styles.breakdownTotal}>
                          <Text style={styles.breakdownTotalText}>{translate("Total")}</Text>
                          <Text style={styles.breakdownTotalAmount}>{currencySymbol}{amount.toFixed(2)}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noItemsText}>{translate("No items assigned")}</Text>
                    )}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {translate("No people added yet. Go back to add people who participated in the bill.")}
            </Text>
          </View>
        )}

        {/* Instructions Box */}
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsTitle}>{translate("All done!")}</Text>
          <Text style={styles.instructionsText}>
            {translate("Everyone can now settle up with the person who paid the bill.")}
            {'\n\n'}
            {translate("Items with no specific assignments were split equally among all participants.")}
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{translate("Back")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={() => router.push('/')}>
            <Text style={styles.doneButtonText}>{translate("Done")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ...existing code...
  
  oweCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  expandedCard: {
    marginBottom: 15,
  },
  oweCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
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
  expandToggle: {
    fontSize: 12,
    color: '#4285F4',
    marginTop: 4,
  },
  breakdownContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  breakdownItemLeft: {
    flex: 1,
  },
  breakdownItemName: {
    fontSize: 14,
    color: '#424242',
  },
  breakdownItemDetails: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  breakdownItemAmount: {
    fontSize: 14,
    color: '#424242',
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  breakdownTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  breakdownTotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F44336',
  },
  noItemsText: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
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
  
  // Keep other existing styles
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
  payerCard: {
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  payerBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
  },
  payerBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  payerAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  payerBreakdownText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  payerTotalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  breakdownSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 10,
    paddingTop: 10,
  },
  finalTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  payerRefundAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});