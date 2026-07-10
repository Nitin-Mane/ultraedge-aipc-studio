import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    leftIcon, 
    rightIcon, 
    fullWidth = false,
    disabled,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-button transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-aurora-base disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-edge-blue hover:bg-edge-cyan text-white shadow-glow-cyan focus:ring-edge-cyan',
      secondary: 'bg-qwen-purple hover:bg-qwen-violet text-white shadow-glow-purple focus:ring-qwen-violet',
      outline: 'border-2 border-edge-cyan text-edge-cyan hover:bg-edge-cyan/10 focus:ring-edge-cyan',
      ghost: 'text-text-secondary hover:text-text-primary hover:bg-aurora-surface-hover focus:ring-text-muted',
      danger: 'bg-status-error hover:bg-red-600 text-white focus:ring-status-error',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-7 py-3.5 text-lg gap-2.5',
      xl: 'px-10 py-4 text-xl gap-3',
    }

    const widthStyle = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className} hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span
            className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'