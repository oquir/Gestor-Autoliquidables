import type {
  CollisionDetection,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  DropAnimation,
  Modifier,
  SensorDescriptor,
  SensorOptions,
} from '@dnd-kit/core'
import type { ActiveDrag } from './activeDrag'

export interface DragAndDropReturn {
  sensors: SensorDescriptor<SensorOptions>[]
  activeDrag: ActiveDrag | null
  collisionDetection: CollisionDetection
  overlayModifiers: Modifier[]
  dropAnimation: DropAnimation | null | undefined
  handleDragStart: (event: DragStartEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void
}
