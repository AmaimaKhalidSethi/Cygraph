import axios from 'axios';

// ⚠️ Agar Laptop B ya Phone se test karo toh
// localhost ki jagah Laptop A ki IP daalo
// e.g. http://192.168.1.5:5000
const BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const SOCKET_URL = BASE_URL;
export default api;