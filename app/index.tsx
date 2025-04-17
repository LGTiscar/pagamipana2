import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import UploadBillPage from './components/UploadBillPage';
import PeoplePage from './components/PeoplePage';
import ItemsPage from './components/ItemsPage';

const Stack = createStackNavigator();

export default function Index() {
  return (
    <Stack.Navigator initialRouteName="UploadBill">
      <Stack.Screen name="UploadBill" component={UploadBillPage} />
      <Stack.Screen name="People" component={PeoplePage} />
      <Stack.Screen name="Items" component={ItemsPage} />
    </Stack.Navigator>
  );
}
