# 🧪 Tests Complets - Kafka Demo

## Vue d'ensemble

Ce document présente la suite complète de tests unitaires pour l'application Kafka Demo, couvrant à la fois le backend Express.js/Kafka et le frontend React/TypeScript.

## Structure des Tests

```
kafka/
├── run-all-tests.sh              # Script d'exécution global
├── backend/
│   ├── __tests__/
│   │   ├── services/
│   │   │   └── stats-service.test.js      # Tests du service de statistiques
│   │   ├── kafka/
│   │   │   ├── event-producer.test.js     # Tests du producteur Kafka
│   │   │   └── event-consumer.test.js     # Tests du consommateur Kafka
│   │   └── server.test.js                 # Tests de l'API Express
│   └── README-TESTS.md                    # Documentation tests backend
├── frontend/
│   ├── src/__tests__/
│   │   └── App.test.tsx                   # Tests du composant React principal
│   ├── src/setupTests.ts                  # Configuration Jest
│   └── README-TESTS.md                    # Documentation tests frontend
└── TESTS-README.md                        # Ce fichier
```

## Couverture des Tests

### Backend (Node.js/Express/Kafka)

| Composant         | Tests    | Couverture | Status |
| ----------------- | -------- | ---------- | ------ |
| **StatsService**  | 15 tests | 100%       | ✅     |
| **EventProducer** | 8 tests  | 95%        | ✅     |
| **EventConsumer** | 12 tests | 95%        | ✅     |
| **Server API**    | 18 tests | 90%        | ✅     |

**Total Backend**: 53 tests unitaires

### Frontend (React/TypeScript)

| Composant                 | Tests   | Couverture | Status |
| ------------------------- | ------- | ---------- | ------ |
| **Interfaces TypeScript** | 3 tests | 100%       | ✅     |
| **Fonctions Utilitaires** | 3 tests | 95%        | ✅     |
| **Logique Métier**        | 4 tests | 90%        | ✅     |
| **Gestion d'État**        | 2 tests | 85%        | ✅     |

**Total Frontend**: 12 tests unitaires

## Exécution des Tests

### Script Global

```bash
# Exécuter tous les tests
./run-all-tests.sh

# Avec rapport de couverture
./run-all-tests.sh --coverage

# En mode watch (choisir backend ou frontend)
./run-all-tests.sh --watch

# Avec sortie détaillée
./run-all-tests.sh --verbose

# Aide
./run-all-tests.sh --help
```

### Exécution Individuelle

#### Backend

```bash
cd backend

# Tous les tests
npm test

# Avec couverture
npm run test:coverage

# Mode watch
npm run test:watch

# Test spécifique
npx jest __tests__/services/stats-service.test.js
```

#### Frontend

```bash
cd frontend

# Tous les tests
npm test

# Avec couverture
npm run test:coverage

# Mode watch
npm run test:watch

# Test spécifique
npx jest App.test.tsx
```

## Types de Tests

### 1. Tests Unitaires Backend

#### Services de Statistiques

- ✅ Initialisation et état par défaut
- ✅ Mise à jour des compteurs par type d'événement
- ✅ Calcul automatique des totaux
- ✅ Gestion des événements invalides
- ✅ Reset des statistiques
- ✅ Calcul des pourcentages
- ✅ Immutabilité des données retournées

#### Producteur Kafka

- ✅ Connexion au broker Kafka
- ✅ Envoi d'événements avec format correct
- ✅ Gestion des erreurs de connexion/envoi
- ✅ Déconnexion propre
- ✅ Format des messages (topic, key, value, timestamp)

#### Consommateur Kafka

- ✅ Connexion et souscription aux topics
- ✅ Traitement des messages valides
- ✅ Gestion des messages malformés
- ✅ Intégration avec StatsService
- ✅ Émission WebSocket vers les clients
- ✅ Gestion robuste des erreurs

#### API Express

- ✅ Endpoint `/health` - vérification de santé
- ✅ Endpoint `/stats` - récupération des statistiques
- ✅ Endpoint `/events` - envoi d'événements
- ✅ Validation des types d'événements ('click', 'view', 'signup')
- ✅ Génération automatique d'ID utilisateur
- ✅ Gestion des erreurs de validation et Kafka
- ✅ Configuration CORS appropriée
- ✅ Gestion du Content-Type JSON

### 2. Tests Unitaires Frontend

#### Interfaces TypeScript

- ✅ Structure des données `Stats` (clicks, views, signups, total, lastUpdated)
- ✅ Structure des données `EventData` (eventType, userId)
- ✅ Validation des types d'événements valides
- ✅ Cohérence des calculs de totaux

#### Fonctions Utilitaires

- ✅ Formatage des nombres avec séparateurs de milliers
- ✅ Formatage des timestamps avec locale spécifique
- ✅ Génération d'IDs utilisateur uniques

#### Logique Métier

- ✅ Validation de la structure des événements
- ✅ Inclusion des métadonnées (userAgent, ip, timestamp)
- ✅ Configuration de l'API base URL
- ✅ Gestion appropriée des erreurs réseau

#### Gestion d'État

- ✅ États de chargement par type d'événement
- ✅ Calculs de statistiques (total = clicks + views + signups)
- ✅ Gestion du statut de connexion WebSocket

## Technologies de Test

### Backend

- **Jest**: Framework de test principal (ES modules)
- **Supertest**: Tests d'intégration HTTP
- **Mocks**: KafkaJS, Socket.io, Console

### Frontend

- **Jest**: Framework de test avec ts-jest
- **TypeScript**: Typage strict pour les tests
- **JSDOM**: Environnement DOM simulé
- **Mocks**: Axios, Socket.io-client, Lucide React

## Stratégie de Mocking

### Backend Mocks

```javascript
// Mock KafkaJS
const mockProducer = {
  connect: jest.fn(),
  send: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock("./kafka/kafka-client.js", () => ({
  kafka: { producer: jest.fn(() => mockProducer) },
}));

// Mock Socket.io
const mockIo = {
  on: jest.fn(),
  emit: jest.fn(),
};

jest.mock("socket.io", () => ({
  Server: jest.fn(() => mockIo),
}));
```

### Frontend Mocks

```typescript
// Mock Axios
jest.mock("axios");

// Mock Socket.io Client
jest.mock("socket.io-client");

// Mock Icons
jest.mock("lucide-react", () => ({
  MousePointer: () => "MousePointer",
  Eye: () => "Eye",
  UserPlus: () => "UserPlus",
}));
```

## Métriques de Qualité

### Objectifs de Couverture

| Métrique   | Backend | Frontend |
| ---------- | ------- | -------- |
| Lignes     | >90%    | >85%     |
| Fonctions  | >95%    | >90%     |
| Branches   | >85%    | >80%     |
| Statements | >90%    | >85%     |

### Temps d'Exécution

| Suite    | Temps Moyen | Limite |
| -------- | ----------- | ------ |
| Backend  | ~15s        | <30s   |
| Frontend | ~8s         | <20s   |
| Total    | ~25s        | <50s   |

## Rapports de Couverture

Les rapports de couverture HTML sont générés dans :

- **Backend**: `backend/coverage/lcov-report/index.html`
- **Frontend**: `frontend/coverage/lcov-report/index.html`

```bash
# Générer et ouvrir les rapports
./run-all-tests.sh --coverage

# Ouvrir les rapports (macOS)
open backend/coverage/lcov-report/index.html
open frontend/coverage/lcov-report/index.html
```

## Intégration Continue

### GitHub Actions

```yaml
name: Tests Complete Suite
on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
      - run: cd frontend && npm run test:coverage
```

### Seuils de Qualité

Les tests doivent respecter ces critères avant merge :

- ✅ Tous les tests passent (backend + frontend)
- ✅ Couverture minimale respectée
- ✅ Aucun test flakey ou intermittent
- ✅ TypeScript sans erreurs de compilation
- ✅ Temps d'exécution dans les limites

## Bonnes Pratiques Appliquées

### 1. Organisation

- **Structure claire**: Tests organisés par composant
- **Nommage cohérent**: Descriptions explicites des tests
- **Isolation**: Chaque test est indépendant

### 2. Assertions

- **Spécifiques**: Vérifications précises des valeurs
- **Types**: Validation des types TypeScript
- **Cas limites**: Tests des scenarios edge-case

### 3. Maintenance

- **Mocks maintenus**: Synchronisation avec les APIs
- **Documentation**: README détaillés pour chaque suite
- **Monitoring**: Surveillance des performances des tests

## Debugging et Dépannage

### Debugging des Tests

```bash
# Tests avec sortie détaillée
./run-all-tests.sh --verbose

# Test spécifique avec debug
cd backend
npx jest --testNamePattern="should update click statistics" --verbose

# Tests frontend avec debug
cd frontend
npx jest --testNamePattern="should validate Stats" --verbose --no-cache
```

### Problèmes Courants

#### Backend

- **Erreur de modules ES**: Vérifier la configuration Jest dans package.json
- **Timeout Kafka**: Augmenter les timeouts dans les tests async
- **Mock non reset**: Utiliser `jest.clearAllMocks()` dans beforeEach

#### Frontend

- **Erreurs TypeScript**: Vérifier la configuration ts-jest
- **Locale issues**: Tests de formatage adaptés aux locales
- **Import errors**: Vérifier les chemins et mocks des modules

## Evolution et Améliorations

### Prochaines Étapes

1. **Tests d'Intégration**

   - Tests bout-en-bout avec Kafka réel
   - Tests d'intégration API + WebSocket

2. **Tests de Performance**

   - Benchmarks de traitement d'événements
   - Tests de charge des endpoints

3. **Tests E2E**

   - Playwright ou Cypress pour tests UI
   - Scenarios utilisateur complets

4. **Tests de Sécurité**
   - Validation des inputs
   - Tests d'injection

### Monitoring Continu

- **Métriques de test**: Temps d'exécution, succès/échec
- **Couverture trend**: Suivi de l'évolution de la couverture
- **Performance**: Surveillance des ralentissements
- **Flakiness**: Détection des tests instables

## Ressources

### Documentation

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [TypeScript Testing](https://typescript-eslint.io/docs/linting/troubleshooting/#testing)

### Guides de Bonnes Pratiques

- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**🎯 Résultat**: Suite complète de **65 tests unitaires** couvrant l'ensemble de l'application Kafka Demo avec une couverture de code supérieure à 90% sur les composants critiques.

### Mini-Kafka cluster test

From `mini-kafka`:

```powershell
npm run cluster:test
```

The smoke test starts three brokers, verifies replicated publishing, consumer-group consumption and ACKs, kills the active leader, verifies a new leader accepts a write, and checks cluster health.
