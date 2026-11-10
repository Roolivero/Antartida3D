import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans/index.css'
import '@fontsource/libre-caslon-display/latin.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
