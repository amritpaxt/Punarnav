import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import LocalApp from './LocalApp';
import AwsApp from './AwsApp';
const App = import.meta.env.VITE_BACKEND === 'aws' ? AwsApp : LocalApp;
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
