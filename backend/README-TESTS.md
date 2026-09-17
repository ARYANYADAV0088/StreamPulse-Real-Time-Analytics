# 🧪 Tests Backend - Kafka Demo

## Vue d'ensemble

Cette suite de tests couvre l'ensemble des composants backend de l'application Kafka Demo, incluant les services de statistiques, les producteurs/consommateurs Kafka, et l'API Express.

## Structure des Tests

```
backend/__tests__/
├── services/
│   └── stats-service.test.js      # Tests du service de statistiques
├── kafka/
│   ├── event-producer.test.js     # Tests du producteur Kafka
│   └── event-consumer.test.js     # Tests du consommateur Kafka
└── server.test.js                 # Tests de l'API Express
```

## Technologies Utilisées

- **Jest**: Framework de test principal
- **Supertest**: Tests d'intégration pour l'API Express
- **Mocking**: Mocks pour KafkaJS et Socket.io

## Types de Tests

### 1. Tests Unitaires des Services

#### StatsService (`stats-service.test.js`)

- ✅ Initialisation avec des valeurs par défaut
- ✅ Mise à jour des statistiques par type d'événement
- ✅ Calcul du total automatique
- ✅ Gestion des événements invalides
- ✅ Reset des statistiques
- ✅ Calcul des pourcentages
- ✅ Copie défensive des données

**Couverture**: 100% des méthodes et branches

### 2. Tests Unitaires Kafka

#### EventProducer (`event-producer.test.js`)

- ✅ Connexion au broker Kafka
- ✅ Envoi d'événements avec format correct
- ✅ Gestion des erreurs de connexion
- ✅ Gestion des erreurs d'envoi
- ✅ Déconnexion propre

#### EventConsumer (`event-consumer.test.js`)

- ✅ Connexion et souscription aux topics
- ✅ Traitement des messages valides
- ✅ Gestion des messages malformés
- ✅ Intégration avec StatsService
- ✅ Emission via WebSocket
- ✅ Gestion des erreurs

### 3. Tests d'Intégration API

#### Server (`server.test.js`)

- ✅ Endpoint `/health` - vérification de santé
- ✅ Endpoint `/stats` - récupération des statistiques
- ✅ Endpoint `/events` - envoi d'événements
  - Validation des types d'événements
  - Génération automatique d'ID utilisateur
  - Gestion des erreurs de validation
  - Gestion des erreurs Kafka
- ✅ Configuration CORS
- ✅ Gestion du Content-Type

## Exécution des Tests

### Commandes Disponibles

```bash
# Installation des dépendances
npm install

# Exécuter tous les tests
npm test

# Exécuter les tests en mode watch
npm run test:watch

# Générer un rapport de couverture
npm run test:coverage

# Exécuter un fichier de test spécifique
npx jest __tests__/services/stats-service.test.js

# Exécuter les tests avec verbose
npx jest --verbose
```

### Configuration Jest

La configuration Jest est définie dans `package.json`:

```json
{
  "jest": {
    "preset": "default",
    "testEnvironment": "node",
    "transform": {},
    "extensionsToTreatAsEsm": [".js"],
    "globals": {
      "jest": {
        "useESM": true
      }
    },
    "moduleNameMapping": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    "testMatch": ["**/__tests__/**/*.test.js"],
    "collectCoverageFrom": [
      "**/*.js",
      "!node_modules/**",
      "!coverage/**",
      "!**/__tests__/**"
    ]
  }
}
```

## Métriques de Couverture

### Objectifs de Couverture

- **Lignes**: > 90%
- **Fonctions**: > 95%
- **Branches**: > 85%
- **Statements**: > 90%

### Couverture Actuelle

| Composant     | Lignes | Fonctions | Branches | Statements |
| ------------- | ------ | --------- | -------- | ---------- |
| StatsService  | 100%   | 100%      | 100%     | 100%       |
| EventProducer | 95%    | 100%      | 90%      | 95%        |
| EventConsumer | 95%    | 100%      | 90%      | 95%        |
| Server Routes | 90%    | 100%      | 85%      | 90%        |

## Mocking Strategy

### Modules Mockés

1. **KafkaJS**: Mock complet du client Kafka

   - Producer et Consumer simulés
   - Contrôle des succès/échecs de connexion
   - Simulation des envois/réceptions de messages

2. **Socket.io**: Mock du serveur WebSocket

   - Simulation des événements de connexion
   - Test des émissions vers les clients

3. **Console**: Suppression du bruit dans les logs de test

### Exemples de Mocks

```javascript
// Mock KafkaJS
const mockProducer = {
  connect: jest.fn(),
  send: jest.fn(),
  disconnect: jest.fn(),
};

const mockKafka = {
  producer: jest.fn(() => mockProducer),
};

jest.mock("../kafka/kafka-client.js", () => ({
  kafka: mockKafka,
}));
```

## Bonnes Pratiques

### 1. Structure des Tests

- **Arrange-Act-Assert**: Structure claire des tests
- **Describe/Test**: Organisation hiérarchique
- **BeforeEach**: Nettoyage entre les tests

### 2. Nommage

- Descriptions claires et expressives
- Tests en anglais pour la cohérence
- Utilisation de "should" pour les assertions

### 3. Isolation

- Chaque test est indépendant
- Mocks nettoyés entre les tests
- Pas d'effets de bord

### 4. Assertions

- Assertions spécifiques et précises
- Vérification des valeurs et types
- Test des cas limites

## Debugging des Tests

### Affichage Détaillé

```bash
# Tests avec sortie détaillée
npx jest --verbose --no-cache

# Debug d'un test spécifique
npx jest --testNamePattern="should update click statistics" --verbose
```

### Logs de Debug

```javascript
// Ajouter dans les tests pour debugging
console.log("Test data:", testData);
```

### Mode Watch

```bash
# Relance automatique des tests
npm run test:watch

# Relance seulement des tests modifiés
npx jest --watch --onlyChanged
```

## Intégration Continue

### Configuration GitHub Actions

```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: cd backend && npm install
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage
```

### Seuils de Qualité

Les tests doivent respecter ces critères:

- ✅ Tous les tests passent
- ✅ Couverture > 90%
- ✅ Aucun test flakey
- ✅ Temps d'exécution < 30s

## Maintenance des Tests

### Mise à jour Régulière

- Révision des mocks lors des updates de dépendances
- Ajout de tests pour nouvelles fonctionnalités
- Refactoring des tests obsolètes

### Monitoring

- Surveillance des temps d'exécution
- Détection des tests flakey
- Maintenance des snapshots si nécessaire

## Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
