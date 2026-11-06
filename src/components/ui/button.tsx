import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonStyles = cva('ui-button', {
  variants: {
    variant: {
      primary: 'ui-button-primary',
      secondary: 'ui-button-secondary',
      outline: 'ui-button-outline',
      ghost: 'ui-button-ghost',
    },
    size: {
      default: 'ui-button-default',
      small: 'ui-button-small',
      icon: 'ui-button-icon',
    },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  ),
)

Button.displayName = 'Button'
