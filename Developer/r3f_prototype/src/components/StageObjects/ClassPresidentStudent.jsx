import StudioTunedGroup from '../StudioTunedGroup.jsx'
import { UnconsciousStudentVisual } from './UnconsciousStudent.jsx'

export const CLASS_PRESIDENT_UNIFORM_COLOR = 0xc23535

export default function ClassPresidentStudent({ variant = 'faceUp', ...props }) {
  return (
    <group {...props}>
      <StudioTunedGroup itemId="stage-object-class-president-student">
        <UnconsciousStudentVisual variant={variant} uniformColor={CLASS_PRESIDENT_UNIFORM_COLOR} />
      </StudioTunedGroup>
    </group>
  )
}
