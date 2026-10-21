import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
// Electron already ships the app shell; reserve offline service workers for the website.
if('serviceWorker' in navigator&&!/Electron\//i.test(navigator.userAgent))window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
