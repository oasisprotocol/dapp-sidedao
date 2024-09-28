import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import { setAnimationPolicy } from './components/Animations'
import { allowedAnimations } from './constants/config'

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)

setAnimationPolicy({ id: 'allow', allow: allowedAnimations })
