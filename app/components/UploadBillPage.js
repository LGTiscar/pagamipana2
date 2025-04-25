import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import ReceiptProcessor from './ReceiptProcessor';
import { useRouter } from 'expo-router';

export default function UploadBillPage() {
  const router = useRouter();
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log('Photo taken:', result.assets[0].uri);
        setUploadedImagePath(result.assets[0].uri);
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
      
      // Reset processing state before navigation
      setIsProcessing(false);
      
      // Use router instead of navigation
      router.push({
        pathname: '/components/PeoplePage',
        params: { items: JSON.stringify(items) }
      });
    } catch (error) {
      console.error('Error analyzing receipt:', error);
      Alert.alert('Error', 'Failed to analyze the receipt. Please try again.');
      // Make sure to reset processing state on error
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '25%' }]} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Upload Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/PeoplePage')}>
          <Text style={styles.tabText}>Add People</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/ItemsPage')}>
          <Text style={styles.tabText}>Assign Items</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => router.push('/components/SummaryPage')}>
          <Text style={styles.tabText}>Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={styles.title}>Step 1: Upload Your Bill</Text>
      <Text style={styles.subtitle}>Upload an image of your restaurant bill</Text>

      {/* Image Upload Cards */}
      <View style={styles.uploadCardContainer}>
        <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
          <View style={styles.uploadIconContainer}>
            <Text style={styles.uploadIcon}>🖼️</Text>
          </View>
          <Text style={styles.uploadCardTitle}>Gallery</Text>
          <Text style={styles.uploadCardSubtitle}>Select from your photos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadCard} onPress={takePhoto}>
          <View style={styles.uploadIconContainer}>
            <Text style={styles.uploadIcon}>📷</Text>
          </View>
          <Text style={styles.uploadCardTitle}>Camera</Text>
          <Text style={styles.uploadCardSubtitle}>Take a photo now</Text>
        </TouchableOpacity>
      </View>

      {/* Image Preview */}
      {uploadedImagePath ? (
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Bill Preview</Text>
            <TouchableOpacity onPress={() => setUploadedImagePath(null)}>
              <Text style={styles.removeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          <Image source={{ uri: uploadedImagePath }} style={styles.imagePreview} />
          
          {/* Analyze Button */}
          <TouchableOpacity 
            style={[styles.analyzeButton, isProcessing && styles.disabledButton]} 
            onPress={analyzeReceipt}
            disabled={isProcessing}
          >
            <Text style={styles.analyzeButtonText}>
              {isProcessing ? 'Processing...' : 'Analyze Receipt'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noImageContainer}>
          <Text style={styles.noImageText}>Your bill preview will appear here</Text>
        </View>
      )}

      {/* OCR Tips */}
      <View style={styles.instructionsBox}>
        <Text style={styles.instructionsTitle}>OCR Scanning Tips:</Text>
        <View style={styles.tipsList}>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>1.</Text>
            <Text style={styles.tipText}>Ensure the bill is well-lit and text is clearly visible</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>2.</Text>
            <Text style={styles.tipText}>Avoid shadows and glare on the receipt</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>3.</Text>
            <Text style={styles.tipText}>Make sure the entire bill is in the frame</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipNumber}>4.</Text>
            <Text style={styles.tipText}>Hold the camera steady to avoid blurry images</Text>
          </View>
        </View>
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
  uploadCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  uploadCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 26,
  },
  uploadCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 4,
  },
  uploadCardSubtitle: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  removeButton: {
    fontSize: 18,
    color: '#B0BEC5',
    padding: 5,
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
  },
  analyzeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  noImageContainer: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noImageText: {
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
  instructionsBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976D2',
  },
  tipsList: {
    marginLeft: 5,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipNumber: {
    fontWeight: 'bold',
    color: '#1976D2',
    marginRight: 5,
    width: 15,
  },
  tipText: {
    color: '#455A64',
    flex: 1,
  },
});