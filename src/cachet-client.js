import axios from 'axios';

export class CachetClient {
  constructor(baseUrl, apiToken = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remover slash final
    this.apiToken = apiToken;
    
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.apiToken && { 'Authorization': `Bearer ${this.apiToken}` })
      },
      timeout: 10000
    });
  }

  // ===============================
  // MÉTODOS DE COMPONENTES
  // ===============================

  async getComponents() {
    try {
      const response = await this.client.get('/components');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo componentes:', error.message);
      return null;
    }
  }

  async createComponent(name, description = '', status = 1) {
    try {
      const componentData = {
        name: name,
        description: description,
        status: status, // 1 = Operational, 2 = Performance Issues, 3 = Partial Outage, 4 = Major Outage
        enabled: true
      };

      const response = await this.client.post('/components', componentData);
      console.log(`✅ Componente '${name}' creado en Cachet`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error creando componente '${name}':`, error.response?.data || error.message);
      return null;
    }
  }

  async updateComponentStatus(componentId, status, name = null) {
    try {
      const updateData = { status };
      if (name) updateData.name = name;

      const response = await this.client.put(`/components/${componentId}`, updateData);
      
      const statusText = this.getStatusText(status);
      console.log(`🔄 Componente ${componentId} actualizado: ${statusText}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error actualizando componente ${componentId}:`, error.response?.data || error.message);
      return null;
    }
  }

  // ===============================
  // MÉTODOS DE INCIDENTES
  // ===============================

  async createIncident(name, message, status = 1, componentId = null) {
    try {
      const incidentData = {
        name: name,
        message: message,
        status: status, // 1 = Investigating, 2 = Identified, 3 = Watching, 4 = Fixed
        visible: 1,
        component_id: componentId,
        stickied: false,
        notifications: true
      };

      const response = await this.client.post('/incidents', incidentData);
      console.log(`🚨 Incidente '${name}' creado en Cachet`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error creando incidente '${name}':`, error.response?.data || error.message);
      return null;
    }
  }

  async updateIncident(incidentId, status, message = null) {
    try {
      const updateData = { status };
      if (message) updateData.message = message;

      const response = await this.client.put(`/incidents/${incidentId}`, updateData);
      
      const statusText = this.getIncidentStatusText(status);
      console.log(`🔄 Incidente ${incidentId} actualizado: ${statusText}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error actualizando incidente ${incidentId}:`, error.response?.data || error.message);
      return null;
    }
  }

  async resolveIncident(incidentId, message = 'Problema resuelto') {
    return this.updateIncident(incidentId, 4, message); // 4 = Fixed
  }

  // ===============================
  // MÉTODOS DE ESTADO GENERAL
  // ===============================

  async getSystemStatus() {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado del sistema:', error.message);
      return null;
    }
  }

  // ===============================
  // MÉTODOS DE MÉTRICAS
  // ===============================

  async createMetric(name, suffix, description = '', defaultValue = 0) {
    try {
      const metricData = {
        name: name,
        suffix: suffix,
        description: description,
        default_value: defaultValue,
        calc_type: 1, // 1 = Sum, 2 = Average
        display_chart: true
      };

      const response = await this.client.post('/metrics', metricData);
      console.log(`📊 Métrica '${name}' creada en Cachet`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error creando métrica '${name}':`, error.response?.data || error.message);
      return null;
    }
  }

  async addMetricPoint(metricId, value, timestamp = null) {
    try {
      const pointData = {
        value: value,
        timestamp: timestamp || Math.floor(Date.now() / 1000)
      };

      const response = await this.client.post(`/metrics/${metricId}/points`, pointData);
      return response.data;
    } catch (error) {
      console.error(`❌ Error agregando punto a métrica ${metricId}:`, error.response?.data || error.message);
      return null;
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  getStatusText(status) {
    const statusMap = {
      1: 'Operacional',
      2: 'Problemas de Rendimiento', 
      3: 'Interrupción Parcial',
      4: 'Interrupción Mayor'
    };
    return statusMap[status] || `Estado ${status}`;
  }

  getIncidentStatusText(status) {
    const statusMap = {
      1: 'Investigando',
      2: 'Identificado',
      3: 'Monitoreando',
      4: 'Resuelto'
    };
    return statusMap[status] || `Estado ${status}`;
  }

  // ===============================
  // INTEGRACIÓN CON MONITOR
  // ===============================

  async syncSiteStatus(siteName, isOnline, responseTime = null, errorMessage = null) {
    try {
      // Buscar componente existente
      const components = await this.getComponents();
      let component = null;
      
      if (components?.data) {
        component = components.data.find(c => 
          c.attributes.name === siteName || 
          c.attributes.name.includes(siteName)
        );
      }

      // Crear componente si no existe
      if (!component && this.apiToken) {
        const newComponent = await this.createComponent(
          siteName,
          `Monitoreo automático de ${siteName}`,
          isOnline ? 1 : 4
        );
        if (newComponent?.data) {
          component = newComponent.data;
        }
      }

      // Actualizar estado del componente
      if (component && this.apiToken) {
        const newStatus = isOnline ? 1 : 4;
        await this.updateComponentStatus(component.id, newStatus);

        // Crear incidente si hay problemas
        if (!isOnline && errorMessage) {
          await this.createIncident(
            `Problema en ${siteName}`,
            `Error detectado: ${errorMessage}`,
            1, // Investigating
            component.id
          );
        }
      }

      // Agregar métrica de tiempo de respuesta si está disponible
      if (responseTime && this.apiToken) {
        // Esto requeriría crear la métrica previamente
        // await this.addMetricPoint(metricId, responseTime);
      }

      return component;
    } catch (error) {
      console.error(`❌ Error sincronizando estado de ${siteName}:`, error.message);
      return null;
    }
  }

  async generateStatusReport(monitorResults) {
    try {
      const totalSites = monitorResults.length;
      const onlineSites = monitorResults.filter(r => r.success).length;
      const offlineSites = totalSites - onlineSites;
      
      const report = {
        timestamp: new Date().toISOString(),
        overview: {
          total: totalSites,
          online: onlineSites,
          offline: offlineSites,
          uptime: ((onlineSites / totalSites) * 100).toFixed(1) + '%'
        },
        sites: monitorResults.map(result => ({
          name: result.site,
          url: result.url,
          status: result.success ? 'online' : 'offline',
          error: result.error || null,
          responseTime: result.stats?.loadTime || null,
          lastChecked: result.timestamp
        }))
      };

      console.log(`📊 Reporte Cachet generado: ${report.overview.uptime} uptime`);
      return report;
    } catch (error) {
      console.error('❌ Error generando reporte Cachet:', error.message);
      return null;
    }
  }
} 