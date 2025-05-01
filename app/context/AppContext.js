import React, { createContext, useContext, useState } from 'react';

// Spanish translations
export const spanishTranslations = {
  // Upload Bill Page
  "Upload Bill": "Subir Factura",
  "Step 1: Upload your bill": "Paso 1: Sube tu factura",
  "Take a picture or upload an image of your receipt": "Toma una foto o sube una imagen de tu recibo",
  "Take a picture": "Tomar una foto",
  "Choose from gallery": "Elegir de la galería",
  "No image uploaded yet": "Aún no has subido ninguna imagen",
  "Next step:": "Siguiente paso:",
  "After uploading your bill, you'll add people to split with.": "Después de subir tu factura, añadirás personas con las que dividir.",
  "Next": "Siguiente",
  "Done": "Hecho",
  "Processing receipt...": "Procesando recibo...",
  "Upload an image of your restaurant bill": "Sube una imagen de tu factura de restaurante",
  "Gallery": "Galería",
  "Select from your photos": "Selecciona de tus fotos",
  "Camera": "Cámara",
  "Take a photo now": "Tomar una foto ahora",
  "Bill Preview": "Vista previa de la factura",
  "Your bill preview will appear here": "La vista previa de tu factura aparecerá aquí",
  "Analyze Receipt": "Analizar Recibo",
  "Processing...": "Procesando...",
  "OCR Scanning Tips:": "Consejos para escaneo OCR:",
  "Ensure the bill is well-lit and text is clearly visible": "Asegúrate de que la factura esté bien iluminada y el texto sea claramente visible",
  "Avoid shadows and glare on the receipt": "Evita sombras y brillos en el recibo",
  "Make sure the entire bill is in the frame": "Asegúrate de que toda la factura esté dentro del marco",
  "Hold the camera steady to avoid blurry images": "Mantén la cámara estable para evitar imágenes borrosas",
  "Permissions Required": "Permisos Requeridos",
  "Please grant camera and photo library permissions to continue.": "Por favor, concede permisos de cámara y biblioteca de fotos para continuar.",
  "No Image": "Sin Imagen",
  "Please upload or take a photo of the bill before analyzing.": "Por favor, sube o toma una foto de la factura antes de analizar.",
  "Error": "Error",
  "Failed to analyze the receipt. Please try again.": "Error al analizar el recibo. Por favor, inténtalo de nuevo.",

  // People Page
  "Add People": "Añadir Personas",
  "Step 2: Add People to Split With": "Paso 2: Añade personas para dividir",
  "Add everyone who's splitting the bill": "Añade a todos los que van a dividir la cuenta",
  "Add person's name": "Añadir nombre de la persona",
  "Add people who are splitting the bill": "Añade personas con las que dividir la cuenta",
  "Who Paid the Bill?": "¿Quién pagó la cuenta?",
  "After adding everyone, you'll assign bill items to each person in the next step.": "Después de añadir a todos, asignarás artículos a cada persona en el siguiente paso.",
  "Add": "Añadir",
  "Back": "Atrás",
  "Paid the bill": "Pagó la cuenta",

  // Items Page
  "Step 3: Assign Items": "Paso 3: Asignar artículos",
  "Assign Items": "Asignar Artículos", 
  "Select who ordered each item": "Selecciona quién pidió cada artículo",
  "Bill Total:": "Total de la cuenta:",
  "Who participated in this item?": "¿Quién participó en este artículo?",
  "If no one is selected, this will be split equally among everyone": "Si no hay nadie seleccionado, se dividirá por igual entre todos",
  "After assigning items, you'll see the summary of what each person owes.": "Después de asignar artículos, verás el resumen de lo que debe cada persona.",
  "Items without assignments will be split equally among everyone.": "Los artículos sin asignaciones se dividirán por igual entre todos.",
  "Quantity:": "Cantidad:",
  "Shared": "Compartido",
  "No items found. Please go back to upload a bill.": "No se encontraron artículos. Vuelve atrás para subir una factura.",
  "Equal split (unassigned item)": "División igual (artículo sin asignar)",
  "Split among": "Dividido entre",
  "Full amount": "Cantidad completa",
  "portions remaining to assign": "porciones restantes por asignar",
  "portions OVER assigned": "porciones de MÁS asignadas",
  "portion remaining to assign": "porción restante por asignar",
  "portion OVER assigned": "porción de MÁS asignada",
  "units": "unidades",
  "each": "cada uno",
  "Counters Reset": "Contadores Reiniciados",
  "Shared mode turned off. All counters have been reset to 0.": "Modo compartido desactivado. Todos los contadores se han reiniciado a 0.",
  "Maximum Quantity Reached": "Cantidad Máxima Alcanzada",
  "You cannot assign more than": "No puedes asignar más de",
  "portions of this item per person when shared.": "porciones de este artículo por persona cuando está compartido.",
  "portions for this item.": "porciones para este artículo.",
  "Assignments Reset": "Asignaciones Reiniciadas",
  "Item quantity reduced. Assignments for": "Cantidad reducida. Las asignaciones para",
  "have been reset as assigned portions exceeded the new quantity.": "han sido reiniciadas ya que las porciones asignadas excedían la nueva cantidad.",
  "people": "personas",

  // Summary Page
  "Summary": "Resumen",
  "Step 4: Summary": "Paso 4: Resumen",
  "See who owes what to whom": "Ve quién debe cuánto a quién",
  "Bill Summary": "Resumen de la cuenta",
  "Total Bill:": "Total de la cuenta:",
  "Paid by:": "Pagado por:",
  "Who Owes What": "Quién debe cuánto",
  "to": "a",
  "Show details": "Mostrar detalles",
  "Hide details": "Ocultar detalles",
  "Item Breakdown:": "Desglose de artículos:",
  "No items assigned": "No hay artículos asignados",
  "Total": "Total",
  "Your consumption": "Tu consumo",
  "Others owe you": "Otros te deben",
  "Total paid": "Total pagado",
  "You paid the total bill amount and should collect from others.": "Has pagado el importe total de la cuenta y debes cobrar a los demás.",
  "All done!": "¡Todo listo!",
  "Everyone can now settle up with the person who paid the bill.": "Todos pueden ahora saldar cuentas con la persona que pagó.",
  "Items with no specific assignments were split equally among all participants.": "Los artículos sin asignaciones específicas se dividieron por igual entre todos los participantes.",
  "Not specified": "No especificado",
  "Unknown": "Desconocido"
};

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
  
  // Add language and currency settings
  const [language, setLanguage] = useState('es'); // Default to Spanish
  const [currencySymbol, setCurrencySymbol] = useState('€'); // Default to Euro

  // Translations object
  const translations = {
    es: spanishTranslations,
    // Add other languages here if needed in the future
  };

  // Translation helper function
  const translate = (text) => {
    if (language === 'en') return text; // English is the base language
    return translations[language][text] || text; // Fall back to the original text if no translation
  };

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
    
    // Language and currency
    language,
    setLanguage,
    currencySymbol,
    setCurrencySymbol,
    translate, // Translation helper function
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};