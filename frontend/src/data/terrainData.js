// src/data/terrainData.js

export const soilMoistureData = [
  { time: '00:00', moisture: 68, threshold: 75 },
  { time: '02:00', moisture: 71, threshold: 75 },
  { time: '04:00', moisture: 74, threshold: 75 },
  { time: '06:00', moisture: 78, threshold: 75 },
  { time: '08:00', moisture: 80, threshold: 75 },
  { time: '10:00', moisture: 82, threshold: 75 },
  { time: '12:00', moisture: 79, threshold: 75 },
  { time: '14:00', moisture: 83, threshold: 75 },
  { time: '16:00', moisture: 86, threshold: 75 },
  { time: '18:00', moisture: 84, threshold: 75 },
  { time: '20:00', moisture: 81, threshold: 75 },
  { time: '22:00', moisture: 77, threshold: 75 },
]

export const slopeStabilityData = [
  { zone: 'Zone A', stability: 78, risk: 22 },
  { zone: 'Zone B', stability: 55, risk: 45 },
  { zone: 'Zone C', stability: 34, risk: 66 },
  { zone: 'Zone D', stability: 41, risk: 59 },
  { zone: 'Zone E', stability: 67, risk: 33 },
  { zone: 'Zone F', stability: 82, risk: 18 },
]

export const geologicalZones = [
  {
    id: 1,
    name: 'Sahyadri Ridge Zone',
    risk: 'HIGH',
    riskLevel: 78,
    color: '#ef4444',
    slope: '38°',
    moisture: '82%',
    soilType: 'Laterite',
  },
  {
    id: 2,
    name: 'Coastal Slope Area',
    risk: 'LOW',
    riskLevel: 28,
    color: '#22c55e',
    slope: '14°',
    moisture: '61%',
    soilType: 'Alluvial',
  },
  {
    id: 3,
    name: 'Urban Hill Station',
    risk: 'CRITICAL',
    riskLevel: 92,
    color: '#7c3aed',
    slope: '42°',
    moisture: '91%',
    soilType: 'Black Cotton',
  },
  {
    id: 4,
    name: 'Deccan Plateau Edge',
    risk: 'MEDIUM',
    riskLevel: 54,
    color: '#f59e0b',
    slope: '26°',
    moisture: '73%',
    soilType: 'Red Sandy',
  },
]

export const mlPredictions = [
  { model: 'Random Forest',    accuracy: 94.2, prediction: 'HIGH RISK',   confidence: 89 },
  { model: 'LSTM Neural Net',  accuracy: 96.5, prediction: 'HIGH RISK',   confidence: 93 },
  { model: 'SVM Classifier',   accuracy: 91.3, prediction: 'MEDIUM RISK', confidence: 76 },
  { model: 'Gradient Boost',   accuracy: 95.1, prediction: 'HIGH RISK',   confidence: 91 },
]
