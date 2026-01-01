# Architecture Diagrams

## Current Architecture (Issues)

```
┌─────────────────────────────────────────────────────────────┐
│                    CrtSubpixelProcessor                      │
│                  (Application Facade)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌────────▼────────┐
│ ImageProcessor │            │ CameraProcessor │
│  (Use Case)    │            │   (Use Case)    │
└───────┬────────┘            └────────┬────────┘
        │                               │
        │  ❌ Direct dependencies on    │
        │     concrete infrastructure   │
        │                               │
┌───────▼───────────────────────────────▼────────┐
│           Infrastructure Layer                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │GpuContext│  │  Render  │  │  Canvas  │    │
│  │          │  │ Pipeline │  │ Manager  │    │
│  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐                  │
│  │  Camera  │  │ Settings │                  │
│  │ Manager  │  │ Manager  │                  │
│  └──────────┘  └──────────┘                  │
└───────────────────────────────────────────────┘
        │
┌───────▼────────┐
│  Core/Types    │
│  (Domain-ish)  │
└────────────────┘

❌ Problems:
- Use cases depend on infrastructure (violates dependency rule)
- No clear domain layer
- Business logic mixed with infrastructure
- Hard to test (concrete dependencies)
```

## Proposed Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         index.ts                             │
│                      (Public API)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Application Layer                               │
│  ┌──────────────────────────────────────────────┐          │
│  │      CrtSubpixelProcessor                      │          │
│  │  (Application Service / Facade)                │          │
│  │  - Wires dependencies                           │          │
│  │  - Coordinates use cases                        │          │
│  └──────────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────────┐          │
│  │         dependencies.ts                       │          │
│  │  (Dependency Injection Container)              │          │
│  └──────────────────────────────────────────────┘          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ ✅ Depends on use cases
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Use Cases Layer                           │
│  ┌──────────────────┐        ┌──────────────────┐           │
│  │ ImageProcessor   │        │ CameraProcessor  │           │
│  │                  │        │                  │           │
│  │ ✅ Depends on    │        │ ✅ Depends on    │           │
│  │    domain        │        │    domain        │           │
│  │    interfaces    │        │    interfaces    │           │
│  └──────────────────┘        └──────────────────┘           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ ✅ Depends on domain
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      Domain Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Entities:                                           │   │
│  │  - Image                                             │   │
│  │  - Settings                                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Value Objects:                                       │   │
│  │  - Dimensions                                         │   │
│  │  - Orientation                                        │   │
│  │  - PixelDensity                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Services:                                            │   │
│  │  - SubpixelRenderer (pure business logic)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Repository Interfaces:                               │   │
│  │  - IGpuContext                                        │   │
│  │  - IRenderPipeline                                    │   │
│  │  - ICanvasManager                                     │   │
│  │  - ICameraManager                                     │   │
│  │  - ISettingsRepository                                │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ ✅ Infrastructure implements
                        │    domain interfaces
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Infrastructure Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  WebGPU Adapters:                                     │   │
│  │  - WebGpuContext (implements IGpuContext)            │   │
│  │  - WebGpuRenderPipeline (implements IRenderPipeline) │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Browser Adapters:                                    │   │
│  │  - WebCanvasManager (implements ICanvasManager)      │   │
│  │  - BrowserCameraManager (implements ICameraManager)  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Settings Adapter:                                    │   │
│  │  - GpuSettingsRepository (implements ISettingsRepo)  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

✅ Benefits:
- Dependencies point inward
- Use cases depend on abstractions
- Domain logic is independent
- Easy to test and swap implementations
```

## Dependency Flow

### Current (Incorrect)

```
Use Cases → Infrastructure (concrete) → Core/Types
   ❌ Violates dependency rule
```

### Proposed (Correct)

```
Application → Use Cases → Domain Interfaces
                              ↑
Infrastructure (implements) ──┘
   ✅ Follows dependency rule
```

## Layer Responsibilities

### Domain Layer

- **Entities**: Core business objects (Image, Settings)
- **Value Objects**: Immutable data (Dimensions, Orientation)
- **Services**: Pure business logic (SubpixelRenderer algorithm)
- **Interfaces**: Repository contracts (IGpuContext, etc.)

### Use Cases Layer

- **Orchestration**: Coordinates domain services and repositories
- **Input/Output**: DTOs for use case boundaries
- **Business Rules**: Application-specific logic

### Infrastructure Layer

- **Adapters**: Implement domain interfaces
- **External Systems**: WebGPU, Browser APIs, Canvas
- **Frameworks**: TypeGPU, Web APIs

### Application Layer

- **Facade**: Public API (CrtSubpixelProcessor)
- **Dependency Injection**: Wire dependencies
- **Configuration**: Application setup
