// src/environments/environment.prod.ts

export const environment = {
  production: true,

  api: {
    springBoot: 'https://backend-workflow-0rk7.onrender.com/api',
    fastApi: 'https://workflow-ai-service.onrender.com',
    node: 'https://workflow-collaboration.onrender.com/api'
  },

  websocket: {
    collaboration: 'wss://workflow-collaboration.onrender.com'
  }
};