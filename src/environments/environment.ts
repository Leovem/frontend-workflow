// src/environments/environment.ts

export const environment = {
  production: false,

  api: {
    springBoot: 'http://localhost:8080/api',
    node: 'http://localhost:3000/api',
    fastApi: 'http://localhost:8000/api'
  },

  websocket: {
    collaboration: 'ws://localhost:1234'
  }
};