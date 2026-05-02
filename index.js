// index.js
import './polyfill'
import 'expo-router/entry'
import { registerWidgetTaskHandler } from 'react-native-android-widget'
import portfolioWidgetTaskHandler from './src/widgets/portfolioWidgetTaskHandler'

registerWidgetTaskHandler(portfolioWidgetTaskHandler)
