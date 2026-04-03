import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './app/App';
import './styles/globals.css';

// Inject store/client/user headers into every fetch call (skip truly external URLs like Cloudinary)
import API_BASE from './config';
const _nativeFetch = window.fetch.bind(window);
window.fetch = function (resource, options = {}) {
  const url = typeof resource === 'string' ? resource : resource?.url ?? '';
  const isApiCall = url.startsWith(window.location.origin) || url.includes('localhost:8080') || url.startsWith(API_BASE);
  if (url.startsWith('http') && !isApiCall) {
    return _nativeFetch(resource, options);
  }
  const headers = new Headers(options.headers || {});

  let storeId = null;
  try {
    const u = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
    const storeKey = `currentStore_${u?.id ?? 'guest'}`;
    storeId = localStorage.getItem(storeKey);
  } catch (e) { /* ignore */ }
  const clientId = localStorage.getItem('currentClient');

  if (storeId  && !headers.has('X-Store-Id'))  headers.set('X-Store-Id',  storeId);
  if (clientId && !headers.has('X-Client-Id')) headers.set('X-Client-Id', clientId);

  try {
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null');
    if (user && user.role && !headers.has('X-User-Role')) headers.set('X-User-Role', user.role);
    if (user && user.username && !headers.has('X-Username')) headers.set('X-Username', user.username);
  } catch (e) { /* ignore */ }

  return _nativeFetch(resource, { ...options, headers });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
