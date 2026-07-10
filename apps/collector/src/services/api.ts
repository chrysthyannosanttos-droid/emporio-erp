import axios from 'axios';

// Na fase final, essa URL virá do arquivo .env
const api = axios.create({
  baseURL: 'http://localhost:3000', 
  timeout: 10000,
});

export default api;
