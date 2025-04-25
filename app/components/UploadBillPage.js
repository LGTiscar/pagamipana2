import React, { useState } from 'react';
import { View, Text, Button, Image, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ReceiptProcessor from './ReceiptProcessor';

export default function UploadBillPage({ navigation }) {
  const [uploadedImagePath, setUploadedImagePath] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const receiptProcessor = new ReceiptProcessor();

  const requestPermissions = async () => {
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

    if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
      Alert.alert('Permissions Required', 'Please grant camera and photo library permissions to continue.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    console.log('pickImage function called');
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('Permissions not granted');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Image selected:', result.assets[0].uri);
        setUploadedImagePath(result.assets[0].uri);
      } else {
        console.log('Image selection canceled or no assets found');
      }
    } catch (error) {
      console.error('Error launching image picker:', error);
    }
  };

  const takePhoto = async () => {
    console.log('takePhoto function called');
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        console.log('Permissions not granted');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        console.log('Photo taken:', result.uri);
        setUploadedImagePath(result.uri);
      } else {
        console.log('Photo taking canceled');
      }
    } catch (error) {
      console.error('Error launching camera:', error);
    }
  };

  const analyzeReceipt = async () => {
    if (!uploadedImagePath) {
      Alert.alert('No Image', 'Please upload or take a photo of the bill before analyzing.');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Fetch the image as bytes
      const response = await fetch(uploadedImagePath);
      const imageBytes = await response.arrayBuffer();

      // Process the receipt
      const items = await receiptProcessor.processReceipt(imageBytes);

      console.log('Analyzed Items:', items);
      
      // Automatically navigate to the next page with the items data
      navigation.navigate('People', { items });
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      Alert.alert('Error', 'Failed to analyze the receipt. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: '25%' }]} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <Text style={[styles.tab, styles.activeTab]}>Upload Bill</Text>
          <Text style={styles.tab}>Add People</Text>
          <Text style={styles.tab}>Assign Items</Text>
          <Text style={styles.tab}>Summary</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Step 1: Upload Your Bill</Text>
        <Text style={styles.subtitle}>Upload an image of your restaurant bill</Text>

        {/* Image Upload Section */}
        <View style={styles.uploadContainer}>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>Select Image</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={takePhoto}>
            <Text style={styles.uploadButtonText}>Take Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        <View style={styles.imagePreviewContainer}>
          {uploadedImagePath ? (
            <Image source={{ uri: uploadedImagePath }} style={styles.imagePreview} />
          ) : (
            <Text style={styles.imagePlaceholder}>Your bill preview will appear here</Text>
          )}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.analyzeButtonContainer}>
          <TouchableOpacity 
            style={[styles.analyzeButton, isProcessing && styles.disabledButton]} 
            onPress={analyzeReceipt}
            disabled={isProcessing}
          >
            <Text style={styles.analyzeButtonText}>
              {isProcessing ? 'Processing...' : 'Analyze'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.nextButtonContainer}>
          <TouchableOpacity style={styles.nextNavigationButton} onPress={() => navigation.navigate('People')}>
            <Text style={styles.nextNavigationButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>

        {/* OCR Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>OCR Scanning Tips:</Text>
          <Text>1. Ensure the bill is well-lit and the text is clearly visible</Text>
          <Text>2. Avoid shadows and glare on the receipt</Text>
          <Text>3. Make sure the entire bill is in the frame</Text>
          <Text>4. Hold the camera steady to avoid blurry images</Text>
          <Text>5. If scanning fails, try adjusting the lighting or use the demo data</Text>
          <Text>6. You can always manually add or edit items after processing</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#E8F5E9', alignItems: 'center' },
  progressBarContainer: { width: '100%', height: 10, backgroundColor: '#C8E6C9', marginBottom: 20, borderRadius: 5 },
  progressBar: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 5 },
  tabsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, width: '100%' },
  tab: { fontSize: 16, color: '#757575' },
  activeTab: { fontWeight: 'bold', color: '#4CAF50' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#757575', marginBottom: 20, textAlign: 'center' },
  uploadContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, width: '100%' },
  uploadButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 5, alignItems: 'center', width: '40%' },
  uploadButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  imagePreviewContainer: { alignItems: 'center', marginBottom: 20, width: '100%' },
  imagePreview: { width: 250, height: 250, borderRadius: 10, marginBottom: 10 },
  imagePlaceholder: { color: '#BDBDBD', fontStyle: 'italic', textAlign: 'center' },
  tipsContainer: { padding: 15, backgroundColor: '#F1F8E9', borderRadius: 5, marginBottom: 20, width: '100%' },
  tipsTitle: { fontWeight: 'bold', marginBottom: 5, fontSize: 16 },
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  nextNavigationButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  nextNavigationButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  analyzeButtonContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  nextButtonContainer: {
    alignItems: 'flex-end',
    marginTop: 20,
    width: '100%',
  },
  nextNavigationButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  nextNavigationButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
});