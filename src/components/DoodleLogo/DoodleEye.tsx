'use client'

import { EyeProps } from '@/lib/doodle/types'
import DefaultEye from './themes/DefaultEye'
import LanternEye from './themes/LanternEye'
import GlobeEye from './themes/GlobeEye'
import HeartEye from './themes/HeartEye'
import MaskEye from './themes/MaskEye'
import OrbEye from './themes/OrbEye'
import PumpkinEye from './themes/PumpkinEye'
import FireworkEye from './themes/FireworkEye'

const eyeComponents: Record<string, React.ComponentType<EyeProps>> = {
  DefaultEye,
  LanternEye,
  GlobeEye,
  HeartEye,
  MaskEye,
  OrbEye,
  PumpkinEye,
  FireworkEye,
}

export default function DoodleEye(props: EyeProps) {
  const EyeComponent = eyeComponents[props.theme.eyeComponent] || DefaultEye
  return <EyeComponent {...props} />
}
