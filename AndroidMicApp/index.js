/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';


AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('HoldDataTransferTask', () => MyHeadlessTask);
const MyHeadlessTask = async (taskData) => {
  
  console.log('Headless task running with data:', taskData);

  
};
