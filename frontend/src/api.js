import axios from 'axios';
export const authApi = axios.create({
baseURL: 'http://localhost:4001/api/auth'
});
export const studentApi = axios.create({
baseURL: 'http://localhost:4002/api/students'
});
export const gradeApi = axios.create({
baseURL: 'http://localhost:4003/api'
});
export const notificationApi = axios.create({
baseURL: 'http://localhost:4004/api'
});
export function attachToken(api) {
api.interceptors.request.use((config) => {
const token = localStorage.getItem('token');
if (token) {
config.headers.Authorization = `Bearer ${token}`;
}
return config;
});
}
attachToken(authApi);
attachToken(studentApi);
attachToken(gradeApi);
attachToken(notificationApi);