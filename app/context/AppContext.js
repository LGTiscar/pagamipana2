import React, { createContext, useContext, useState } from 'react';

// Create the context
const AppContext = createContext();

// Custom hook to use the context
export const useAppContext = () => {
  return useContext(AppContext);
};

// Provider component that wraps the app and provides the context value
export const AppProvider = ({ children }) => {
  // All shared state across pages
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [paidBy, setPaidBy] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [sharedItems, setSharedItems] = useState({});
  const [personItemQuantities, setPersonItemQuantities] = useState({});
  const [uploadedImagePath, setUploadedImagePath] = useState(null);

  // Values to be provided to consuming components
  const value = {
    // Receipt/bill items
    items,
    setItems,
    
    // People for splitting
    people,
    setPeople,
    
    // Who paid the bill
    paidBy,
    setPaidBy,
    
    // Item assignments
    assignments,
    setAssignments,
    
    // Shared items status
    sharedItems,
    setSharedItems,
    
    // Person-item quantity mapping
    personItemQuantities,
    setPersonItemQuantities,
    
    // Uploaded image path (from UploadBillPage)
    uploadedImagePath,
    setUploadedImagePath,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};