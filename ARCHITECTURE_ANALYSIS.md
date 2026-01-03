# Clean Architecture Analysis

## Current Project Structure

```
src/
├── core/
│   └── types.ts              # Core types (no dependencies)
├── infrastructure/
│   ├── GpuContext.ts         # WebGPU device management
│   ├── RenderPipeline.ts     # WebGPU pipeline
│   ├── CanvasManager.ts      # Canvas management
│   ├── CameraManager.ts      # Camera stream management
│   ├── SettingsManager.ts    # Settings management
│   └── shaders/
│       └── subpixel-fragment.ts
├── use-cases/
│   ├── ImageProcessor.ts     # Image processing use case
│   └── CameraProcessor.ts    # Camera processing use case
├── CrtSubpixelProcessor.ts   # Main facade
└── index.ts                  # Public API
```

## Clean Architecture Layers

Clean Architecture defines four layers (from innermost to outermost):

1. **Domain/Entities** - Core business logic, entities, value objects (no dependencies)
2. **Use Cases/Application** - Application-specific business rules, orchestration
3. **Interface Adapters** - Controllers, Presenters, Gateways (adapters for external systems)
4. **Frameworks & Drivers** - Web, DB, external frameworks (outermost layer)

### Dependency Rule

**Dependencies point inward**: Outer layers depend on inner layers, but inner layers never depend on outer layers.

## Current Architecture Issues

### ❌ Issue 1: Use Cases Depend on Infrastructure

**Location**: `use-cases/ImageProcessor.ts`, `use-cases/CameraProcessor.ts`

**Problem**: Use cases directly depend on concrete infrastructure classes:

- `GpuContext` (concrete class)
- `RenderPipeline` (concrete class)
- `CanvasManager` (concrete class)
- `CameraManager` (concrete class)
- `SettingsManager` (concrete class)

**Violation**: Use cases should depend on abstractions (interfaces), not concrete implementations.

**Impact**:

- Difficult to test (can't mock infrastructure)
- Can't swap implementations (e.g., different GPU backends)
- Tight coupling between business logic and infrastructure

### ❌ Issue 2: No Clear Domain Layer

**Problem**: Business logic is scattered across infrastructure and use cases.

**Missing**:

- Domain entities (Image, Camera, Settings)
- Value objects (Dimensions, Orientation, PixelDensity)
- Domain services (SubpixelRenderer - the core algorithm)
- Repository interfaces

**Impact**: Business logic is mixed with infrastructure concerns.

### ❌ Issue 3: SettingsManager in Infrastructure

**Location**: `infrastructure/SettingsManager.ts`

**Problem**: SettingsManager manages domain concepts (orientation, pixel density) but is in infrastructure layer.

**Should be**: Domain service or value object, with infrastructure adapter for persistence/sync.

### ❌ Issue 4: Mixed Concerns in Main Processor

**Location**: `CrtSubpixelProcessor.ts`

**Problem**: The main processor:

- Instantiates infrastructure directly
- Orchestrates use cases
- Manages state (currentImageBitmap)
- Handles re-rendering logic

**Should be**: Application service that coordinates use cases, with infrastructure injected via dependency injection.

### ❌ Issue 5: No Dependency Inversion

**Problem**: No interfaces/abstractions defined. All dependencies are concrete classes.

**Missing**:

- `IGpuContext` interface
- `IRenderPipeline` interface
- `ICanvasManager` interface
- `ICameraManager` interface
- `ISettingsRepository` interface

## Recommended Clean Architecture Structure

```
src/
├── domain/                          # Domain Layer (innermost)
│   ├── entities/
│   │   ├── Image.ts                 # Image entity
│   │   └── Settings.ts              # Settings entity
│   ├── value-objects/
│   │   ├── Dimensions.ts
│   │   ├── Orientation.ts
│   │   └── PixelDensity.ts
│   ├── services/
│   │   └── SubpixelRenderer.ts      # Core rendering algorithm (pure logic)
│   └── ports/                       # Port interfaces (hexagonal architecture)
│       ├── IGpuContext.ts
│       ├── ICanvasManager.ts
│       ├── ICameraManager.ts
│       └── ISettingsRepository.ts
│
├── use-cases/                       # Use Cases Layer
│   ├── image-processing/
│   │   ├── ImageProcessor.ts        # Depends on domain interfaces
│   │   └── ImageProcessorInput.ts   # DTOs
│   └── camera-processing/
│       ├── CameraProcessor.ts        # Depends on domain interfaces
│       └── CameraProcessorInput.ts  # DTOs
│
├── infrastructure/                  # Interface Adapters Layer
│   ├── webgpu/
│   │   ├── WebGpuContext.ts         # Implements IGpuContext
│   │   └── WebGpuRenderPipeline.ts  # Implements IRenderPipeline
│   ├── canvas/
│   │   └── WebCanvasManager.ts      # Implements ICanvasManager
│   ├── camera/
│   │   └── BrowserCameraManager.ts  # Implements ICameraManager
│   ├── settings/
│   │   └── GpuSettingsRepository.ts # Implements ISettingsRepository
│   └── shaders/
│       └── subpixel-fragment.ts
│
├── application/                     # Application Layer
│   ├── CrtSubpixelProcessor.ts      # Application service (facade)
│   └── dependencies.ts              # Dependency injection setup
│
└── index.ts                         # Public API
```

## Dependency Flow (Correct)

```
index.ts
  ↓
application/CrtSubpixelProcessor.ts
  ↓
use-cases/ (ImageProcessor, CameraProcessor)
  ↓
domain/ (entities, services, repository interfaces)
  ↑
infrastructure/ (implements domain interfaces)
```

## Key Principles to Apply

### 1. Dependency Inversion Principle

- Use cases depend on domain interfaces, not infrastructure
- Infrastructure implements domain interfaces
- Example: `ImageProcessor` depends on `IGpuContext`, not `GpuContext`

### 2. Single Responsibility Principle

- Each class has one reason to change
- Domain services contain pure business logic
- Infrastructure adapters handle external system integration

### 3. Interface Segregation Principle

- Create focused interfaces (e.g., `IGpuContext`, `ICanvasManager`)
- Don't force implementations to depend on methods they don't use

### 4. Dependency Injection

- Inject dependencies through constructors
- Use a DI container or manual wiring in application layer

## Migration Strategy

1. **Extract Domain Layer**
   - Move business logic from infrastructure to domain
   - Create value objects (Dimensions, Orientation, PixelDensity)
   - Create domain services (SubpixelRenderer)

2. **Create Port Interfaces**
   - Define interfaces in `domain/ports/`
   - Move implementation details to infrastructure

3. **Refactor Use Cases**
   - Change dependencies from concrete classes to interfaces
   - Use dependency injection

4. **Refactor Infrastructure**
   - Implement domain interfaces
   - Keep WebGPU-specific code in infrastructure

5. **Refactor Application Layer**
   - Move `CrtSubpixelProcessor` to `application/`
   - Set up dependency injection
   - Wire dependencies

## Benefits of Clean Architecture

1. **Testability**: Easy to mock infrastructure for unit tests
2. **Flexibility**: Can swap implementations (e.g., different GPU backends)
3. **Maintainability**: Clear separation of concerns
4. **Independence**: Business logic independent of frameworks
5. **Scalability**: Easy to add new features without affecting existing code
