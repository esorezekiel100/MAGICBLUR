import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '../../lib/utils'

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>

export function Slider({ className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root className={cn('ui-slider', className)} {...props}>
      <SliderPrimitive.Track className="ui-slider-track">
        <SliderPrimitive.Range className="ui-slider-range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="ui-slider-thumb" />
    </SliderPrimitive.Root>
  )
}
